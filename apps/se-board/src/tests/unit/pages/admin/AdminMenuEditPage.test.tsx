import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RecoilRoot } from "recoil";

import { AdminMenuEdit } from "@/pages/admin";
import { queryClient } from "@/react-query";
import {
  useGetAdminDashboard,
  usePostAdminMenuRollSetting,
} from "@/react-query/hooks";

jest.mock("@/react-query/hooks", () => ({
  useGetAdminDashboard: jest.fn(),
  usePostAdminMenuRollSetting: jest.fn(),
}));

const mockUseGetAdminDashboard = useGetAdminDashboard as jest.Mock;

mockUseGetAdminDashboard.mockReturnValue({
  menu: [
    {
      menu: {
        id: 0,
        name: "메뉴",
        url: "menu",
      },
      option: {
        option: "string",
        roles: ["string"],
      },
    },
  ],
  person: [
    {
      menu: {
        id: 1,
        name: "회원",
        url: "person",
      },
      option: {
        option: "string",
        roles: ["string"],
      },
    },
  ],
  content: [
    {
      menu: {
        id: 2,
        name: "컨텐츠",
        url: "content",
      },
      option: {
        option: "string",
        roles: ["string"],
      },
    },
  ],
  setting: [
    {
      menu: {
        id: 3,
        name: "설정",
        url: "setting",
      },
      option: {
        option: "string",
        roles: ["string"],
      },
    },
  ],
});

const mockUsePostAdminMenuRollSetting =
  usePostAdminMenuRollSetting as jest.Mock;

mockUsePostAdminMenuRollSetting.mockReturnValue({
  mutate: jest.fn(),
  isLoading: false,
});

describe("AdminMenuEditPageTest", () => {
  beforeEach(() => {
    render(
      <ChakraProvider>
        <RecoilRoot>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/"]}>
              <Routes>
                <Route path="/" element={<AdminMenuEdit />} />
              </Routes>
            </MemoryRouter>
          </QueryClientProvider>
        </RecoilRoot>
      </ChakraProvider>
    );
  });

  it("렌더링 테스트", async () => {
    expect(screen.queryByText("관리자 메뉴 권한 관리")).toBeTruthy();
    expect(screen.queryByText("등록")).toBeTruthy();
  });

  it("등록 버튼 클릭", async () => {
    const enrollButton = screen.getByText("등록");
    expect(enrollButton).toBeTruthy();

    const user = userEvent.setup();
    await user.click(enrollButton);

    expect(mockUsePostAdminMenuRollSetting).toHaveBeenCalled();
  });
});
