import { DateType, Pageable, PageableInfo } from "@types";

declare module "@types" {
  type PostMutate = PostPut | PostCreate;
  interface PostListItemDTO {
    postId: number;
    title: string;
    author: AuthorDTO;
    views: number;
    category: CategoryDTO;
    createdAt: DateType;
    modifiedAt: DateType;
    hasAttachment: boolean;
    commentSize: number;
    pined: boolean;
  }

  interface CategoryDTO {
    categoryId: number;
    name: string;
  }

  interface AuthorDTO {
    userId: string | null;
    name: string;
    profileImageUrl: string | null;
    frameGradientStart: string | null;
    frameGradientEnd: string | null;
    badgeType: "CHECK" | "KUMOH_CROW" | null;
    badgeLabel: string | null;
  }

  interface PostListItem {
    postId: number;
    title: string;
    author: Author;
    views: number;
    category: CategoryDTO;
    createdDateTime: DateType;
    modifiedDateTime: DateType;
    hasAttachment: boolean;
    commentSize: number;
    pined: boolean;
    number: number; // 몇번째 게시글인지 보여주기 위한용도 다른 의미 없음
    trending?: boolean;
  }

  interface Author {
    userId: string | null;
    name: string;
    profileImageUrl: string | null;
    frameGradientStart: string | null;
    frameGradientEnd: string | null;
    badgeType: "CHECK" | "KUMOH_CROW" | null;
    badgeLabel: string | null;
  }

  interface PostDetatilCategory {
    categoryId: number;
    name: string;
  }

  interface FetchPostListResponse {
    content: PostListItemDTO[];
    pageable: Pageable;
    totalPages: number;
    totalElements: number;
    last: boolean;
    numberOfElements: number;
    size: number;
    number: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
    };
    first: boolean;
    empty: boolean;
  }

  interface FetchPostListParams {
    categoryId: number;
    page?: number;
    perPage?: number;
  }

  interface SearchPostParams {
    categoryId: number;
    searchOption: string;
    query: string;
    page?: number;
    perPage?: number;
  }

  interface Attachment {
    fileMetaDataId: number;
    originalFileName: string;
    storedFileName: string;
    url: string;
  }

  interface PostDetail {
    postId: number;
    title: string;
    author: Author;
    views: number;
    category: PostDetatilCategory;
    createdAt: DateType;
    modifiedAt: DateType;
    contents: string;
    isBookmarked: boolean;
    isEditable: boolean;
    exposeType: string;
    attachments: { fileMetaDataList: Attachment[] };
    isPined: boolean;
    likeCount: number;
    dislikeCount: number;
    myReaction: "LIKE" | "DISLIKE" | null;
  }

  interface exposeOptionDTO {
    name: string;
    password?: string;
  }

  interface PostPut {
    title: string;
    contents: string;
    categoryId: number;
    pined: boolean;
    exposeOption: exposeOptionDTO;
    attachmentIds: number[];
  }

  interface PostCreate {
    title: string;
    contents: string;
    categoryId: number;
    pined: boolean;
    exposeOption: exposeOptionDTO;
    attachmentIds: number[];
    anonymous: boolean;
    isSyncOldVersion: boolean;
  }

  interface PostCreateRes {
    id: number;
    message: string;
  }

  interface DeletedPost {
    postId: number;
    title: string;
    category: CategoryDTO;
    menu: {
      menuId: number;
      name: string;
      urlId: string;
    };
    author: Author;
    views: number;
    createdAt: DateType;
    modifiedAt: DateType;
    hasAttachment: boolean;
    exposeOption: string;
  }

  interface DeletedPostList extends PageableInfo {
    content: DeletedPost[];
  }
}
