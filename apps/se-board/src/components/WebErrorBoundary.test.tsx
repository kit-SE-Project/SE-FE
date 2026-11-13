/** @jest-environment node */
import React from "react";

import { WebErrorBoundary } from "./WebErrorBoundary";

// Keep Jest's error reporter in Node; CRA's bundled source-map reporter cannot
// read WASM from its jsdom sandbox on Node 22. React still renders to a real DOM.
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://board.example/" });
const previous = new Map<string, PropertyDescriptor | undefined>();
beforeAll(() => {
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, sessionStorage: dom.window.sessionStorage, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(key, Object.getOwnPropertyDescriptor(global, key));
    Object.defineProperty(global, key, { value, configurable: true, writable: true });
  }
});
afterAll(() => {
  dom.window.close();
  previous.forEach((descriptor, key) => { if (descriptor) Object.defineProperty(global, key, descriptor); else Reflect.deleteProperty(global, key); });
});

const render = (element: React.ReactElement) => {
  const { createRoot } = require("react-dom/client");
  const { act } = require("react-dom/test-utils");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, dispose: () => { act(() => root.unmount()); container.remove(); } };
};

test("normal board content is preserved", () => {
  const view = render(<WebErrorBoundary><h1>게시판 정상 화면</h1></WebErrorBoundary>);
  try { expect(view.container.querySelector("h1")?.textContent).toBe("게시판 정상 화면"); }
  finally { view.dispose(); }
});

test("render failures expose reload and home recovery without clearing browser login data", () => {
  const report = jest.spyOn(console, "error").mockImplementation(() => {});
  const Broken = (): React.ReactElement => { throw new Error("test-only render failure"); };
  sessionStorage.setItem("test-login-sentinel", "unchanged");
  try {
    const view = render(<WebErrorBoundary><Broken /></WebErrorBoundary>);
    try {
      expect(view.container.querySelector('[role="alert"]')).toBeTruthy();
      expect(view.container.querySelector("button")?.textContent).toBe("다시 불러오기");
      expect(view.container.querySelector("a")?.getAttribute("href")).toBe("/");
      expect(sessionStorage.getItem("test-login-sentinel")).toBe("unchanged");
    } finally { view.dispose(); }
  } finally { sessionStorage.removeItem("test-login-sentinel"); report.mockRestore(); }
});
