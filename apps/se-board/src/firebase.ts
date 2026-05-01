import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDgGzCZz0nn13HbdFiUtlUep0EhwAa4byg",
  authDomain: "se-alarm.firebaseapp.com",
  projectId: "se-alarm",
  storageBucket: "se-alarm.firebasestorage.app",
  messagingSenderId: "235757886624",
  appId: "1:235757886624:web:ff68bd12c420f30e37fdc5",
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
