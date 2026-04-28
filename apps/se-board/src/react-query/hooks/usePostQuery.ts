import { useToast } from "@chakra-ui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PostCreate, PostPut } from "@types";

import {
  bookmarkDelete,
  bookmarkPost,
  deletePost,
  dislikePost,
  fetchGetPost,
  fetchTrendingPosts,
  getDeletedPosts,
  likePost,
  permanentlyDeletePosts,
  postPost,
  putPost,
  reportPost,
  restorePosts,
  secretPost,
} from "@/api/post";
import { errorHandle } from "@/utils/errorHandling";

export const useGetPostQuery = (
  postId: string | undefined,
  enabled: boolean
) => {
  return useQuery(["post", postId], () => fetchGetPost(postId), {
    refetchOnWindowFocus: false,
    enabled: !!postId && enabled,
    retry: (failureCount, error) => {
      const { code } = error as { code: number; message: string };

      if (code === 113) {
        return false;
      }

      return true;
    },
  });
};

interface PostResData {
  id: number;
  message: string;
}

export const usePostPostMutation = () => {
  return useMutation((reqBody: PostCreate) => postPost(reqBody), {
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const usePutPostMutation = () => {
  return useMutation(
    (param: { postId: number; data: PostPut }) =>
      putPost(param.postId, param.data),
    {
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const useTrendingPostQuery = (
  categoryId: number | undefined,
  days?: number,
  limit?: number
) => {
  return useQuery(
    ["trendingPosts", categoryId, days, limit],
    () => fetchTrendingPosts({ categoryId: categoryId!, days, limit }),
    {
      enabled: !!categoryId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    }
  );
};

export const useLikePostMutation = () => {
  return useMutation((postId: number) => likePost(postId));
};

export const useDislikePostMutation = () => {
  return useMutation((postId: number) => dislikePost(postId));
};

export const useBookmarkPostMutation = () => {
  return useMutation((postId: number) => bookmarkPost(postId));
};

export const useBookmarkDeleteMutation = () => {
  return useMutation((postId: number) => bookmarkDelete(postId));
};

export const useDeletePostMutation = () => {
  return useMutation((postId: number) => deletePost(postId));
};

export const useSecretPostMutation = () => {
  return useMutation((param: { postId: number; password: string }) =>
    secretPost(param.postId, param.password)
  );
};

export const useGetDeletedPostQuery = (page?: number, perPage?: number) => {
  return useQuery(
    ["deletedPost", page, perPage],
    () => getDeletedPosts(page, perPage),
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 1000 * 60 * 60,
      cacheTime: 1000 * 60 * 61,
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const usePostRestorePostQuery = () => {
  const toast = useToast();
  return useMutation((data: { postIds: number[] }) => restorePosts(data), {
    onSuccess: () => {
      toast({
        title: "게시글이 복구되었습니다",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    },
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const usePermanentlyDeletePostQuery = () => {
  const toast = useToast();
  return useMutation((postIds: number[]) => permanentlyDeletePosts(postIds), {
    onSuccess: () => {
      toast({
        title: "게시글이 영구적으로 삭제되었습니다.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    },
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const useReportPost = () => {
  return useMutation((postId: number) => reportPost(postId));
};
