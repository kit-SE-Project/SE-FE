import React, { useEffect, useState } from "react";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { useRecoilValue } from "recoil";

import { AdminLayout, MainLayout } from "@/components/layouts";

import { getStoredRefreshToken } from "./api/storage";
import {
  LoginPage,
  NoticeWrite,
  OAuthSignupPage,
  PostPage,
  SignupCompletePage,
  SignupPage,
} from "./pages";
import {
  AdminMenuEdit,
  CommentManage,
  GeneralSetting,
  MainPageSetting,
  MemberGroupManage,
  MemberPolicy,
  RecycleBinPage,
  SEMenuEditPage,
} from "./pages/admin";
import { BoardPage } from "./pages/board/BoardPage";
import { MainPage } from "./pages/main/MainPage";
import { PageNotFound } from "./pages/PageNotFound";
import { BookmarkPage } from "./pages/profile/BookmarkPage";
import { ProfileCommentListPage } from "./pages/profile/CommentListPage";
import { KumohCertificationPage } from "./pages/profile/KumohCertificationPage";
import { NickNameChangePage } from "./pages/profile/NicknameChangePage";
import { NotificationSettingPage } from "./pages/profile/NotificationSetting";
import { PasswordChangepage } from "./pages/profile/PasswordChangePage";
import { ProfilePostListPage } from "./pages/profile/PostListPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { WithdrawalPage } from "./pages/profile/WithdrawalPage";
import { useReissueToken } from "./react-query/hooks/auth";
import { useFetchMenuList } from "./react-query/hooks/useMenu";
import { menuListState } from "./store/menu";

interface RoutesObject {
  path?: string;
  element?: React.ReactNode;
  children?: RoutesObject[];
}

const MenuRouter = () => {
  const [dynamicRoutes, setDynamicRoutes] = useState<RoutesObject[]>([]);
  const menuList = useRecoilValue(menuListState);
  const { isLoading } = useFetchMenuList();

  useEffect(() => {
    const list: RoutesObject[] = [];
    menuList.forEach((menu) => {
      if (menu.type === "BOARD") {
        list.push({
          path: menu.urlId,
          element: <BoardPage />,
        });
        list.push({
          path: `${menu.urlId}/write`,
          element: <NoticeWrite />,
        });
        list.push({
          path: `${menu.urlId}/:postId`,
          element: <PostPage />,
        });
        list.push({
          path: `${menu.urlId}/:postId/modify`,
          element: <NoticeWrite />,
        });
      } else if (menu.type === "MENU") {
        menu.subMenu
          .filter((v) => v.type === "BOARD")
          .forEach((subMenu) => {
            list.push({
              path: subMenu.urlId,
              element: <BoardPage />,
            });
            list.push({
              path: `${subMenu.urlId}/write`,
              element: <NoticeWrite />,
            });
            list.push({
              path: `${subMenu.urlId}/:postId`,
              element: <PostPage />,
            });
            list.push({
              path: `${subMenu.urlId}/:postId/modify`,
              element: <NoticeWrite />,
            });
          });
      }
    });
    setDynamicRoutes(list);
  }, [menuList]);

  return useRoutes([
    {
      path: "",
      element: <MainLayout />,
      children: [
        ...dynamicRoutes,
        { path: "", element: <MainPage /> },
        {
          path: "/posts/:postId",
          element: <PostPage />,
        },
        {
          path: "/profile/:userId",
          element: <ProfilePage />,
        },
        {
          path: "/profile/:userId/posts",
          element: <ProfilePostListPage />,
        },
        {
          path: "/profile/:userId/comments",
          element: <ProfileCommentListPage />,
        },
        {
          path: "/profile/:userId/posts/:postId",
          element: <PostPage />,
        },
        {
          path: "/profile/:userId/comments",
          element: <ProfilePostListPage />,
        },
        {
          path: "/profile/bookmark",
          element: <BookmarkPage />,
        },
        {
          path: "/profile/edit",
          element: <NickNameChangePage />,
        },
        {
          path: "/profile/password/edit",
          element: <PasswordChangepage />,
        },
        {
          path: "/profile/kumoh-certification",
          element: <KumohCertificationPage />,
        },
        {
          path: "/profile/notification/setting",
          element: <NotificationSettingPage />,
        },
        {
          path: "/profile/withdrawal",
          element: <WithdrawalPage />,
        },
        {
          path: "*",
          element: <PageNotFound />,
        },
      ],
    },
    {
      path: "admin",
      element: <AdminLayout />,
      children: [
        {
          path: "seMenu",
          element: <SEMenuEditPage />,
        },
        {
          path: "adminMenu",
          element: <AdminMenuEdit />,
        },
        {
          path: "memberPolicy",
          element: <MemberPolicy />,
        },
        {
          path: "memberGroup",
          element: <MemberGroupManage />,
        },
        {
          path: "recycleBin",
          element: <RecycleBinPage />,
        },
        {
          path: "general",
          element: <GeneralSetting />,
        },
        {
          path: "commentManage",
          element: <CommentManage />,
        },
        {
          path: "mainPageSetting",
          element: <MainPageSetting />,
        },
      ],
    },
    {
      children: [
        {
          path: "login",
          element: <LoginPage />,
        },
        {
          path: "signup",
          element: <SignupPage />,
        },
        {
          path: "signup/oauth",
          element: <OAuthSignupPage />,
        },
        {
          path: "signup/complete",
          element: <SignupCompletePage />,
        },
      ],
    },
  ]);
};

export const App = () => {
  const { mutate: reissue } = useReissueToken();

  useEffect(() => {
    if (getStoredRefreshToken()) reissue();
  }, []);

  return (
    <BrowserRouter>
      <MenuRouter />
    </BrowserRouter>
  );
};
