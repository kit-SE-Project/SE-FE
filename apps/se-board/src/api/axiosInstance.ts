import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import {
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  isMaintainLogin,
  setStoredAccessToken,
  setStoredRefreshToken,
} from "./storage";

export const getJWTHeader = () => {
  const accessToken = getStoredAccessToken();
  return { Authorization: accessToken ? `Bearer ${accessToken}` : "" };
};

const instance: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_ENDPOINT,
  timeout: 10000,
});

instance.interceptors.request.use(
  (config: any) => ({
    headers: {
      "Content-Type": "application/json",
    },
    ...config,
  }),
  (error) => {
    alert(error.message);
    return Promise.reject(error);
  }
);

type BoardRequestConfig = AxiosRequestConfig & {
  preserveAuthRoute?: boolean;
  authRetried?: boolean;
};

let refreshInFlight: Promise<void> | null = null;

export function refreshStoredAccessToken(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  const current = getStoredRefreshToken();
  if (!current) return Promise.reject({ code: 107 });

  const maintain = isMaintainLogin();
  refreshInFlight = _axios<{ accessToken: string; refreshToken: string }>({
    url: "refresh",
    method: "POST",
    data: { refreshToken: current },
    preserveAuthRoute: true,
  }).then(({ data }) => {
    if (getStoredRefreshToken() !== current) throw new Error("로그인 상태가 변경되었습니다.");
    setStoredRefreshToken(data.refreshToken, maintain);
    setStoredAccessToken(data.accessToken, maintain);
  }).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function redirectForAuthError(code: number | undefined) {
  if (code === 102 || code === 107) {
    if (code !== 102) clearStoredAuthTokens();
    alert("로그인이 필요합니다");
    window.location.href = "/login";
  } else if (code === 103) {
    alert("접근 권한이 없습니다.");
    window.location.href = "/";
  }
}

instance.interceptors.response.use(
  (res) => {
    if (process.env.NODE_ENV !== "production" && !(res.config as BoardRequestConfig).preserveAuthRoute) {
      console.log(res);
    }
    return res;
  },
  async (error) => {
    const request = error.config as BoardRequestConfig | undefined;
    if (process.env.NODE_ENV !== "production" && !request?.preserveAuthRoute) {
      console.error(error);
    }
    const failure = error.response?.data ?? error;
    if (failure.code === 108 && request && request.url !== "refresh" && !request.authRetried) {
      try {
        await refreshStoredAccessToken();
      } catch (refreshError) {
        const refreshCode = (refreshError as { code?: number })?.code;
        if (!request.preserveAuthRoute) redirectForAuthError(refreshCode === 106 ? 107 : refreshCode);
        throw refreshError;
      }
      return instance({
        ...request,
        authRetried: true,
        headers: { ...request.headers, ...getJWTHeader() },
      } as BoardRequestConfig);
    }

    if (!request?.preserveAuthRoute) redirectForAuthError(failure.code);
    throw failure;
  }
);

export const _axios = <T>(
  props: BoardRequestConfig
): Promise<AxiosResponse<T>> => instance(props);
