const browserVisibility = {
  isVisible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  subscribe(listener) {
    if (typeof document === 'undefined') return () => {};
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  },
};

function createVisiblePoller({ task, onValue = () => {}, onError = () => {}, delay = 15000,
  visibility = browserVisibility, schedule = setTimeout, cancel = clearTimeout }) {
  let stopped = false; let pending = null; let timer = null; let failures = 0;
  const clear = () => { if (timer !== null) cancel(timer); timer = null; };
  const refresh = () => {
    if (stopped || !visibility.isVisible()) return Promise.resolve();
    if (pending) return pending;
    clear();
    pending = Promise.resolve().then(task).then(value => {
      if (stopped) return;
      failures = 0; onValue(value);
      return value;
    }).catch(error => {
      if (!stopped) { failures++; onError(error); }
    }).then(value => {
      if (!stopped && visibility.isVisible()) {
        const base = typeof delay === 'function' ? delay(value) : delay;
        timer = schedule(() => { timer = null; refresh(); }, Math.min(base * 2 ** Math.min(failures, 4), 60000));
      }
      return value;
    }).finally(() => { pending = null; });
    return pending;
  };
  const unsubscribe = visibility.subscribe(() => { clear(); if (visibility.isVisible()) refresh(); });
  return { refresh, stop() { stopped = true; clear(); unsubscribe(); } };
}

function mergeVersionedUpdate(previous, incoming) {
  if (!previous) return incoming;
  if (Number.isSafeInteger(previous.version) && Number.isSafeInteger(incoming.version)
    && previous.version > incoming.version) return previous;
  return { ...previous, ...incoming };
}

module.exports = { browserVisibility, createVisiblePoller, mergeRentalUpdate: mergeVersionedUpdate, mergeVersionedUpdate };
