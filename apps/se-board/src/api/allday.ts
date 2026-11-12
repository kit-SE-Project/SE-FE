import { _axios, getJWTHeader, refreshStoredAccessToken } from "./axiosInstance";

const pendingKey = "seboard.allday.sso";
const identifier = /^[A-Za-z0-9_-]{43}$/;
const portalPath = "/allday/sso";

type PendingLogin = { state: string; codeChallenge: string; expiresAt: number };

function rentalOrigin() {
  const configured = process.env.REACT_APP_ALLDAY_ORIGIN;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    const secure = url.protocol === "https:";
    const local = url.protocol === "http:" && url.hostname === "127.0.0.1";
    return (secure || local) &&
      url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password
      ? url.origin : null;
  } catch {
    return null;
  }
}

const origin = rentalOrigin();
export const allDayStartUrl = origin ? origin + "/api/v1/sso/start" : null;

export function readPendingAllDayLogin(): PendingLogin | null {
  try {
    const login = JSON.parse(sessionStorage.getItem(pendingKey) || "null");
    if (login && typeof login.state === "string" && identifier.test(login.state) &&
        typeof login.codeChallenge === "string" && identifier.test(login.codeChallenge) &&
        Number.isFinite(login.expiresAt) && login.expiresAt > Date.now()) return login;
    sessionStorage.removeItem(pendingKey);
  } catch {
    // A disabled browser store cannot resume a cross-page login.
  }
  return null;
}

export function pendingAllDayLoginPath(): string | null {
  return origin && readPendingAllDayLogin() ? portalPath : null;
}

export function allDayLoginFromBrowser(): PendingLogin | null {
  if (!origin) return null;
  if (!window.location.hash) return readPendingAllDayLogin();

  const params = new URLSearchParams(window.location.hash.slice(1));
  const state = params.get("state") || "";
  const codeChallenge = params.get("code_challenge") || "";
  window.history.replaceState(window.history.state, "", portalPath);
  if (!identifier.test(state) || !identifier.test(codeChallenge)) return null;

  const login = { state, codeChallenge, expiresAt: Date.now() + 5 * 60 * 1000 };
  sessionStorage.setItem(pendingKey, JSON.stringify(login));
  return login;
}

export async function authorizeAllDay(login: PendingLogin): Promise<string> {
  if (!getJWTHeader().Authorization) await refreshStoredAccessToken();
  const { data } = await _axios<{ callbackUrl: string }>({
    url: "allday/sso/authorize",
    method: "POST",
    data: { state: login.state, codeChallenge: login.codeChallenge },
    headers: getJWTHeader(),
    preserveAuthRoute: true,
  });
  const destination = new URL(data.callbackUrl);
  const codes = destination.searchParams.getAll("code");
  const states = destination.searchParams.getAll("state");
  if (destination.origin !== origin || destination.pathname !== "/api/v1/sso/callback" ||
      destination.username || destination.password || destination.hash ||
      Array.from(destination.searchParams.keys()).length !== 2 ||
      codes.length !== 1 || !identifier.test(codes[0]) || states.length !== 1 || states[0] !== login.state) {
    throw new Error("Invalid AllDay callback");
  }
  sessionStorage.removeItem(pendingKey);
  return destination.href;
}
