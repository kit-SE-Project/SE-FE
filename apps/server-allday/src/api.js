export class ApiError extends Error {
  constructor(message, code, requestId, status) { super(message); this.code = code; this.requestId = requestId; this.status = status; }
}
const unauthenticated = () => new ApiError('다시 로그인하세요.', 'UNAUTHENTICATED', null, 401);
const sessionChanged = () => new ApiError('로그인 상태가 변경되었습니다.', 'SESSION_CHANGED', null, 401);
export const WEB_SESSION_KEY = 'server-allday.web-session.v1';
const newSessionId = () => globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function normalizeApiUrl(baseUrl) {
  let parsed;
  try { parsed = new URL(baseUrl.trim()); } catch { throw new Error('올바른 API 주소를 입력하세요.'); }
  if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('http:// 또는 https://로 시작하는 API 주소를 입력하세요.');
  return parsed.href.replace(/\/+$/, '');
}
function savedSession(value) {
  if (!value || value.version !== 1 || Object.keys(value).sort().join(',') !== 'baseUrl,refreshToken,sessionId,version'
    || typeof value.sessionId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(value.sessionId)
    || typeof value.refreshToken !== 'string' || !value.refreshToken.trim() || value.refreshToken.length > 16384) return null;
  try { return { version: 1, sessionId: value.sessionId, baseUrl: normalizeApiUrl(value.baseUrl), refreshToken: value.refreshToken }; }
  catch { return null; }
}
export function createWebSessionStore(storage) {
  const clear = expectedId => {
    try {
      if (expectedId && JSON.parse(storage.getItem(WEB_SESSION_KEY) || 'null')?.sessionId !== expectedId) return false;
      storage.removeItem(WEB_SESSION_KEY); return true;
    } catch { return false; }
  };
  return {
    clear,
    read() {
      try {
        const raw = storage.getItem(WEB_SESSION_KEY);
        if (!raw) return null;
        if (raw.length > 20000) { clear(); return null; }
        const value = savedSession(JSON.parse(raw));
        if (!value) clear();
        return value;
      } catch { clear(); return null; }
    },
    write(value, replace = false) {
      const record = savedSession(value);
      if (!record) return false;
      try {
        // A late refresh/logout from an old account must never replace the new one.
        if (!replace && this.read()?.sessionId !== record.sessionId) return false;
        storage.setItem(WEB_SESSION_KEY, JSON.stringify(record)); return true;
      } catch { clear(replace ? undefined : record.sessionId); return false; }
    },
  };
}
let browserSessionStore;
export function getWebSessionStore() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (!browserSessionStore) {
    let storage;
    try { storage = window.sessionStorage; } catch { storage = null; }
    browserSessionStore = createWebSessionStore(storage);
  }
  return browserSessionStore;
}
export function clearStoredBackendSession() { getWebSessionStore()?.clear(); }
async function readResponse(response) {
  const requestId = response.headers?.get?.('X-Request-Id');
  if (response.status === 204) return null;
  let data;
  try { data = await response.json(); }
  catch { if (response.ok) throw new ApiError('서버 응답 형식이 명세와 다릅니다.', 'INVALID_RESPONSE', requestId, response.status); }
  if (!response.ok) throw new ApiError(data?.message || `서버 요청을 처리하지 못했습니다. (HTTP ${response.status})`, data?.code || 'HTTP_ERROR', data?.requestId || requestId, response.status);
  return data;
}
async function fetchJson(url, options) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12000);
  const { credentials = 'omit', ...request } = options;
  try { return await readResponse(await fetch(url, { ...request, cache: 'no-store', credentials, signal: controller.signal })); }
  catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw new ApiError('서버 응답 시간이 초과되었습니다. 다시 시도하세요.', 'TIMEOUT');
    throw new ApiError('백엔드에 연결할 수 없습니다. API 주소와 서버 실행 상태, 네트워크 설정을 확인하세요.', 'NETWORK_ERROR');
  } finally { clearTimeout(timer); }
}
function tokenPair(value) {
  if (!value || typeof value.accessToken !== 'string' || !value.accessToken.trim() || typeof value.refreshToken !== 'string' || !value.refreshToken.trim()) throw new ApiError('인증 응답 형식이 명세와 다릅니다.', 'INVALID_RESPONSE');
  return {accessToken:value.accessToken,refreshToken:value.refreshToken};
}
export function validateLogin(username = '', password = '') {
  if (!username.trim() || !password) return '아이디와 비밀번호를 입력하세요.';
  if (username.trim().length > 254 || password.length > 256) return '아이디는 254자, 비밀번호는 256자 이내로 입력하세요.';
  return '';
}
export function createApi(baseUrl = 'http://127.0.0.1:18082', { sessionStore = null, initialSession = null, sso = false, onSessionExpired } = {}) {
  const base = normalizeApiUrl(baseUrl); const parsed = new URL(base);
  const tunnelHeaders = /\.ngrok(?:-free)?\.(?:app|dev)$/i.test(parsed.hostname) ? {'ngrok-skip-browser-warning':'true'} : {};
  const initial = initialSession && savedSession(initialSession);
  if (initialSession && (!initial || initial.baseUrl !== base)) throw new ApiError('저장된 로그인 정보가 올바르지 않습니다.', 'INVALID_SESSION');
  let pair = initial ? { accessToken: null, refreshToken: initial.refreshToken } : null;
  let generation = 0; let refreshing = null; let sessionId = initial?.sessionId || newSessionId();
  let persistent = !!initial; let rememberEnabled = !!initial; let ssoClosed = false;
  const persistPair = (replace = false) => {
    persistent = !!(pair && sessionStore?.write({ version: 1, sessionId, baseUrl: base, refreshToken: pair.refreshToken }, replace));
    if (!persistent) sessionStore?.clear(sessionId);
    return persistent;
  };
  const dispose = ({ preserveSaved = false } = {}) => {
    if (!preserveSaved) sessionStore?.clear(sessionId);
    generation++; pair = null; refreshing = null; persistent = false; rememberEnabled = false;
    if (sso) ssoClosed = true;
  };
  const check = current => { if (current !== generation) throw sessionChanged(); };
  async function refresh() {
    if (!pair) throw unauthenticated();
    if (refreshing) return refreshing;
    const current = generation; const refreshToken = pair.refreshToken;
    const pending = fetchJson(`${base}/refresh`, {method:'POST',headers:{...tunnelHeaders,'Content-Type':'application/json'},body:JSON.stringify({refreshToken})})
      .then(value => { check(current); pair = tokenPair(value); if (rememberEnabled) persistPair(); return pair; })
      .catch(error => {
        const denied = error.status === 404 && [106, 107].includes(error.code) ? unauthenticated() : error;
        if (current === generation && ([401,403].includes(denied.status) || denied.code === 'INVALID_RESPONSE')) dispose();
        throw denied;
      });
    refreshing = pending;
    try { await pending; } finally { if (refreshing === pending) refreshing = null; }
  }
  async function request(path, {method='GET',body,key} = {}) {
    if (sso) {
      if (ssoClosed) throw unauthenticated();
      const current = generation;
      try {
        const data = await fetchJson(base + path, {
          method,
          credentials: 'same-origin',
          headers: { ...tunnelHeaders, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(key ? { 'Idempotency-Key': key } : {}) },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
        check(current);
        return data;
      } catch (error) {
        if (current === generation && error.status === 401) {
          dispose();
          onSessionExpired?.();
        }
        throw error;
      }
    }
    if (!pair) throw unauthenticated();
    const current = generation; const usedAccessToken = pair.accessToken;
    const send = accessToken => fetchJson(`${base}${path}`, {
      method, headers:{...tunnelHeaders,Authorization:`Bearer ${accessToken}`,...(body !== undefined ? {'Content-Type':'application/json'} : {}),...(key ? {'Idempotency-Key':key} : {})},
      ...(body !== undefined ? {body:JSON.stringify(body)} : {}),
    });
    let data;
    try { data = await send(usedAccessToken); }
    catch (error) {
      check(current);
      if (error.status !== 401) throw error;
      // A late 401 may arrive after another request has already rotated the tokens.
      if (pair?.accessToken === usedAccessToken) await refresh();
      check(current); if (!pair) throw unauthenticated();
      try { data = await send(pair.accessToken); }
      catch (retryError) { check(current); if (retryError.status === 401) dispose(); throw retryError; }
    }
    check(current); return data;
  }
  return {
    dispose, request, refresh, baseUrl: base,
    rememberSession: () => { rememberEnabled = true; return persistPair(true); },
    isPersistent: () => persistent,
    async login(username, password, largeLogin = false) {
      if (sso) throw unauthenticated();
      const error = validateLogin(username,password); if (error) throw new Error(error);
      dispose(); sessionId = newSessionId(); const current = generation;
      const value = await fetchJson(`${base}/formLogin`, {method:'POST',headers:{...tunnelHeaders,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:username.trim(),password,largeLogin:String(largeLogin)}).toString()});
      check(current); pair = tokenPair(value);
      return request('/api/v1/me');
    },
    async logout() {
      if (sso) {
        await fetchJson(base + '/api/v1/sso/logout', { method: 'POST', credentials: 'same-origin', headers: tunnelHeaders });
        dispose();
        return null;
      }
      const old = pair; dispose(); if (!old) return null;
      return fetchJson(`${base}/logoutProc`, {method:'POST',headers:{...tunnelHeaders,Authorization:`Bearer ${old.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({refreshToken:old.refreshToken})});
    },
    me: () => request('/api/v1/me'), profile: () => request(sso ? '/api/v1/sso/profile' : '/mypage'), categories: () => request('/api/v1/categories'), servers: () => request('/api/v1/servers'),
    adminCategories: () => request('/api/v1/admin/categories'),
    createCategory: (body, key) => request('/api/v1/admin/categories', { method: 'POST', body, key }),
    editCategory: (id, body, key) => request('/api/v1/admin/categories/' + id, { method: 'PATCH', body, key }),
    deleteCategory: (id, expectedVersion, key) => request('/api/v1/admin/categories/' + id, { method: 'DELETE', body: { expectedVersion }, key }),
    createServer: (body,key) => request('/api/v1/admin/servers',{method:'POST',body,key}),
    editServer: (server,body) => request(`/api/v1/admin/servers/${server.id}`,{method:'PATCH',body:{...body,expectedVersion:server.version}}),
    deleteServer: (server,reason,key) => request(`/api/v1/admin/servers/${server.id}`,{method:'DELETE',body:{expectedVersion:server.version,reason},key}),
    rentals: (admin=false) => request(`/api/v1/${admin?'admin/':''}rentals?limit=100&offset=0`),
    systemEvents: (limit=100) => {
      if(!Number.isSafeInteger(limit)||limit<1||limit>200)return Promise.reject(new ApiError('시스템 로그 조회 건수는 1~200 사이의 정수여야 합니다.','INVALID_LIMIT',null,422));
      return request(`/api/v1/admin/events?limit=${limit}`);
    },
    detail: id => request(`/api/v1/rentals/${id}`), connection: id => request(`/api/v1/rentals/${id}/connection`), credential: id => request(`/api/v1/rentals/${id}/credential`),
    rentalEvents: id => request(`/api/v1/rentals/${id}/events`),
    availability: (id,from,to) => request(`/api/v1/servers/${id}/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    preview: body => request('/api/v1/rental-previews',{method:'POST',body}),
    reserve: (body,key) => request('/api/v1/rentals',{method:'POST',body,key}),
    prepareNow: (rental,reason,key) => request(`/api/v1/admin/rentals/${rental.id}/prepare-now`,{method:'POST',body:{expectedVersion:rental.version,serverId:rental.serverId,memberId:rental.memberId,reason},key}),
    startNow: (rental,reason,key) => request(`/api/v1/admin/rentals/${rental.id}/start-now`,{method:'POST',body:{expectedVersion:rental.version,serverId:rental.serverId,memberId:rental.memberId,reason},key}),
    finish: (rental,reason,key,action='return') => request(`/api/v1/${action==='force-return'?'admin/':''}rentals/${rental.id}/${action}`,{method:'POST',body:{expectedVersion:rental.version,reason},key}),
    maintenance: (server,status,reason) => request(`/api/v1/admin/servers/${server.id}/status`,{method:'PATCH',body:{expectedVersion:server.version,status,reason}}),
    resetCredential: (rental,reason,key) => request(`/api/v1/rentals/${rental.id}/credential-resets`,{method:'POST',body:{expectedVersion:rental.version,reason},key}),
  };
}
export const requestKey = () => `frontend-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function nicknameForMember(profile, memberId) {
  if (!Number.isSafeInteger(memberId) || memberId <= 0 || profile?.memberId !== memberId || typeof profile.nickname !== 'string') return '';
  return profile.nickname.trim();
}
export function actorFromProfile(profile) {
  if (!profile || !Number.isSafeInteger(profile.memberId) || profile.memberId <= 0) throw new ApiError('사용자 신원 응답이 명세와 다릅니다.', 'INVALID_IDENTITY');
  if (!['STUDENT','ADMIN'].includes(profile.role) || typeof profile.rentalEligible !== 'boolean' || !Array.isArray(profile.authorities) || profile.authorities.some(role=>typeof role!=='string')) throw new ApiError('사용자 권한 응답이 명세와 다릅니다.', 'INVALID_IDENTITY');
  return {...profile,role:profile.role==='ADMIN'?'ADMIN':'USER'};
}
export async function openBackendSession({url,username,password,sessionStore=getWebSessionStore()}) {
  const error = validateLogin(username,password); if (error) throw new Error(error);
  const client = createApi(url, { sessionStore });
  try {
    const actor = actorFromProfile(await client.login(username,password));
    const servers = await client.servers();
    const persistent = !!sessionStore && client.rememberSession();
    return {client,actor,servers,url:client.baseUrl,persistent,storageWarning:sessionStore && !persistent ? '브라우저 저장소를 사용할 수 없어 새로고침하면 다시 로그인해야 합니다.' : ''};
  } catch (error) { await client.logout().catch(()=>{}); client.dispose(); throw error; }
}
export async function restoreSsoSession({ origin = window.location.origin, onSessionExpired } = {}) {
  let active = false;
  const client = createApi(origin, { sso: true, onSessionExpired: () => { if (active) onSessionExpired?.(); } });
  try {
    const actor = actorFromProfile(await client.me());
    const servers = await client.servers();
    active = true;
    return { client, actor, servers, url: client.baseUrl };
  } catch (error) {
    client.dispose();
    if (error.status === 401) return null;
    throw error;
  }
}

const restoreFlights = new WeakMap();
export function restoreBackendSession({sessionStore=getWebSessionStore()} = {}) {
  if (!sessionStore) return Promise.resolve(null);
  if (restoreFlights.has(sessionStore)) return restoreFlights.get(sessionStore);
  const record = sessionStore.read();
  if (!record) return Promise.resolve(null);
  const pending = (async () => {
    const client = createApi(record.baseUrl, { sessionStore, initialSession: record });
    try {
      await client.refresh();
      const actor = actorFromProfile(await client.me());
      const servers = await client.servers();
      return {client,actor,servers,url:record.baseUrl,persistent:client.isPersistent(),storageWarning:client.isPersistent() ? '' : '로그인은 복원했지만 브라우저 저장소를 갱신하지 못했습니다.'};
    } catch (error) {
      const invalid = [401,403].includes(error.status) || ['INVALID_RESPONSE','INVALID_IDENTITY','INVALID_SESSION'].includes(error.code);
      client.dispose({ preserveSaved: !invalid });
      throw error;
    }
  })().finally(() => restoreFlights.delete(sessionStore));
  restoreFlights.set(sessionStore, pending);
  return pending;
}
