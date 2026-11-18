const { browserVisibility, createVisiblePoller } = require('./polling.cjs');

function connectionPolicy(rental, server) {
  if (rental.status === 'RETURNING') return { allowed: false, reason: '반납 처리 중으로 접속 정보를 표시하지 않습니다.' };
  if (['RETURNED', 'CANCELLED'].includes(rental.status)) return { allowed: false, reason: '종료된 대여의 접속 정보는 표시되지 않습니다.' };
  if (server?.status === 'MAINTENANCE') return { allowed: false, reason: '서버 점검 중입니다. 점검 해제 후 이용 시간과 접속 가능 여부를 다시 확인합니다.' };
  if (!server || server.id !== rental.serverId || server.status !== 'AVAILABLE') return { allowed: false, reason: '서버 상태를 확인할 수 없어 접속 정보를 표시하지 않습니다.' };
  if (!['READY', 'ACTIVE'].includes(rental.status)) return { allowed: false, reason: '이용 시간과 VM 준비 상태를 확인한 후 접속 정보가 표시됩니다.' };
  return { allowed: true, reason: '' };
}

function connectionScope(rental, server) {
  return [rental.id, rental.serverId, rental.status, rental.version, rental.desiredRevision,
    server?.id, server?.status, server?.version].join(':');
}

function sshHostKeyRemovalCommand(connection) {
  // OpenSSH stores HostKeyAlias verbatim, independent of the shared host/port.
  const alias = /(?:^|\s)-o\s+HostKeyAlias=([A-Za-z0-9._-]+)(?=\s|$)/.exec(connection?.sshCommand || '')?.[1];
  if (alias) return `ssh-keygen -R "${alias}"`;
  if (!/^[A-Za-z0-9.-]+$/.test(connection?.host || '') || !Number.isInteger(connection?.port) || connection.port < 1 || connection.port > 65535) return '';
  return `ssh-keygen -R "[${connection.host}]:${connection.port}"`;
}

function createConnectionWatcher({ api, rentalId, onConnection, onPassword, onLoadingPassword, onError,
  visibility = browserVisibility, schedule, cancel }) {
  let stopped = false; let connection = null; let epoch = 0; let revealing = false;
  const forgetPassword = () => { epoch++; revealing = false; onPassword(null); onLoadingPassword(false); };
  const rejectAccess = error => {
    connection = null; forgetPassword(); onConnection(null); onError(error);
  };
  const poller = createVisiblePoller({ task: () => api.connection(rentalId), delay: 15000, visibility, schedule, cancel,
    onValue: value => {
      if (!visibility.isVisible()) { connection = null; forgetPassword(); onConnection(null); return; }
      if (!value || typeof value.available !== 'boolean') throw new Error('접속 가능 여부를 확인하지 못했습니다.');
      if (!value.available || ['host', 'port', 'username'].some(key => value[key] !== connection?.[key])) forgetPassword();
      connection = value; onError(null); onConnection(value);
    }, onError: rejectAccess,
  });
  const unsubscribe = visibility.subscribe(() => {
    if (!visibility.isVisible()) { connection = null; forgetPassword(); onConnection(null); }
  });
  return {
    refresh: poller.refresh,
    hidePassword: forgetPassword,
    async revealPassword() {
      if (stopped || revealing || !connection?.available || !visibility.isVisible()) return;
      const current = ++epoch; revealing = true; onLoadingPassword(true); onError(null);
      try {
        const value = await api.credential(rentalId);
        if (stopped || current !== epoch || !connection?.available || !visibility.isVisible()) return;
        if (typeof value?.password !== 'string' || !value.password) throw new Error('비밀번호 응답을 확인하지 못했습니다.');
        onPassword(value.password);
      } catch (error) {
        if (!stopped && current === epoch) rejectAccess(error);
      } finally {
        if (!stopped && current === epoch) { revealing = false; onLoadingPassword(false); }
      }
    },
    stop() { stopped = true; epoch++; connection = null; poller.stop(); unsubscribe(); },
  };
}

module.exports = { connectionPolicy, connectionScope, sshHostKeyRemovalCommand, createConnectionWatcher };
