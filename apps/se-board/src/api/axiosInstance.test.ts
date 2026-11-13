import { AxiosError } from "axios";

import { _axios, getJWTHeader } from "./axiosInstance";
import { clearStoredAuthTokens, getStoredAccessToken, setStoredAccessToken, setStoredRefreshToken } from "./storage";

const mockAdapter = jest.fn();
jest.mock("axios", () => {
  const actual = jest.requireActual("axios");
  return { ...actual, __esModule: true, default: { ...actual.default,
    create: () => actual.default.create({ adapter: (config: unknown) => mockAdapter(config) }),
  } };
});
function ok(config: any, data: unknown = {}) { return { config, data, status: 200, statusText: "OK", headers: {} }; }
function expired(config: any, code = 108): never {
  throw new AxiosError("expired", "ERR_BAD_REQUEST", config, undefined, { config, data: { code }, status: 404, statusText: "Not Found", headers: {} });
}
beforeEach(() => {
  jest.clearAllMocks(); clearStoredAuthTokens();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
  setStoredAccessToken("test-old-access"); setStoredRefreshToken("test-old-refresh");
});
afterEach(() => { clearStoredAuthTokens(); jest.restoreAllMocks(); });

test("concurrent expiration shares one refresh and preserves the original request data", async () => {
  let release!: () => void;
  const refreshes: string[] = [];
  mockAdapter.mockImplementation(async config => {
    if (config.url === "refresh") {
      refreshes.push(config.url); await new Promise<void>(resolve => { release = resolve; });
      return ok(config, { accessToken: "test-new-access", refreshToken: "test-new-refresh" });
    }
    if (config.headers.Authorization === "Bearer test-old-access") return expired(config);
    return ok(config, config.data);
  });
  const data = { title: "재시도 검사" };
  const first = _axios({ url: "first", method: "POST", data, headers: getJWTHeader() });
  const second = _axios({ url: "second", headers: getJWTHeader() });
  await new Promise(resolve => setTimeout(resolve, 0)); expect(refreshes).toHaveLength(1); release();
  const [result] = await Promise.all([first, second]);
  expect(refreshes).toHaveLength(1); expect(result.data).toEqual(data);
});

test("an old expiration response arriving after rotation reuses the current access token", async () => {
  let releaseLate!: () => void; let refreshes = 0;
  mockAdapter.mockImplementation(async config => {
    if (config.url === "refresh") { refreshes++; return ok(config, { accessToken: "test-new-access", refreshToken: "test-new-refresh" }); }
    if (config.headers.Authorization === "Bearer test-old-access") {
      if (config.url === "late") await new Promise<void>(resolve => { releaseLate = resolve; });
      return expired(config);
    }
    return ok(config);
  });
  const late = _axios({ url: "late", headers: getJWTHeader() });
  await _axios({ url: "first", headers: getJWTHeader() }); expect(refreshes).toBe(1);
  releaseLate(); await late; expect(refreshes).toBe(1); expect(getStoredAccessToken()).toBe("test-new-access");
});

test("expired refresh clears credentials and sends regular requests to login", async () => {
  const original = Object.getOwnPropertyDescriptor(window, "location")!;
  Object.defineProperty(window, "location", { configurable: true, value: { href: "/board" } });
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  mockAdapter.mockImplementation(async config => expired(config, config.url === "refresh" ? 107 : 108));
  try {
    await expect(_axios({ url: "board", headers: getJWTHeader() })).rejects.toEqual({ code: 107 });
    expect(window.location.href).toBe("/login"); expect(getStoredAccessToken()).toBeNull();
  } finally { Object.defineProperty(window, "location", original); alert.mockRestore(); }
});
