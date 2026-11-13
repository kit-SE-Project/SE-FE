import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import { reissueToken } from "./auth";
import {
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

// ── refresh token race condition 방지 ──────────────────────────────────────
// 동시에 여러 요청이 108을 받아도 refresh는 한 번만 호출하고,
// 나머지 요청은 큐에 쌓아 새 토큰 발급 후 일괄 재시도한다.
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const flushQueue = (err: unknown, newToken: string | null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    err ? reject(err) : resolve(newToken!)
  );
  failedQueue = [];
};
// ───────────────────────────────────────────────────────────────────────────

instance.interceptors.response.use(
  (res) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(res);
    }
    return res;
  },
  async (error) => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }

    const code = error.response?.data?.code;

    if (code === 102) {
      alert("로그인이 필요합니다");
      window.location.href = "/login";
    } else if (code === 103) {
      alert("접근 권한이 없습니다.");
      window.location.href = "/";
    } else if (code === 107) {
      sessionStorage.removeItem("refresh_token");
      localStorage.removeItem("refresh_token");
      alert("로그인이 필요합니다");
      window.location.href = "/login";
    } else if (code === 108) {
      const originalRequest = error.config;

      // 이미 refresh 중이면 큐에 쌓고 대기
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return instance(originalRequest);
        });
      }

      isRefreshing = true;

      return new Promise((resolve, reject) => {
        reissueToken(getStoredRefreshToken()!)
          .then(({ data: { accessToken, refreshToken } }) => {
            const maintain = isMaintainLogin();
            if (maintain) {
              setStoredRefreshToken(refreshToken, true);
              setStoredAccessToken(accessToken, true);
            } else {
              setStoredRefreshToken(refreshToken);
              setStoredAccessToken(accessToken);
            }

            flushQueue(null, accessToken);

            originalRequest.headers = {
              ...originalRequest.headers,
              ...getJWTHeader(),
            };
            resolve(instance(originalRequest));
          })
          .catch((err) => {
            flushQueue(err, null);
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error.response?.data ?? error);
  }
);

export const _axios = async <T>(
  props: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  const result = await instance(props);
  return result;
};
