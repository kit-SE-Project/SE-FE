import {
  AllComments,
  BestComment,
  CommentsData,
  FetchCommentListResponse,
  PostCommentData,
  PostReplyData,
  PutCommentData,
} from "@types";

import { HTTP_METHODS } from ".";
import { _axios, getJWTHeader } from "./axiosInstance";

export const fetchComments = (
  postId: string | undefined,
  pageParam: number,
  password?: string
) => {
  const queryParam = password
    ? `page=${pageParam}&perPage=25&password=${password}`
    : `page=${pageParam}&perPage=25`;

  return _axios<CommentsData>({
    headers: {
      ...getJWTHeader(),
    },
    url: `/posts/${postId}/comments?` + queryParam,
    method: HTTP_METHODS.GET,
  }).then((res) => res.data);
};

export const postComment = async (postData: PostCommentData) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: "/comments",
    method: HTTP_METHODS.POST,
    data: postData,
  }).then((res) => res.data);
};

export const putComment = async (param: {
  commentId: number;
  putCommentData: PutCommentData;
}) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/comments/${param.commentId}`,
    method: HTTP_METHODS.PUT,
    data: param.putCommentData,
  });
};

export const deleteComment = async (commentId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/comments/${commentId}`,
    method: HTTP_METHODS.DELETE,
  });
};

export const postReply = async (postReplyData: PostReplyData) => {
  // 답글 작성
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: "/reply",
    method: HTTP_METHODS.POST,
    data: postReplyData,
  });
};

export const putReply = async (param: {
  replyId: number;
  putReplyData: PutCommentData;
}) => {
  // 답글 수정
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/reply/${param.replyId}`,
    method: HTTP_METHODS.PUT,
    data: param.putReplyData,
  });
};

export const deleteReply = async (replyId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/reply/${replyId}`,
    method: HTTP_METHODS.DELETE,
  });
};

export const likeComment = async (commentId: number) => {
  return _axios({
    headers: { ...getJWTHeader() },
    url: `/comments/${commentId}/like`,
    method: HTTP_METHODS.POST,
  });
};

export const dislikeComment = async (commentId: number) => {
  return _axios({
    headers: { ...getJWTHeader() },
    url: `/comments/${commentId}/dislike`,
    method: HTTP_METHODS.POST,
  });
};

export const fetchBestComments = async (postId: string, limit: number = 3) => {
  return _axios<BestComment[]>({
    headers: { ...getJWTHeader() },
    url: `/posts/${postId}/comments/best`,
    method: HTTP_METHODS.GET,
    params: { limit },
  }).then((res) => res.data);
};

export const reportComment = (commentId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/comments/${commentId}/report`,
    method: HTTP_METHODS.POST,
  });
};

export const fetchCommentListByLoginId = ({
  loginId,
  page = 0,
  perPage = 0,
}: {
  loginId: string;
  page?: number;
  perPage?: number;
}) => {
  return _axios<FetchCommentListResponse>({
    url: `/profile/comments/${loginId}`,
    method: HTTP_METHODS.GET,
    headers: { ...getJWTHeader() },
    params: { page, perPage },
  });
};

export const getAdminComments = (
  page: number = 0,
  perPage: number = 25,
  isReadOnlyAuthor: boolean | null,
  isReported: boolean | null,
  searchOption?: string,
  query?: string
) => {
  let url = "/admin/comments?";

  if (isReadOnlyAuthor !== null) {
    url += `isReadOnlyAuthor=${isReadOnlyAuthor}&`;
  }

  if (isReported !== null) {
    url += `isReported=${isReported}&`;
  }

  if (searchOption && query) {
    url += `searchOption=${searchOption}&query=${query}&`;
  }

  return _axios<AllComments>({
    headers: {
      ...getJWTHeader(),
    },
    url: (url += `page=${page}&perPage=${perPage}`),
    method: HTTP_METHODS.GET,
  }).then((res) => res.data);
};

export const deleteCommentList = (commentIds: number[]) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: "/admin/comments",
    method: HTTP_METHODS.DELETE,
    data: { commentIds },
  }).then((res) => res.data);
};

export const getDeletedComments = (page: number = 0, perPage: number = 25) => {
  return _axios<AllComments>({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/comments/deleted?page=${page}&perPage=${perPage}`,
    method: HTTP_METHODS.GET,
  }).then((res) => res.data);
};

export const restoreComments = (commentIds: number[]) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: "/admin/comments/restore",
    method: HTTP_METHODS.POST,
    data: { commentIds },
  }).then((res) => res.data);
};

export const permanentlyDeleteComments = (commentIds: number[]) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: "/admin/comments/permanent",
    method: HTTP_METHODS.DELETE,
    data: { commentIds },
  }).then((res) => res.data);
};
