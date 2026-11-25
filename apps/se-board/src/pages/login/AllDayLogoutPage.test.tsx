/** @jest-environment node */
import React from "react";
import { consumeAllDayLogoutIntent, cancelPendingAllDayLogin } from "@/api/allday";
import { useLogout } from "@/react-query/hooks/auth";

jest.mock("@/api/allday", () => ({ consumeAllDayLogoutIntent: jest.fn(), cancelPendingAllDayLogin: jest.fn() }));
jest.mock("@/react-query/hooks/auth", () => ({ useLogout: jest.fn() }));
jest.mock("@chakra-ui/react", () => ({ Center: "div", Stack: "div", Text: "p", Button: "button" }));
const dom = new (require("jsdom").JSDOM)("<!doctype html><html><body></body></html>", { url: "https://board.example/allday/logout" });
const descriptors = new Map<string, PropertyDescriptor | undefined>();
let cleanup: (() => void) | undefined;
beforeAll(() => {
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
    navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(global, key));
    Object.defineProperty(global, key, { value, configurable: true, writable: true });
  }
});
afterEach(() => { cleanup?.(); cleanup = undefined; });
afterAll(() => { dom.window.close(); descriptors.forEach((value, key) => { if (value) Object.defineProperty(global, key, value); else Reflect.deleteProperty(global, key); }); });
function renderPage(strict = false) {
  const { AllDayLogoutPage } = require("./AllDayLogoutPage");
  const { createRoot } = require("react-dom/client");
  const { act } = require("react-dom/test-utils");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(strict ? <React.StrictMode><AllDayLogoutPage /></React.StrictMode> : <AllDayLogoutPage />));
  cleanup = () => { act(() => root.unmount()); container.remove(); };
  return { container, click: () => act(() => container.querySelector("button")!.click()) };
}
const mutate = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  (consumeAllDayLogoutIntent as jest.Mock).mockReturnValue(false);
  (useLogout as jest.Mock).mockReturnValue({ mutate, isLoading: false, isError: false });
});
test("a direct GET does not automatically log out the board", () => {
  const view = renderPage();
  expect(mutate).not.toHaveBeenCalled();
  view.click();
  expect(cancelPendingAllDayLogin).toHaveBeenCalledTimes(1);
  expect(mutate).toHaveBeenCalledTimes(1);
});
test("an explicit rental logout intent starts board logout once, including under StrictMode", () => {
  (consumeAllDayLogoutIntent as jest.Mock).mockReturnValue(true);
  renderPage(true);
  expect(mutate).toHaveBeenCalledTimes(1);
  expect(useLogout).toHaveBeenCalledWith({ returnToAllDay: true });
});
test("a logout failure exposes retry rather than a success or automatic login", () => {
  (useLogout as jest.Mock).mockReturnValue({ mutate, isLoading: false, isError: true });
  const view = renderPage();
  expect(view.container.querySelector('[role="alert"]')!.textContent).toContain("완료하지 못했습니다");
  view.click();
  expect(mutate).toHaveBeenCalledTimes(1);
});
