import { Role } from "@types";

import { HTTP_METHODS } from ".";
import { _axios, getJWTHeader } from "./axiosInstance";

export const getRoleInfos = (page = 0, perPage = 0) => {
  return _axios<Role[]>({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/roles?page=${page}&perPage=${perPage}`,
    method: HTTP_METHODS.GET,
  }).then((res) => res.data);
};

export const deleteRole = (roleId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/roles/${roleId}`,
    method: HTTP_METHODS.DELETE,
  }).then((res) => res.data);
};

export const putRole = (
  roleId: number,
  data: {
    name: string;
    alias: string;
    description: string;
    badgeType?: string | null;
    badgePriority?: number | null;
  }
) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/roles/${roleId}`,
    method: HTTP_METHODS.PUT,
    data,
  }).then((res) => res.data);
};

export const postRole = (data: {
  name: string;
  alias: string;
  description: string;
  badgeType?: string | null;
  badgePriority?: number | null;
}) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/roles`,
    method: HTTP_METHODS.POST,
    data,
  }).then((res) => res.data);
};
