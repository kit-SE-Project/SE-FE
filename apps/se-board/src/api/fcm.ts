import { alarmAxios } from "./alarmAxiosInstance";

export const registerFcmToken = (token: string) =>
  alarmAxios({
    url: "/fcm/token",
    method: "POST",
    data: { token },
  });

export const deleteFcmToken = () =>
  alarmAxios({
    url: "/fcm/token",
    method: "DELETE",
  });
