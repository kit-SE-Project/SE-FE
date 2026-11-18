import { AxiosError } from "axios";

import { _axios, getJWTHeader } from "./axiosInstance";
import { fetchMenuList } from "./menu";
import { fetchUserSimpleInfo } from "./profile";
import { fetchRecruitList } from "./recruit";
import {
  AUTH_SESSION_CLEARED_EVENT,
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredAccessToken,
  setStoredRefreshToken,
} from "./storage";

const mockAdapter = jest.fn();
jest.mock("axios", () => {
  const actual = jest.requireActual("axios");
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual.default,
      create: () =>
        actual.default.create({
          adapter: (config: unknown) => mockAdapter(config),
        }),
    },
  };
});
function ok(config: any, data: unknown = {}) {
  return { config, data, status: 200, statusText: "OK", headers: {} };
}
function expired(config: any, code = 108): never {
  throw new AxiosError("expired", "ERR_BAD_REQUEST", config, undefined, {
    config,
    data: { code },
    status: 404,
    statusText: "Not Found",
    headers: {},
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  clearStoredAuthTokens();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
  setStoredAccessToken("test-old-access");
  setStoredRefreshToken("test-old-refresh");
});
afterEach(() => {
  clearStoredAuthTokens();
  jest.restoreAllMocks();
});

test("concurrent expiration shares one refresh and preserves the original request data", async () => {
  let release!: () => void;
  const refreshes: string[] = [];
  mockAdapter.mockImplementation(async (config) => {
    if (config.url === "refresh") {
      refreshes.push(config.url);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return ok(config, {
        accessToken: "test-new-access",
        refreshToken: "test-new-refresh",
      });
    }
    if (config.headers.Authorization === "Bearer test-old-access")
      return expired(config);
    return ok(config, config.data);
  });
  const data = { title: "재시도 검사" };
  const first = _axios({
    url: "first",
    method: "POST",
    data,
    headers: getJWTHeader(),
  });
  const second = _axios({ url: "second", headers: getJWTHeader() });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(refreshes).toHaveLength(1);
  release();
  const [result] = await Promise.all([first, second]);
  expect(refreshes).toHaveLength(1);
  expect(result.data).toEqual(data);
});

test("an old expiration response arriving after rotation reuses the current access token", async () => {
  let releaseLate!: () => void;
  let refreshes = 0;
  mockAdapter.mockImplementation(async (config) => {
    if (config.url === "refresh") {
      refreshes++;
      return ok(config, {
        accessToken: "test-new-access",
        refreshToken: "test-new-refresh",
      });
    }
    if (config.headers.Authorization === "Bearer test-old-access") {
      if (config.url === "late")
        await new Promise<void>((resolve) => {
          releaseLate = resolve;
        });
      return expired(config);
    }
    return ok(config);
  });
  const late = _axios({ url: "late", headers: getJWTHeader() });
  await _axios({ url: "first", headers: getJWTHeader() });
  expect(refreshes).toBe(1);
  releaseLate();
  await late;
  expect(refreshes).toBe(1);
  expect(getStoredAccessToken()).toBe("test-new-access");
});

test("expired refresh clears credentials and sends regular requests to login", async () => {
  const original = Object.getOwnPropertyDescriptor(window, "location")!;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "/board" },
  });
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  mockAdapter.mockImplementation(async (config) =>
    expired(config, config.url === "refresh" ? 107 : 108)
  );
  try {
    await expect(
      _axios({ url: "board", headers: getJWTHeader() })
    ).rejects.toEqual({ code: 107 });
    expect(window.location.href).toBe("/login");
    expect(getStoredAccessToken()).toBeNull();
  } finally {
    Object.defineProperty(window, "location", original);
    alert.mockRestore();
  }
});

test("optional profile restoration with an expired access token and no refresh stays on the public page", async () => {
  sessionStorage.removeItem("refresh_token");
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  const cleared = jest.fn();
  window.addEventListener(AUTH_SESSION_CLEARED_EVENT, cleared);
  const before = window.location.href;
  mockAdapter.mockImplementation(async (config) => expired(config));
  try {
    await expect(
      _axios({ url: "mypage", headers: getJWTHeader(), authMode: "optional" })
    ).rejects.toEqual({ code: 107 });
    expect(alert).not.toHaveBeenCalled();
    expect(window.location.href).toBe(before);
    expect(getStoredAccessToken()).toBeNull();
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(mockAdapter).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, cleared);
  }
});

test("public menus recover anonymously after expired refresh without losing the original request", async () => {
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  const menus = [{ name: "공지사항" }, { name: "서버대여" }];
  mockAdapter.mockImplementation(async (config) => {
    if (config.url === "refresh") return expired(config, 107);
    if (config.headers.get("Authorization")) return expired(config);
    return ok(config, menus);
  });
  const result = await _axios({
    url: "/menu",
    params: { language: "ko" },
    headers: getJWTHeader(),
    authMode: "public",
  });
  expect(result.data).toEqual(menus);
  expect(result.config.params).toEqual({ language: "ko" });
  expect(result.config.headers.Authorization).toBeUndefined();
  expect(alert).not.toHaveBeenCalled();
  expect(getStoredAccessToken()).toBeNull();
  expect(getStoredRefreshToken()).toBeNull();
  expect(mockAdapter).toHaveBeenCalledTimes(3);
});

test("anonymous public auth failures stop after one guest retry without a login popup", async () => {
  clearStoredAuthTokens();
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  mockAdapter.mockImplementation(async (config) => expired(config, 102));
  await expect(_axios({ url: "/menu", authMode: "public" })).rejects.toEqual({
    code: 102,
  });
  expect(mockAdapter).toHaveBeenCalledTimes(2);
  expect(alert).not.toHaveBeenCalled();
});

test("simultaneous main-page menu, recruitment and profile restoration failures stay on the public page", async () => {
  sessionStorage.removeItem("refresh_token");
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  const before = window.location.href;
  mockAdapter.mockImplementation(async (config) => {
    if (config.headers.get("Authorization")) return expired(config);
    return ok(config, []);
  });
  const results = await Promise.allSettled([
    fetchUserSimpleInfo(true), fetchMenuList(), fetchRecruitList({ page: 0 }),
  ]);
  expect(results.map(result => result.status)).toEqual(["rejected", "fulfilled", "fulfilled"]);
  expect(alert).not.toHaveBeenCalled();
  expect(window.location.href).toBe(before);
  expect(getStoredAccessToken()).toBeNull();
});

test("temporary refresh service failures keep the session and do not retry as a guest", async () => {
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  mockAdapter.mockImplementation(async (config) =>
    config.url === "refresh" ? expired(config, 503) : expired(config)
  );
  await expect(
    _axios({ url: "/menu", headers: getJWTHeader(), authMode: "public" })
  ).rejects.toEqual({ code: 503 });
  expect(getStoredAccessToken()).toBe("test-old-access");
  expect(getStoredRefreshToken()).toBe("test-old-refresh");
  expect(alert).not.toHaveBeenCalled();
  expect(mockAdapter).toHaveBeenCalledTimes(2);
});

test("permission denial is never retried anonymously", async () => {
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  mockAdapter.mockImplementation(async (config) => expired(config, 103));
  await expect(
    _axios({ url: "/menu", headers: getJWTHeader(), authMode: "public" })
  ).rejects.toEqual({ code: 103 });
  expect(mockAdapter).toHaveBeenCalledTimes(1);
  expect(getStoredAccessToken()).toBe("test-old-access");
  expect(alert).not.toHaveBeenCalled();
});

test("a protected write still requires login and never retries anonymously", async () => {
  const original = Object.getOwnPropertyDescriptor(window, "location")!;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "/posts/write" },
  });
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  mockAdapter.mockImplementation(async (config) => expired(config, 102));
  try {
    await expect(
      _axios({
        url: "/posts",
        method: "POST",
        data: { title: "protected" },
        headers: getJWTHeader(),
      })
    ).rejects.toEqual({ code: 102 });
    expect(alert).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe("/login");
    expect(mockAdapter).toHaveBeenCalledTimes(1);
  } finally {
    Object.defineProperty(window, "location", original);
  }
});
