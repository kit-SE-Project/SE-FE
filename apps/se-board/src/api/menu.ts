import {
  MainPageMenus,
  Menu,
  MenuInfo,
  MenuList,
  PostMenuInfo,
  PutSubMenu,
  SelectedMainPageMenus,
  SubMenus,
} from "@types";

import { HTTP_METHODS } from ".";
import { _axios, getJWTHeader } from "./axiosInstance";

export const fetchMenuList = () => {
  return _axios<Menu[]>({
    headers: {
      ...getJWTHeader(),
    },
    url: "/menu",
    method: HTTP_METHODS.GET,
    authMode: "public",
  });
};

export const getMenuList = () => {
  return _axios<MenuList>({
    headers: {
      ...getJWTHeader(),
    },
    url: "/admin/menu",
    method: HTTP_METHODS.GET,
  }).then((res) => res.data);
};

export const getCategory = (categoryId: number) => {
  return _axios<SubMenus>({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/menu/${categoryId}`,
    method: HTTP_METHODS.GET,
  }).then((res) => res.data);
};

export const getMainPageMenus = () => {
  return _axios<MainPageMenus>({
    headers: {
      ...getJWTHeader(),
    },
    url: "admin/mainPageMenus/all",
    method: HTTP_METHODS.GET,
  }).then((res) => res.data);
};

export const getSelectedMainPageMenus = () => {
  return _axios<SelectedMainPageMenus>({
    headers: {
      ...getJWTHeader(),
    },
    url: "admin/mainPageMenus",
    method: HTTP_METHODS.GET,
  }).then((res) => res.data);
};

export const putMainPageMenus = (menuIds: number[]) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: "admin/mainPageMenus",
    method: HTTP_METHODS.PUT,
    data: {
      menuIds,
    },
  }).then((res) => res.data);
};

export const getMenuInfo = (categoryId: number | undefined) => {
  return _axios<MenuInfo>({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/authorization/category/${categoryId}`,
    method: HTTP_METHODS.GET,
  }).then((res) => res.data);
};

export const postMenuInfo = (categoryId: number, data: PostMenuInfo) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/authorization/category/${categoryId}`,
    method: HTTP_METHODS.POST,
    data,
  }).then((res) => res.data);
};

export const putCategory = (categoryId: number, data: PostMenuInfo) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/menu/${categoryId}`,
    method: HTTP_METHODS.PUT,
    data,
  }).then((res) => res.data);
};

export const deleteCategory = (categoryId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/menu/${categoryId}`,
    method: HTTP_METHODS.DELETE,
  }).then((res) => res.data);
};

export const postMoveBoardMenu = (
  fromBoardMenuId: number,
  toBoardMenuId: number
) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/menu/migrate`,
    method: HTTP_METHODS.POST,
    data: {
      fromBoardMenuId,
      toBoardMenuId,
    },
  }).then((res) => res.data);
};

export const postMoveCategory = (
  fromCategoryId: number,
  toCategoryId: number
) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/posts/migrate`,
    method: HTTP_METHODS.POST,
    data: {
      fromCategoryId,
      toCategoryId,
    },
  }).then((res) => res.data);
};

export const postAddMenuOrCategory = (
  categoryType: string,
  data: { superCategoryId: number | null } & PostMenuInfo
) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/menu?categoryType=${categoryType}`,
    method: HTTP_METHODS.POST,
    data,
  }).then((res) => res.data);
};

export const putGroupSubMenu = (categoryId: number, data: PutSubMenu) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/menu/${categoryId}`,
    method: HTTP_METHODS.PUT,
    data,
  }).then((res) => res.data);
};
