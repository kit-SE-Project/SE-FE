/** @jest-environment node */
import { useLogout } from "./auth";
import { logout } from "@/api/auth";
import { clearStoredAuthTokens, getStoredRefreshToken, isMaintainLogin } from "@/api/storage";

const mockLogin = jest.fn();
const mockReset = jest.fn();
const mockInvalidate = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useMutation: (_key: unknown, mutation: unknown, options: object) => ({ mutation, ...options }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock("react-router-dom", () => ({ useNavigate: jest.fn() }));
jest.mock("recoil", () => ({ useResetRecoilState: () => mockReset, useSetRecoilState: jest.fn() }));
jest.mock("@/hooks", () => ({ useNavigatePage: () => ({ goToLoginPage: mockLogin }) }));
jest.mock("@/store/user", () => ({ userState: {} }));
jest.mock("@/api/auth", () => ({ logout: jest.fn() }));
jest.mock("@/api/fcm", () => ({ deleteFcmToken: jest.fn() }));
jest.mock("@/api/profile", () => ({}));
jest.mock("@/api/storage", () => ({ clearStoredAuthTokens: jest.fn(), getStoredRefreshToken: jest.fn(), getStoredAccessToken: () => "test-only-access", isMaintainLogin: jest.fn() }));
jest.mock("@/api/axiosInstance", () => ({ ...jest.requireActual("@/api/axiosInstance"), refreshStoredAccessToken: jest.fn() }));

const previousWindow = Object.getOwnPropertyDescriptor(global, "window");
const mockReplace = jest.fn();
beforeAll(() => {
  Object.defineProperty(global, "window", { configurable: true, value: { location: { replace: mockReplace, href: "https://board.example/allday/logout" } } });
});
afterAll(() => { if (previousWindow) Object.defineProperty(global, "window", previousWindow); else delete (global as any).window; });
beforeEach(() => {
  jest.clearAllMocks();
  (getStoredRefreshToken as jest.Mock).mockReturnValue("test-only-refresh");
  (isMaintainLogin as jest.Mock).mockReturnValue(false);
  (logout as jest.Mock).mockResolvedValue({ data: { requiredRedirect: false, url: "" } });
});
function hook(integrated = true): any { return useLogout(integrated ? { returnToAllDay: true } : undefined); }

test("integrated logout uses existing SE logout and clears persisted auth and cached identity before returning to AllDay", async () => {
  const task = hook();
  const response = await task.mutation();
  expect(logout).toHaveBeenCalledWith("test-only-refresh", true);
  task.onSuccess(response);
  expect(clearStoredAuthTokens).toHaveBeenCalledTimes(1);
  expect(mockReset).toHaveBeenCalledTimes(1);
  expect(mockInvalidate).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith("/allday/");
  expect(mockLogin).not.toHaveBeenCalled();
});
test("an already absent SE session clears local identity without a bogus logout request", async () => {
  (getStoredRefreshToken as jest.Mock).mockReturnValue(null);
  const task = hook();
  task.onSuccess(await task.mutation());
  expect(logout).not.toHaveBeenCalled();
  expect(clearStoredAuthTokens).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith("/allday/");
});
test("a network failure remains a failure and does not claim completed logout", async () => {
  (logout as jest.Mock).mockRejectedValue(new Error("network unavailable"));
  await expect(hook().mutation()).rejects.toThrow("network unavailable");
  expect(clearStoredAuthTokens).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});
test("expired SE sessions are cleared instead of preserving credentials for silent SSO", async () => {
  (logout as jest.Mock).mockRejectedValue({ code: 107 });
  const task = hook();
  task.onSuccess(await task.mutation());
  expect(clearStoredAuthTokens).toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith("/allday/");
});
test("token rotation during automatic refresh retries logout with the new refresh token", async () => {
  (getStoredRefreshToken as jest.Mock).mockReturnValueOnce("old-test-refresh").mockReturnValueOnce("new-test-refresh");
  (logout as jest.Mock).mockRejectedValueOnce({ code: 106 }).mockResolvedValueOnce({ data: { requiredRedirect: false } });
  await hook().mutation();
  expect(logout).toHaveBeenNthCalledWith(1, "old-test-refresh", true);
  expect(logout).toHaveBeenNthCalledWith(2, "new-test-refresh", true);
});
test("ordinary SE logout keeps its existing login-page destination", async () => {
  const task = hook(false);
  task.onSuccess(await task.mutation());
  expect(logout).toHaveBeenCalledWith("test-only-refresh", false);
  expect(mockLogin).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});
test("ordinary provider logout preserves both its external redirect and existing SE navigation", async () => {
  const task = hook(false);
  task.onSuccess({ data: { requiredRedirect: true, url: "https://provider.example/logout" } });
  expect(window.location.href).toBe("https://provider.example/logout");
  expect(mockLogin).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});
test("integrated provider logout respects the provider redirect instead of replacing it with AllDay", () => {
  hook().onSuccess({ data: { requiredRedirect: true, url: "https://provider.example/logout" } });
  expect(window.location.href).toBe("https://provider.example/logout");
  expect(mockLogin).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});
