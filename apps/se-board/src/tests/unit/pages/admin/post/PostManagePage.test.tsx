import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router-dom";

import { useAdminPostSearchParams } from "@/hooks";
import PostManagePage from "@/pages/admin/post/PostManagePage";
import { queryClient } from "@/react-query";
import {
  useAdminFetchPostList,
  useAdminTrashPost,
} from "@/react-query/hooks/admin/useAdminPostQuery";

jest.mock("@/react-query/hooks/admin/useAdminPostQuery", () => ({
  useAdminFetchPostList: jest.fn(),
  useAdminTrashPost: jest.fn(),
}));

const mockUseAdminFetchPostList = useAdminFetchPostList as jest.Mock;
const mockUseAdminTrashPost = useAdminTrashPost as jest.Mock;
mockUseAdminFetchPostList.mockReturnValue({
  data: {
    content: [
      {
        author: {},
        category: {},
        exposeOption: "ALL",
        hasAttachment: false,
        isReported: false,
        menu: {
          menuId: 1,
          name: "string",
          urlId: "string",
        },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        postId: 1,
        title: "타이틀",
        views: 1,
      },
    ],
    pageable: {
      sort: {
        unsorted: false,
        sorted: true,
        empty: false,
      },
      pageSize: 1,
      pageNumber: 1,
      offset: 1,
      paged: true,
      unpaged: false,
    },
    empty: true,
    first: true,
    last: true,
    number: 0,
    sort: {},
    totalelements: 1,
    totalPages: 2,
  },
});
mockUseAdminTrashPost.mockReturnValue({
  mutate: jest.fn(),
  isLoading: false,
});

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useSearchParams: jest.fn(),
}));

const mockUseSearchParams = useSearchParams as jest.Mock;

jest.mock("@/hooks", () => ({
  useAdminPostSearchParams: jest.fn(),
}));

const mockUseAdminPostSearchParams = useAdminPostSearchParams as jest.Mock;

describe("PostManagePageTest", () => {
  let setSearchParams: jest.Mock;
  let setPageSearchParam: jest.Mock;

  beforeEach(() => {
    setSearchParams = jest.fn();
    setPageSearchParam = jest.fn();
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams(),
      setSearchParams,
    ]);
    mockUseAdminPostSearchParams.mockReturnValue({
      setPageSearchParam,
    });
    render(
      <ChakraProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <Route path="/" element={<PostManagePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>
    );
  });
  it("렌더링 테스트", () => {
    expect(screen.queryByText("게시글 관리")).toBeTruthy();

    expect(screen.queryByText("전체")).toBeTruthy();
    expect(screen.queryByText("금오")).toBeTruthy();
    expect(screen.queryByText("비밀")).toBeTruthy();
    expect(screen.queryAllByText("신고")).toBeTruthy();

    expect(screen.queryByText("타이틀")).toBeTruthy();

    expect(screen.queryByText("삭제")).toBeTruthy();
    expect(screen.queryByText("1")).toBeTruthy();
    expect(screen.queryByText("2")).toBeTruthy();
  });

  it("삭제 버튼 클릭", async () => {
    const button = screen.getByText("삭제");
    expect(button).toBeTruthy();

    const user = userEvent.setup();
    await user.click(button);

    await waitFor(() => {
      expect(mockUseAdminTrashPost).toHaveBeenCalled();
    });
  });

  it("전체 버튼 클릭", async () => {
    const button = screen.getByText("전체");
    expect(button).toBeTruthy();

    const user = userEvent.setup();
    await user.click(button);

    await waitFor(() => {
      expect(setSearchParams).toHaveBeenCalledWith("");
    });
  });

  it("금오 버튼 클릭", async () => {
    const button = screen.getByText("금오");
    expect(button).toBeTruthy();

    const user = userEvent.setup();
    await user.click(button);

    await waitFor(() => {
      expect(setSearchParams).toHaveBeenCalledWith("expose=KUMOH");
    });
  });

  it("비밀 버튼 클릭", async () => {
    const button = screen.getByText("비밀");
    expect(button).toBeTruthy();

    const user = userEvent.setup();
    await user.click(button);

    await waitFor(() => {
      expect(setSearchParams).toHaveBeenCalledWith("expose=PRIVACY");
    });
  });

  it("2페이지 버튼 클릭", async () => {
    const button = screen.getByText("2");
    expect(button).toBeTruthy();

    const user = userEvent.setup();
    await user.click(button);

    expect(setPageSearchParam).toHaveBeenCalledWith(1);
  });
});
