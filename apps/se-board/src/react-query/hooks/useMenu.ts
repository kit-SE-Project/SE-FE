import { useMutation, useQuery } from "@tanstack/react-query";
import { BannerDTO, PostMenuInfo, PutSubMenu } from "@types";
import { AxiosError, AxiosResponse } from "axios";
import { useSetRecoilState } from "recoil";

import { fetchBanners } from "@/api/mainpage";
import {
  deleteCategory,
  fetchMenuList,
  getCategory,
  getMainPageMenus,
  getMenuInfo,
  getMenuList,
  getSelectedMainPageMenus,
  postAddMenuOrCategory,
  postMenuInfo,
  postMoveBoardMenu,
  postMoveCategory,
  putCategory,
  putGroupSubMenu,
  putMainPageMenus,
} from "@/api/menu";
import { menuListState } from "@/store/menu";
import { errorHandle } from "@/utils/errorHandling";

import { queryKeys } from "../queryKeys";

export const useFetchMenuList = () => {
  const setMenuList = useSetRecoilState(menuListState);

  return useQuery({
    queryKey: [queryKeys.menuList],
    queryFn: fetchMenuList,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: 1,
    staleTime: 1000 * 60 * 60,
    cacheTime: 1000 * 60 * 61,
    onSuccess: (res) => {
      const menuList = res.data;
      setMenuList(menuList);
    },
  });
};

export const useGetMenuList = () => {
  return useQuery(["adminMenuList"], getMenuList, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 20,
    cacheTime: 1000 * 60 * 21,
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const useGetCategory = (categoryId: number) => {
  return useQuery(
    ["adminCategory", categoryId],
    () => getCategory(categoryId),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 20,
      cacheTime: 1000 * 60 * 21,
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const useGetMainPageMenus = () => {
  return useQuery(["mainPageMenus"], getMainPageMenus, {
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const useGetSelectedMainPageMenus = () => {
  return useQuery(["selectedMainPageMenus"], getSelectedMainPageMenus, {
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const useFetchBanners = () => {
  return useQuery<AxiosResponse<BannerDTO[]>, AxiosError, BannerDTO[]>(
    ["banners"],
    fetchBanners,
    {
      select: (res) => res.data,
    }
  );
};

export const usePutMainPageMenus = () => {
  return useMutation((menuIds: number[]) => putMainPageMenus(menuIds), {
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const useGetMenuRoleInfo = (categoryId: number | undefined) => {
  return useQuery(["menuRoleInfo", categoryId], () => getMenuInfo(categoryId), {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 20, // 20분
    cacheTime: 1000 * 60 * 21, // 21분
    enabled: !!categoryId,
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const usePostMenuInfo = () => {
  return useMutation(
    (param: { categoryId: number; data: PostMenuInfo }) =>
      postMenuInfo(param.categoryId, param.data),
    {
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const usePutCategory = () => {
  return useMutation(
    (param: { categoryId: number; data: PostMenuInfo }) =>
      putCategory(param.categoryId, param.data),
    {
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const useDeleteCategory = () => {
  return useMutation((categoryId: number) => deleteCategory(categoryId), {
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const usePostMoveBoardMenu = () => {
  return useMutation(
    (param: { fromBoardMenuId: number; toBoardMenuId: number }) =>
      postMoveBoardMenu(param.fromBoardMenuId, param.toBoardMenuId),
    {
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const usePostMoveCategory = () => {
  return useMutation(
    (param: { fromCategoryId: number; toCategoryId: number }) =>
      postMoveCategory(param.fromCategoryId, param.toCategoryId),
    {
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const usePostAddMenuOrCategory = () => {
  return useMutation(
    (param: {
      categoryType: string;
      data: { superCategoryId: number | null } & PostMenuInfo;
    }) => postAddMenuOrCategory(param.categoryType, param.data)
  );
};

export const usePutGroupSubMenu = () => {
  return useMutation(
    (param: { categoryId: number; data: PutSubMenu }) =>
      putGroupSubMenu(param.categoryId, param.data),
    {
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};
