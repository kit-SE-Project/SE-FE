/** @jest-environment node */
import React from "react";
import { Menu } from "@types";

jest.mock("@/api/allday", () => ({ allDayWebUrl: "/allday/" }));
jest.mock("@/hooks", () => ({
  useNavigatePage: () => ({}),
  useWindowSize: () => ({ width: 1280 }),
}));
jest.mock("@/react-query/hooks/auth", () => ({
  useLogout: () => ({ mutate: jest.fn() }),
}));
jest.mock("@/store/user", () => ({
  useUserState: () => ({ hasAuth: false, userInfo: {} }),
}));
jest.mock("@/components/notification/NotificationBell", () => ({
  NotificationBell: () => null,
}));
jest.mock("@/components/common/GradientAvatar", () => ({
  GradientAvatar: () => null,
}));
jest.mock("./Logo", () => ({ Logo: () => <a href="/">SE</a> }));
jest.mock("@/api/menu", () => ({ fetchMenuList: jest.fn() }));

const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://board.example/",
  pretendToBeVisual: true,
});
const previous = new Map<string, PropertyDescriptor | undefined>();
let dispose: (() => void) | undefined;
beforeAll(() => {
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLIFrameElement: dom.window.HTMLIFrameElement,
    ShadowRoot: dom.window.ShadowRoot,
    SVGElement: dom.window.SVGElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(global, key));
    Object.defineProperty(global, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  dom.window.matchMedia = () =>
    ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    }) as any;
});
afterEach(() => {
  dispose?.();
  dispose = undefined;
});
afterAll(() => {
  dom.window.close();
  previous.forEach((descriptor, key) => {
    if (descriptor) Object.defineProperty(global, key, descriptor);
    else Reflect.deleteProperty(global, key);
  });
});

function render(element: React.ReactElement) {
  const { createRoot } = require("react-dom/client");
  const { act } = require("react-dom/test-utils");
  const { MemoryRouter } = require("react-router-dom");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {element}
      </MemoryRouter>
    )
  );
  dispose = () => {
    act(() => root.unmount());
    container.remove();
  };
  return { container, act };
}

const menus = [
  { menuId: 1, name: "공지사항", type: "BOARD", urlId: "/notice", subMenu: [] },
  {
    menuId: 2,
    name: "서버대여",
    type: "EXTERNAL",
    externalUrl: "https://legacy.example",
    subMenu: [],
  },
  {
    menuId: 3,
    name: "Project & Job",
    type: "RECRUIT",
    urlId: "/recruit",
    subMenu: [],
  },
] as unknown as Menu[];

test("empty loading menus show progress alongside the test rental link", () => {
  const { DesktopHeaderNavigation } = require("./HeaderNavigation");
  const { container } = render(
    <DesktopHeaderNavigation menuList={[]} menuLoading />
  );
  expect(container.querySelector('[role="status"]')?.textContent).toContain(
    "메뉴를 불러오는 중"
  );
  expect(container.querySelector('a[href="/allday/"]')?.textContent).toBe(
    "서버 대여 (테스트중)"
  );
});

test("menu failure exposes retry and preserves existing links", () => {
  const { DesktopHeaderNavigation } = require("./HeaderNavigation");
  const retry = jest.fn();
  const { container, act } = render(
    <DesktopHeaderNavigation menuList={menus} menuError retryMenus={retry} />
  );
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "메뉴를 불러오지 못했습니다"
  );
  expect(container.querySelector('a[href="/notice"]')).toBeTruthy();
  expect(
    container.querySelector('a[href="https://legacy.example"]')
  ).toBeTruthy();
  const button = Array.from(container.querySelectorAll("button")).find(
    (item) => item.textContent === "다시 불러오기"
  )!;
  act(() => button.click());
  expect(retry).toHaveBeenCalledTimes(1);
});

test("mobile menu shows recruitment, original rental, test rental and a neutral login label", () => {
  const { DrawerNavigation } = require("./HeaderNavigation");
  const onClose = jest.fn();
  const { act } = render(
    <DrawerNavigation menuList={menus} isOpen onClose={onClose} />
  );
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).not.toContain("로그인이 필요합니다");
  expect(dialog.textContent).toContain("로그인");
  expect(dialog.querySelector('a[href="https://legacy.example"]')).toBeTruthy();
  expect(dialog.querySelector('a[href="/allday/"]')).toBeTruthy();
  const recruit =
    dialog.querySelector<HTMLAnchorElement>('a[href="/recruit"]')!;
  expect(recruit.textContent).toBe("Project & Job");
  act(() => recruit.click());
  expect(onClose).toHaveBeenCalled();
});

test("failed menu requests can be retried and replace the error with the loaded links", async () => {
  const { QueryClient, QueryClientProvider } = require("@tanstack/react-query");
  const { RecoilRoot, useRecoilValue } = require("recoil");
  const { menuListState } = require("@/store/menu");
  const { useFetchMenuList } = require("@/react-query/hooks/useMenu");
  const { fetchMenuList } = require("@/api/menu");
  const { DesktopHeaderNavigation } = require("./HeaderNavigation");
  const report = jest.spyOn(console, "error").mockImplementation(() => {});
  const client = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0 } },
  });
  fetchMenuList.mockRejectedValue(new Error("test-only temporary outage"));
  function Navigation() {
    const query = useFetchMenuList();
    const list = useRecoilValue(menuListState);
    return (
      <DesktopHeaderNavigation
        menuList={list}
        menuLoading={query.isLoading}
        menuError={query.isError}
        menuRefreshing={query.isFetching}
        retryMenus={() => {
          void query.refetch();
        }}
      />
    );
  }
  const { container, act } = render(
    <QueryClientProvider client={client}>
      <RecoilRoot>
        <Navigation />
      </RecoilRoot>
    </QueryClientProvider>
  );
  async function until(check: () => boolean) {
    for (let i = 0; i < 50 && !check(); i++)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    expect(check()).toBe(true);
  }
  try {
    await until(() => !!container.querySelector('[role="alert"]'));
    fetchMenuList.mockResolvedValue({ data: menus });
    const button = Array.from(container.querySelectorAll("button")).find(
      (item) => item.textContent === "다시 불러오기"
    )!;
    act(() => button.click());
    await until(() => !!container.querySelector('a[href="/notice"]'));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(
      container.querySelector('a[href="https://legacy.example"]')
    ).toBeTruthy();
    expect(container.querySelector('a[href="/allday/"]')).toBeTruthy();
  } finally {
    dispose?.();
    dispose = undefined;
    client.clear();
    report.mockRestore();
  }
});
