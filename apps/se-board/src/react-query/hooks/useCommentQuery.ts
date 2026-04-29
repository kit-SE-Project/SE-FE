import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { CommentsData, PutCommentData } from "@types";

import {
  deleteComment,
  deleteCommentList,
  deleteReply,
  dislikeComment,
  fetchBestComments,
  fetchComments,
  getAdminComments,
  getDeletedComments,
  likeComment,
  permanentlyDeleteComments,
  postComment,
  postReply,
  putComment,
  putReply,
  reportComment,
  restoreComments,
} from "@/api/comment";
import { errorHandle } from "@/utils/errorHandling";

export const useGetCommentQuery = (
  enabledOption: boolean,
  postId?: string,
  password?: string
) => {
  return useInfiniteQuery(
    ["comments", postId],
    ({ pageParam = 0 }) => fetchComments(postId, pageParam, password),
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      enabled: !!postId && enabledOption,
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 6,
      getNextPageParam: (lastPage: CommentsData) => {
        return lastPage.paginationInfo.last
          ? undefined
          : lastPage.paginationInfo.pageNum + 1;
      },
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const usePostCommentMutation = (postId?: string) => {
  return useMutation(postComment, {
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const usePutCommentMutation = (postId?: string) => {
  return useMutation(
    (param: { commentId: number; putCommentData: PutCommentData }) =>
      putComment(param),
    {
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const useDeleteCommentMutation = (postId?: string) => {
  return useMutation((commentId: number) => deleteComment(commentId));
};

export const useReportCommentMutation = () => {
  return useMutation((commentId: number) => reportComment(commentId), {
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const usePostReplyMutation = (postId?: string) => {
  return useMutation(postReply, {
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const usePutReplyMutation = (postId?: string) => {
  return useMutation(
    (param: { replyId: number; putReplyData: PutCommentData }) =>
      putReply(param),
    {
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const useDeleteReplyMutation = (postId?: string) => {
  return useMutation((replyId: number) => deleteReply(replyId));
};

export const useLikeCommentMutation = () => {
  return useMutation((commentId: number) => likeComment(commentId));
};

export const useDislikeCommentMutation = () => {
  return useMutation((commentId: number) => dislikeComment(commentId));
};

export const useBestCommentsQuery = (postId?: string, limit: number = 3) => {
  return useQuery(
    ["bestComments", postId],
    () => fetchBestComments(postId!, limit),
    {
      enabled: !!postId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    }
  );
};

export const useGetAdminCommmentQuery = (
  isReadOnlyAuthor: boolean | null,
  isReported: boolean | null,
  page?: number,
  perPage?: number,
  searchOption?: string,
  query?: string
) => {
  return useQuery(
    ["adminComments"],
    () =>
      getAdminComments(
        page,
        perPage,
        isReadOnlyAuthor,
        isReported,
        searchOption,
        query
      ),
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

export const useDeleteCommentListMutation = () => {
  return useMutation(
    (commentIdList: number[]) => deleteCommentList(commentIdList),
    {
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};

export const useGetDeleteCommentsQuery = (page?: number, perPage?: number) => {
  return useQuery(
    ["deleteComments", page, perPage],
    () => getDeletedComments(page, perPage),
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

export const usePostRestoreCommentsQuery = () => {
  return useMutation((commentIds: number[]) => restoreComments(commentIds), {
    onError: (err) => {
      errorHandle(err);
    },
  });
};

export const usePermanentlyDeleteCommentsQuery = () => {
  return useMutation(
    (commentIds: number[]) => permanentlyDeleteComments(commentIds),
    {
      onError: (err) => {
        errorHandle(err);
      },
    }
  );
};
