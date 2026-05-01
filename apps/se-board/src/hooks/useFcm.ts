import { getToken, onMessage } from "firebase/messaging";
import { useEffect } from "react";

import { deleteFcmToken, registerFcmToken } from "@/api/fcm";
import { isMaintainLogin } from "@/api/storage";
import { messaging } from "@/firebase";

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

export const useFcm = (isLoggedIn: boolean) => {
  useEffect(() => {
    if (!isLoggedIn || !VAPID_KEY) return;

    // "로그인 유지"가 아니면 기존 토큰 삭제 후 종료
    if (!isMaintainLogin()) {
      deleteFcmToken().catch(() => {});
      return;
    }

    // 포그라운드 FCM 수신 - SSE가 이미 처리하므로 OS 알림 표시 안 함
    const unsubscribe = onMessage(messaging, (_payload) => {});

    Notification.requestPermission().then((permission) => {
      if (permission !== "granted") return;

      // 앱 로드마다 getToken 호출 → 토큰 갱신 자동 처리
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

    return () => unsubscribe();
  }, [isLoggedIn]);
};

export const useDeleteFcmToken = () => {
  return () => deleteFcmToken().catch(() => {});
};
