import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import { getStoredAccessToken } from "./storage";

const alarmInstance: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_ALARM_ENDPOINT,
  timeout: 10000,
});

alarmInstance.interceptors.request.use((config: any) => {
  config.headers = {
    ...config.headers,
    "Content-Type": "application/json",
    Authorization: `Bearer ${getStoredAccessToken() ?? ""}`,
  };
  return config;
});

export const alarmAxios = async <T>(
  props: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  return alarmInstance(props);
};
