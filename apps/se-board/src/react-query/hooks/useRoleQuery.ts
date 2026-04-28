import { useMutation, useQuery } from "@tanstack/react-query";

import { deleteRole, getRoleInfos, postRole, putRole } from "@/api/Role";
import { errorHandle } from "@/utils/errorHandling";

export const useGetRoleInfos = (page = 0, perPage = 0) => {
  return useQuery(
    ["roleInfos", page, perPage],
    () => getRoleInfos(page, perPage),
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 10, // 10분
      cacheTime: 1000 * 60 * 11, // 11분
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const useDeleteRole = () => {
  return useMutation((roleId: number) => deleteRole(roleId));
};

export const useUpdateRole = () => {
  return useMutation(
    (param: {
      roleId: number;
      name: string;
      alias: string;
      description: string;
      badgeType?: string | null;
      badgePriority?: number | null;
    }) =>
      putRole(param.roleId, {
        name: param.name,
        alias: param.alias,
        description: param.description,
        badgeType: param.badgeType,
        badgePriority: param.badgePriority,
      })
  );
};

export const useAddRole = () => {
  return useMutation(
    (param: {
      name: string;
      alias: string;
      description: string;
      badgeType?: string | null;
      badgePriority?: number | null;
    }) => postRole(param)
  );
};
