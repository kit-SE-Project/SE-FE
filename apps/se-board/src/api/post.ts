import {
  DeletedPostList,
  FetchCommentListResponse,
  FetchPostListParams,
  FetchPostListResponse,
  PostListItem,
  PostListItemDTO,
  SearchPostParams,
} from "@types";
import { PostCreate, PostCreateRes, PostDetail, PostPut } from "@types";

import { HTTP_METHODS } from ".";
import { _axios, getJWTHeader } from "./axiosInstance";

export const fetchPostList = ({
  categoryId,
  page,
  perPage,
}: FetchPostListParams) => {
  return _axios<FetchPostListResponse>({
    url: `/posts`,
    method: HTTP_METHODS.GET,
    headers: {
      ...getJWTHeader(),
    },
    params: {
      categoryId,
      page,
      perPage,
    },
  });
};

export const fetchPinedPostList = (categoryId: number) => {
  return _axios<PostListItemDTO[]>({
    url: `/posts/pined`,
    method: HTTP_METHODS.GET,
    headers: {
      ...getJWTHeader(),
    },
    params: {
      categoryId,
    },
  });
};

export const searchPost = async ({
  categoryId,
  page,
  perPage,
  searchOption,
  query,
}: SearchPostParams) => {
  return _axios<FetchPostListResponse>({
    url: `/search/posts`,
    method: HTTP_METHODS.GET,
    params: {
      categoryId,
      page,
      perPage,
      searchOption,
      query,
    },
  });
};

//----- converter -----
export const convertPostListItemDTOToPostListItem = (
  postListItemDTO: PostListItemDTO
): PostListItem => {
  return {
    postId: postListItemDTO.postId,
    title: postListItemDTO.title,
    author: postListItemDTO.author,
    views: postListItemDTO.views,
    category: postListItemDTO.category,
    createdDateTime: postListItemDTO.createdAt,
    modifiedDateTime: postListItemDTO.modifiedAt,
    hasAttachment: postListItemDTO.hasAttachment,
    commentSize: postListItemDTO.commentSize,
    pined: postListItemDTO.pined,
    number: 0,
  };
};

export const fetchGetPost = async (postId: string | undefined) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/posts/${postId}`,
    method: HTTP_METHODS.GET,
  }).then((res) => res.data as PostDetail);
};

export const postPost = async (reqBody: PostCreate) => {
  return _axios<PostCreateRes>({
    headers: {
      ...getJWTHeader(),
    },
    url: "/posts",
    method: HTTP_METHODS.POST,
    data: reqBody,
  }).then((res) => res.data);
};

export const putPost = async (postId: number, data: PostPut) => {
  return _axios<PostCreateRes>({
    headers: {
      ...getJWTHeader(),
    },
    url: `/posts/${postId}`,
    method: HTTP_METHODS.PUT,
    data: data,
  }).then((res) => res.data);
};

export const fetchTrendingPosts = async ({
  categoryId,
  days = 7,
  limit = 5,
}: {
  categoryId: number;
  days?: number;
  limit?: number;
}) => {
  return _axios<PostListItemDTO[]>({
    headers: {
      ...getJWTHeader(),
    },
    url: `/posts/trending`,
    method: HTTP_METHODS.GET,
    params: { categoryId, days, limit },
  }).then((res) => res.data);
};

export const likePost = async (postId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/posts/${postId}/like`,
    method: HTTP_METHODS.POST,
  });
};

export const dislikePost = async (postId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/posts/${postId}/dislike`,
    method: HTTP_METHODS.POST,
  });
};

export const bookmarkPost = async (postId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/posts/${postId}/bookmark`,
    method: HTTP_METHODS.POST,
  });
};

export const bookmarkDelete = async (postId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/posts/${postId}/bookmark`,
    method: HTTP_METHODS.DELETE,
  });
};

export const deletePost = async (postId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `/posts/${postId}`,
    method: HTTP_METHODS.DELETE,
  });
};

export const secretPost = async (postId: number, password: string) => {
  return _axios<PostDetail>({
    headers: {
      ...getJWTHeader(),
    },
    url: `/posts/${postId}/auth`,
    method: HTTP_METHODS.POST,
    data: {
      password: password,
    },
  }).then((res) => res.data);
};

export const fetchPostListByLoginId = ({
  loginId,
  page = 0,
  perPage = 0,
}: {
  loginId: string;
  page?: number;
  perPage?: number;
}) => {
  return _axios<FetchPostListResponse>({
    url: `/profile/${loginId}/posts`,
    method: HTTP_METHODS.GET,
    headers: { ...getJWTHeader() },
    params: { page, perPage },
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
    url: `/profile/${loginId}/comments`,
    method: HTTP_METHODS.GET,
    headers: { ...getJWTHeader() },
    params: { page, perPage },
  });
};

export const fetchBookmarkListByLoginId = ({
  userId,
  page = 0,
  perPage = 0,
}: {
  userId: number;
  page?: number;
  perPage?: number;
}) => {
  return _axios<FetchPostListResponse>({
    url: `/profile/${userId}/bookmarks`,
    method: HTTP_METHODS.GET,
    headers: { ...getJWTHeader() },
    params: { page, perPage },
  });
};

export const getDeletedPosts = (page: number = 0, perPage: number = 25) => {
  return _axios<DeletedPostList>({
    headers: {
      ...getJWTHeader(),
    },
    url: `/admin/posts/deleted?page=${page}&perPage=${perPage}`,
    method: HTTP_METHODS.GET,
  }).then((res) => res.data);
};

export const restorePosts = (data: { postIds: number[] }) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: "/admin/posts/restore",
    method: HTTP_METHODS.POST,
    data,
  }).then((res) => res.data);
};

export const permanentlyDeletePosts = (postIds: number[]) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: "/admin/posts/permanent",
    method: HTTP_METHODS.DELETE,
    data: postIds,
  }).then((res) => res.data);
};

export const reportPost = (postId: number) => {
  return _axios({
    headers: {
      ...getJWTHeader(),
    },
    url: `posts/${postId}/report`,
    method: HTTP_METHODS.POST,
  }).then((res) => res.data);
};
