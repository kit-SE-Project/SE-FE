const REFRESH_TOKEN_KEY = "refresh_token";
const ACCESS_TOKEN_KEY = "access_token";

export const isMaintainLogin = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY) ? true : false;
};

export const removeBearerToken = (token: string) => {
  if (token.startsWith("Bearer ")) return token.substring(7);
  else return token;
};

export const getStoredRefreshToken = () => {
  if (isMaintainLogin()) return localStorage.getItem(REFRESH_TOKEN_KEY) ?? null;
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? null;
};

export const getStoredAccessToken = () => {
  if (isMaintainLogin()) return localStorage.getItem(ACCESS_TOKEN_KEY) ?? null;
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? null;
};

export const setStoredRefreshToken = (
  refreshToken: string,
  maintainLogin: boolean = false
) => {
  const token = removeBearerToken(refreshToken);
  if (maintainLogin) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
};

export const setStoredAccessToken = (
  accessToken: string,
  maintainLogin: boolean = false
) => {
  const token = removeBearerToken(accessToken);
  if (maintainLogin) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
};

export const clearSotredRefreshToken = () => {
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};
