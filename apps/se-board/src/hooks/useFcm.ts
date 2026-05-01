import { getToken, onMessage } from "firebase/messaging";
import { useEffect } from "react";

import { deleteFcmToken, registerFcmToken } from "@/api/fcm";
import { isMaintainLogin } from "@/api/storage";
import { messaging } from "@/firebase";

const VAPID_KEY =
  "BFFYEnN0U5wVDKbnY_7by3laYurljwZe21yRsJ8vaM9IGW8yHYM_W3QYvQyrgr86MM5WBz46INGL8kZJbq7Pm4c";

const isFcmSupported = () =>
  "Notification" in window && "serviceWorker" in navigator;

export const useFcm = (isLoggedIn: boolean) => {
  useEffect(() => {
    if (!isLoggedIn || !VAPID_KEY) return;

    // "로그인 유지"가 아니면 기존 토큰 삭제 후 종료
    if (!isMaintainLogin()) {
      deleteFcmToken().catch(() => {});
      return;
    }

    // iOS Safari 등 FCM 미지원 환경 체크
    if (!isFcmSupported()) return;

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onMessage(messaging, (_payload) => {});
    } catch {
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission !== "granted") return;

      getToken(messaging, { vapidKey: VAPID_KEY })
        .then((token) => {
          if (token) {
            console.log("[FCM] 토큰:", token);
            registerFcmToken(token).catch(() => {});
          } else {
            console.warn("[FCM] 토큰 발급 실패");
          }
        })
        .catch((e) => console.error("[FCM] 에러:", e));
    });

    return () => unsubscribe?.();
  }, [isLoggedIn]);
};

export const useDeleteFcmToken = () => {
  return () => deleteFcmToken().catch(() => {});
};
