import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CommentListItemDTO, PostListItem } from "@types";
import { useState } from "react";
import { useSetRecoilState } from "recoil";

import {
  convertPostListItemDTOToPostListItem,
  fetchBookmarkListByLoginId,
  fetchCommentListByLoginId,
  fetchPostListByLoginId,
} from "@/api/post";
import {
  deleteProfileImage,
  equipFrame,
  fetchMyFrames,
  fetchUserProfile,
  fetchUserSimpleInfo,
  unequipFrame,
  updateUserProfile,
  uploadProfileImage,
} from "@/api/profile";
import { getStoredAccessToken } from "@/api/storage";
import { roleNames, userState } from "@/store/user";

import { queryKeys } from "../queryKeys";

export const useFetchUserSimpleInfo = () => {
  const setUserState = useSetRecoilState(userState);

  return useQuery([queryKeys.profile], () => fetchUserSimpleInfo(), {
    enabled: !!getStoredAccessToken(),
    onSuccess: (res) => {
      const { nickname, userId, email, roles, profileImageUrl } = res.data;
      setUserState((prev) => ({
        ...prev,
        nickname,
        userId,
        email,
        roles: roles.map((v) => roleNames[v as keyof typeof roleNames]),
        profileImageUrl: profileImageUrl ?? null,
      }));
    },
  });
};

export const useFetchUserProfile = (userId: string) => {
  return useQuery([queryKeys.profile, userId], () => fetchUserProfile(userId), {
    select: (res) => res.data,
  });
};

export const useUpdateUserProfile = () => {
  const setUserState = useSetRecoilState(userState);
  return useMutation((data: { nickname: string }) => updateUserProfile(data), {
    onSuccess: () => {
      fetchUserSimpleInfo().then((res) => {
        const { nickname, userId, email, roles } = res.data;
        setUserState((prev) => ({
          ...prev,
          nickname,
          userId,
          email,
          roles: roles.map((v) => roleNames[v as keyof typeof roleNames]),
        }));
      });
    },
  });
};

export const useUploadProfileImage = (userId: string) => {
  const queryClient = useQueryClient();
  const setUserState = useSetRecoilState(userState);
  return useMutation((file: File) => uploadProfileImage(file), {
    onSuccess: (res) => {
      setUserState((prev) => ({ ...prev, profileImageUrl: res.data }));
      queryClient.invalidateQueries([queryKeys.profile, userId]);
    },
  });
};

export const useDeleteProfileImage = (userId: string) => {
  const queryClient = useQueryClient();
  const setUserState = useSetRecoilState(userState);
  return useMutation(() => deleteProfileImage(), {
    onSuccess: () => {
      setUserState((prev) => ({ ...prev, profileImageUrl: null }));
      queryClient.invalidateQueries([queryKeys.profile, userId]);
    },
  });
};

export const useFetchMyFrames = () => {
  return useQuery([queryKeys.profile, "frames"], () => fetchMyFrames(), {
    enabled: !!getStoredAccessToken(),
    select: (res) => res.data,
  });
};

export const useEquipFrame = (userId: string) => {
  const queryClient = useQueryClient();
  const setUserState = useSetRecoilState(userState);
  return useMutation(
    ({
      frameId,
    }: {
      frameId: number;
      gradientStart: string;
      gradientEnd: string;
    }) => equipFrame(frameId),
    {
      onSuccess: (_res, variables) => {
        setUserState((prev) => ({
          ...prev,
          frameGradientStart: variables.gradientStart,
          frameGradientEnd: variables.gradientEnd,
        }));
        queryClient.invalidateQueries([queryKeys.profile, userId]);
        queryClient.invalidateQueries([queryKeys.profile, "frames"]);
      },
    }
  );
};

export const useUnequipFrame = (userId: string) => {
  const queryClient = useQueryClient();
  const setUserState = useSetRecoilState(userState);
  return useMutation(() => unequipFrame(), {
    onSuccess: () => {
      setUserState((prev) => ({
        ...prev,
        frameGradientStart: null,
        frameGradientEnd: null,
      }));
      queryClient.invalidateQueries([queryKeys.profile, userId]);
      queryClient.invalidateQueries([queryKeys.profile, "frames"]);
    },
  });
};

export const useFetchProfilePostList = ({
  loginId,
  perPage = 0,
  page = 0,
}: {
  loginId: string;
  perPage?: number;
  page?: number;
}) => {
  const [posts, setPosts] = useState<{
    pinedPostList: PostListItem[];
    postList: PostListItem[];
  }>({ pinedPostList: [], postList: [] });
  const [totalItems, setTotalItems] = useState(0);

  const { isLoading: postListLoading } = useQuery(
    [queryKeys.postList, loginId, perPage, page],
    () =>
      fetchPostListByLoginId({
        loginId,
        perPage,
        page,
      }),
    {
      enabled: !!loginId && !!perPage,
      onSuccess: (res) => {
        const { content, size, number, totalElements } = res.data;
        const list = content
          .map((v) => convertPostListItemDTOToPostListItem(v))
          .map((v, i) => ({
            ...v,
            pined: false,
            number: totalElements - size * number - i,
          }));
        setPosts((prev) => ({ ...prev, postList: list }));
        setTotalItems(res.data.totalElements);
      },
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  return {
    postList: posts.postList,
    isLoading: postListLoading,
    totalItems,
    onChangePage: (page: number) => {
      window.scrollTo(0, 0);
    },
  };
};

export const useFetchBookmarkList = ({
  userId,
  perPage = 0,
  page = 0,
}: {
  userId: number;
  perPage?: number;
  page?: number;
}) => {
  const [posts, setPosts] = useState<{
    pinedPostList: PostListItem[];
    postList: PostListItem[];
  }>({ pinedPostList: [], postList: [] });
  const [totalItems, setTotalItems] = useState(0);

  const { isLoading: postListLoading } = useQuery(
    [queryKeys.postList, userId, perPage, page],
    () =>
      fetchBookmarkListByLoginId({
        userId,
        perPage,
        page,
      }),
    {
      enabled: userId !== -1 && !!perPage,
      onSuccess: (res) => {
        const list = res.data.content
          .map((v) => convertPostListItemDTOToPostListItem(v))
          .map((v) => ({ ...v, pined: false }));
        setPosts((prev) => ({ ...prev, postList: list }));
        setTotalItems(res.data.totalElements);
      },
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  return {
    postList: posts.postList,
    isLoading: postListLoading,
    totalItems,
    onChangePage: (page: number) => {
      window.scrollTo(0, 0);
    },
  };
};

export const useFetchProfileCommentList = ({
  loginId,
  perPage = 0,
  page = 0,
}: {
  loginId: string;
  perPage?: number;
  page?: number;
}) => {
  const [comments, setComments] = useState<CommentListItemDTO[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const { isLoading: postListLoading } = useQuery(
    [queryKeys.postList, loginId, perPage, page],
    () =>
      fetchCommentListByLoginId({
        loginId,
        perPage,
        page,
      }),
    {
      enabled: !!loginId && !!perPage,
      onSuccess: (res) => {
        const { content, size, number, totalElements } = res.data;
        setComments(
          content.map((v, i) => ({
            ...v,
            number: totalElements - size * number - i,
          }))
        );
        setTotalItems(res.data.totalElements);
      },
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  return {
    commentList: comments,
    isLoading: postListLoading,
    totalItems,
  };
};
