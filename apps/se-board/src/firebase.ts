import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDgGzCZz0nn13HbdFiUtlUep0EhwAa4byg",
  authDomain: "se-alarm.firebaseapp.com",
  projectId: "se-alarm",
  storageBucket: "se-alarm.firebasestorage.app",
  messagingSenderId: "235757886624",
  appId: "1:235757886624:web:ff68bd12c420f30e37fdc5",
};

const app = initializeApp(firebaseConfig);

// iOS Safari 등 미지원 환경에서 getMessaging() 에러 방지
export const messaging = await isSupported()
  .then((supported) => (supported ? getMessaging(app) : null))
  .catch(() => null);
