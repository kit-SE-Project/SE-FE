/** @jest-environment node */
import { _axios, getJWTHeader, refreshStoredAccessToken } from "./axiosInstance";

jest.mock("./axiosInstance", () => ({
  _axios: jest.fn(),
  getJWTHeader: jest.fn(() => ({ Authorization: "Bearer board-test-token" })),
  refreshStoredAccessToken: jest.fn(),
}));

const state = "s".repeat(43);
const challenge = "p".repeat(43);
const code = "c".repeat(43);
const origin = "https://rental.example";
const stored = new Map<string, string>();
let browserUrl = new URL("https://board.example/allday/sso");
beforeAll(() => {
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key), clear: () => stored.clear(),
  } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    get location() { return browserUrl; },
    history: { state: null, replaceState: (_state: unknown, _title: string, url: string) => { browserUrl = new URL(url, browserUrl); } },
  } });
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "sessionStorage");
});

function loadApi(): typeof import("./allday") {
  let api!: typeof import("./allday");
  jest.isolateModules(() => {
    jest.doMock("./axiosInstance", () => ({ _axios, getJWTHeader, refreshStoredAccessToken }));
    api = require("./allday");
  });
  return api;
}

beforeEach(() => {
  process.env.REACT_APP_ALLDAY_ORIGIN = origin;
  sessionStorage.clear();
  window.history.replaceState(null, "", "/allday/sso#state=" + state + "&code_challenge=" + challenge);
  jest.clearAllMocks();
  (getJWTHeader as jest.Mock).mockReturnValue({ Authorization: "Bearer board-test-token" });
});

afterEach(() => {
  delete process.env.REACT_APP_ALLDAY_ORIGIN;
});

test("resumes through SE login and redirects with only the code and state", async () => {
  const api = loadApi();
  const pending = api.allDayLoginFromBrowser()!;
  expect(window.location.hash).toBe("");
  expect(api.pendingAllDayLoginPath()).toBe("/allday/sso");
  expect(api.allDayStartUrl).toBe(origin + "/api/v1/sso/start");
  expect(api.allDayWebUrl).toBe(origin + "/allday/");
  const callbackUrl = origin + "/api/v1/sso/callback?code=" + code + "&state=" + state;
  (_axios as jest.Mock).mockResolvedValue({ data: { callbackUrl } });

  expect(await api.authorizeAllDay(pending)).toBe(callbackUrl);
  expect(_axios).toHaveBeenCalledWith({
    url: "allday/sso/authorize",
    method: "POST",
    data: { state, codeChallenge: challenge },
    headers: { Authorization: "Bearer board-test-token" },
    preserveAuthRoute: true,
  });
  expect(api.pendingAllDayLoginPath()).toBeNull();
});

test("rejects a different callback origin, path, or state", async () => {
  const api = loadApi();
  const pending = api.allDayLoginFromBrowser()!;
  for (const callbackUrl of [
    "https://elsewhere.example/api/v1/sso/callback?code=" + code + "&state=" + state,
    origin + "/another-path?code=" + code + "&state=" + state,
    origin + "/api/v1/sso/callback?code=" + code + "&state=" + "x".repeat(43),
  ]) {
    (_axios as jest.Mock).mockResolvedValue({ data: { callbackUrl } });
    await expect(api.authorizeAllDay(pending)).rejects.toThrow("Invalid AllDay callback");
  }
});

test("refreshes the existing Board login before authorizing when access is missing", async () => {
  const api = loadApi();
  const pending = api.allDayLoginFromBrowser()!;
  (getJWTHeader as jest.Mock).mockReturnValueOnce({ Authorization: "" })
    .mockReturnValueOnce({ Authorization: "Bearer refreshed-board-token" });
  (refreshStoredAccessToken as jest.Mock).mockResolvedValueOnce(undefined);
  const callbackUrl = origin + "/api/v1/sso/callback?code=" + code + "&state=" + state;
  (_axios as jest.Mock).mockResolvedValueOnce({ data: { callbackUrl } });

  expect(await api.authorizeAllDay(pending)).toBe(callbackUrl);
  expect(refreshStoredAccessToken).toHaveBeenCalledTimes(1);
  expect(_axios).toHaveBeenCalledWith(expect.objectContaining({
    headers: { Authorization: "Bearer refreshed-board-token" },
  }));
});
