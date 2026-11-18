import axios, {
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

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
  baseURL: process.env.REACT_APP_API_ENDPOINT || "https://seboard.site/v1",
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
  // Public reads may retry anonymously; optional session restoration must not navigate.
  authMode?: "required" | "optional" | "public";
  guestRetried?: boolean;
};

export const isSessionAuthError = (error: unknown) =>
  [102, 106, 107, 108].includes((error as { code?: number })?.code ?? -1);

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
  })
    .then(({ data }) => {
      if (getStoredRefreshToken() !== current)
        throw new Error("로그인 상태가 변경되었습니다.");
      setStoredRefreshToken(data.refreshToken, maintain);
      setStoredAccessToken(data.accessToken, maintain);
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function redirectForAuthError(code: number | undefined) {
  if (code === 102 || code === 107) {
    clearStoredAuthTokens();
    alert("로그인이 필요합니다");
    window.location.href = "/login";
  } else if (code === 103) {
    alert("접근 권한이 없습니다.");
    window.location.href = "/";
  }
}

function handleAuthFailure(
  request: BoardRequestConfig | undefined,
  failure: any
) {
  if (request?.authMode === "public" || request?.authMode === "optional") {
    if (isSessionAuthError(failure)) {
      clearStoredAuthTokens();
      if (
        request.authMode === "public" &&
        !request.guestRetried &&
        (!request.method || request.method.toUpperCase() === "GET")
      ) {
        const headers = AxiosHeaders.concat(request.headers as AxiosHeaders);
        headers.delete("Authorization");
        return instance({
          ...request,
          headers,
          guestRetried: true,
          authRetried: true,
        } as BoardRequestConfig);
      }
    }
  } else if (!request?.preserveAuthRoute) {
    redirectForAuthError(failure.code);
  }
  return Promise.reject(failure);
}

instance.interceptors.response.use(
  (res) => {
    if (
      process.env.NODE_ENV !== "production" &&
      !(res.config as BoardRequestConfig).preserveAuthRoute
    ) {
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
    if (
      failure.code === 108 &&
      request &&
      request.url !== "refresh" &&
      !request.authRetried
    ) {
      try {
        const headers = request.headers;
        const sent =
          typeof headers?.get === "function"
            ? headers.get("Authorization")
            : headers?.Authorization;
        const current = getJWTHeader().Authorization;
        if (!current || current === sent) await refreshStoredAccessToken();
      } catch (refreshError) {
        const refreshCode = (refreshError as { code?: number })?.code;
        return handleAuthFailure(
          request,
          refreshCode === 106
            ? { ...(refreshError as object), code: 107 }
            : refreshError
        );
      }
      return instance({
        ...request,
        authRetried: true,
        headers: { ...request.headers, ...getJWTHeader() },
      } as BoardRequestConfig);
    }

    return handleAuthFailure(request, failure);
  }
);

export const _axios = <T>(
  props: BoardRequestConfig
): Promise<AxiosResponse<T>> => instance(props);
