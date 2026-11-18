import { HTTP_METHODS } from ".";
import { _axios, getJWTHeader } from "./axiosInstance";

export interface RecruitAuthor {
  userId: number;
  loginId: string;
  name: string;
  profileImageUrl: string | null;
  frameGradientStart: string | null;
  frameGradientEnd: string | null;
  badgeType: "CHECK" | "KUMOH_CROW" | null;
  badgeLabel: string | null;
}

export interface RecruitAttachment {
  fileMetaDataId: number;
  originalFileName: string;
  url: string;
}

export interface RecruitPostSummary {
  id: number;
  type: "RECRUIT" | "SEEK";
  tag: string;
  title: string;
  status: "ACTIVE" | "CLOSED";
  endDate: string | null;
  createdAt: string;
  modifiedAt: string | null;
  skills: SkillInfo[];
  viewCount: number;
  portfolioUrl: string | null;
  author: RecruitAuthor;
}

export interface RecruitPostDetail extends RecruitPostSummary {
  contents: string;
  headcount: number | null;
  startDate: string | null;
  attachments: RecruitAttachment[];
}

export interface RecruitPostRequest {
  type: string;
  tag: string;
  title: string;
  contents: string;
  skillIds: number[];
  exposeState?: string;
  privatePassword?: string;
  headcount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  portfolioUrl?: string | null;
  attachmentIds?: number[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface RecruitCommentAuthor {
  userId: number; // BoardUser.boardUserId — userInfo.userId와 동일 기준
  name: string;
  profileImageUrl: string | null;
  frameGradientStart: string | null;
  frameGradientEnd: string | null;
  badgeType: "CHECK" | "KUMOH_CROW" | null;
  badgeLabel: string | null;
}

export interface RecruitComment {
  id: number;
  author: RecruitCommentAuthor | null;
  contents: string | null;
  readOnlyAuthor: boolean;
  deleted: boolean;
  parentCommentId: number | null;
  tagCommentId: number | null;
  createdAt: string;
  modifiedAt: string;
  replies: RecruitComment[];
}

export interface SkillTag {
  id: number;
  name: string;
  category: string;
  active: boolean;
  iconSlug: string | null;
}

export interface SkillTagsPage {
  content: SkillTag[];
  totalPages: number;
  totalElements: number;
  number: number; // current page
  size: number;
}

export interface SkillInfo {
  id: number;
  name: string;
  iconSlug: string | null;
}

export type RecruitSortType = "LATEST" | "DEADLINE" | "VIEWS";

export const fetchRecruitList = (params: {
  type?: string;
  includeClose?: boolean;
  page?: number;
  sort?: RecruitSortType;
}) => {
  return _axios<PageResponse<RecruitPostSummary>>({
    url: "/recruit",
    method: HTTP_METHODS.GET,
    authMode: "public",
    headers: { ...getJWTHeader() },
    params: {
      type: params.type,
      includeClose: params.includeClose ?? false,
      page: params.page ?? 0,
      orderBy: params.sort ?? "LATEST",
    },
  });
};

export const fetchRecruitDetail = (id: number) => {
  return _axios<RecruitPostDetail>({
    url: `/recruit/${id}`,
    method: HTTP_METHODS.GET,
    headers: { ...getJWTHeader() },
  });
};

export const createRecruitPost = (data: RecruitPostRequest) => {
  return _axios<RecruitPostDetail>({
    url: "/recruit",
    method: HTTP_METHODS.POST,
    headers: { ...getJWTHeader() },
    data,
  });
};

export const updateRecruitPost = (id: number, data: RecruitPostRequest) => {
  return _axios<RecruitPostDetail>({
    url: `/recruit/${id}`,
    method: HTTP_METHODS.PUT,
    headers: { ...getJWTHeader() },
    data,
  });
};

export const closeRecruitPost = (id: number) => {
  return _axios<void>({
    url: `/recruit/${id}/close`,
    method: "PATCH",
    headers: { ...getJWTHeader() },
  });
};

export const deleteRecruitPost = (id: number) => {
  return _axios<void>({
    url: `/recruit/${id}`,
    method: HTTP_METHODS.DELETE,
    headers: { ...getJWTHeader() },
  });
};

export const fetchRecruitComments = (recruitPostId: number) => {
  return _axios<RecruitComment[]>({
    url: `/recruit/${recruitPostId}/comments`,
    method: HTTP_METHODS.GET,
    headers: { ...getJWTHeader() },
  });
};

export const createRecruitComment = (
  recruitPostId: number,
  data: {
    contents: string;
    parentCommentId?: number | null;
    readOnlyAuthor?: boolean;
  }
) => {
  return _axios<RecruitComment>({
    url: `/recruit/${recruitPostId}/comments`,
    method: HTTP_METHODS.POST,
    headers: { ...getJWTHeader() },
    data,
  });
};

export const deleteRecruitComment = (
  recruitPostId: number,
  commentId: number
) => {
  return _axios<void>({
    url: `/recruit/${recruitPostId}/comments/${commentId}`,
    method: HTTP_METHODS.DELETE,
    headers: { ...getJWTHeader() },
  });
};

export const fetchSkillTags = (params?: {
  category?: string;
  keyword?: string;
  page?: number;
  size?: number;
}) => {
  return _axios<SkillTagsPage>({
    url: "/skills",
    method: HTTP_METHODS.GET,
    params: {
      category: params?.category !== "ALL" ? params?.category : undefined,
      keyword: params?.keyword || undefined,
      page: params?.page ?? 0,
      size: params?.size ?? 12,
    },
  });
};
