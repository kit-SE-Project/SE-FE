// TODO: 아래 값을 Firebase Console > 프로젝트 설정 > 일반 > 내 앱 의 firebaseConfig로 교체
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDgGzCZz0nn13HbdFiUtlUep0EhwAa4byg",
  authDomain: "se-alarm.firebaseapp.com",
  projectId: "se-alarm",
  storageBucket: "se-alarm.firebasestorage.app",
  messagingSenderId: "235757886624",
  appId: "1:235757886624:web:ff68bd12c420f30e37fdc5",
});

const messaging = firebase.messaging();

// 백그라운드 메시지 수신
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "새 알림";
  const body = payload.notification?.body ?? "";
  const url = payload.data?.url ?? "/";

  return self.registration.showNotification(title, {
    body,
    icon: "/logo192.png",
    data: { url },
  });
});

// 알림 클릭 시 해당 URL로 이동
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 탭이 있으면 포커스
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // 없으면 새 탭 열기
        return clients.openWindow(url);
      })
  );
});
