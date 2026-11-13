import React, { useEffect, useState } from "react";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { useRecoilValue } from "recoil";

import { AdminLayout, MainLayout } from "@/components/layouts";

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
  DepartmentBoardDownloadPage,
  GeneralSetting,
  MainPageSetting,
  MemberGroupManage,
  MemberPolicy,
  RecycleBinPage,
  SEMenuEditPage,
} from "./pages/admin";
import { MemberManagePage } from "./pages/admin/member/MemberManagePage";
import PostManagePage from "./pages/admin/post/PostManagePage";
import RecruitManagePage from "./pages/admin/RecruitManagePage";
import SkillManagePage from "./pages/admin/SkillManagePage";
import { BoardPage } from "./pages/board/BoardPage";
import { PasswordChangeWithoutLoginPage } from "./pages/login";
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
import { RecruitDetailPage } from "./pages/recruit/RecruitDetailPage";
import { RecruitFormPage } from "./pages/recruit/RecruitFormPage";
import { RecruitListPage } from "./pages/recruit/RecruitListPage";
import { useFetchMenuList } from "./react-query/hooks/useMenu";
import { useFetchUserSimpleInfo } from "./react-query/hooks/useProfile";
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
      } else if (menu.type === "RECRUIT") {
        list.push({ path: menu.urlId, element: <RecruitListPage /> });
        list.push({
          path: `${menu.urlId}/:id`,
          element: <RecruitDetailPage />,
        });
        list.push({
          path: `${menu.urlId}/write`,
          element: <RecruitFormPage />,
        });
        list.push({
          path: `${menu.urlId}/:id/edit`,
          element: <RecruitFormPage />,
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

        { path: "/recruit", element: <RecruitListPage /> },
        { path: "/recruit/write", element: <RecruitFormPage /> },
        { path: "/recruit/:id", element: <RecruitDetailPage /> },
        { path: "/recruit/:id/edit", element: <RecruitFormPage /> },

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
          path: "/profile/bookmark/:postId",
          element: <PostPage />,
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
          path: "menu",
          element: <SEMenuEditPage />,
        },
        {
          path: "adminMenu",
          element: <AdminMenuEdit />,
        },
        {
          path: "accountPolicy",
          element: <MemberPolicy />,
        },
        {
          path: "account",
          element: <MemberManagePage />,
        },
        {
          path: "roles",
          element: <MemberGroupManage />,
        },
        {
          path: "trash",
          element: <RecycleBinPage />,
        },
        {
          path: "general",
          element: <GeneralSetting />,
        },
        {
          path: "posts",
          element: <PostManagePage />,
        },
        {
          path: "comments",
          element: <CommentManage />,
        },
        {
          path: "department-board-api-download",
          element: <DepartmentBoardDownloadPage />,
        },
        {
          path: "mainPageMenu",
          element: <MainPageSetting />,
        },
        {
          path: "skills",
          element: <SkillManagePage />,
        },
        {
          path: "recruit",
          element: <RecruitManagePage />,
        },
        {
          path: "*",
          element: <PageNotFound />,
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
          path: "passwordChange",
          element: <PasswordChangeWithoutLoginPage />,
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
  useFetchUserSimpleInfo();

  return (
    <BrowserRouter>
      <MenuRouter />
    </BrowserRouter>
  );
};
