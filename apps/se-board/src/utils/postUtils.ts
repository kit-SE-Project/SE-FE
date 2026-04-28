import { DateType, PostDetail, PostMutate } from "@types";
import dayjs from "dayjs";

import { isSameDateTime } from "./dateUtils";

export const commentsSizeFormat = (commentsSize: number, max = 99) => {
  return commentsSize > max ? max + "+" : commentsSize + "";
};

export const isModified = (
  createdDateTime: DateType,
  modifiedDateTime: DateType
) => !isSameDateTime(createdDateTime, modifiedDateTime);

export const isRecentModifiedPost = (
  createdDateTime: DateType,
  modifiedDateTime: DateType
) => {
  return (
    isModified(createdDateTime, modifiedDateTime) &&
    isRecentPost(modifiedDateTime)
  );
};

export const isRecentPost = (createdDateTime: DateType) => {
  const diff = Math.abs(dayjs(createdDateTime).diff(dayjs(), "hour"));

  return diff < 48;
};

export const isWritePostActive = (
  postData: PostMutate,
  isModified: boolean
) => {
  if (postData.title === "") {
    return "제목을 입력해주세요.";
  }

  if (postData.contents === "") {
    return "내용을 입력해주세요.";
  }

  if (postData.categoryId === -1) {
    return "카테고리를 선택해주세요.";
  }

  if (postData.exposeOption.name === "") {
    return "공개 설정을 선택해주세요.";
  }

  return null;
};

export const convertPostInfo = (post: PostDetail) => {
  const {
    postId,
    title,
    author,
    views,
    category,
    createdAt,
    modifiedAt,
    isBookmarked,
    isEditable,
  } = post;

  return {
    postId,
    title,
    author: {
      loginId: author.userId || "",
      name: author.name,
      profileImageUrl: author.profileImageUrl,
      frameGradientStart: author.frameGradientStart,
      frameGradientEnd: author.frameGradientEnd,
      badgeType: author.badgeType,
      badgeLabel: author.badgeLabel,
    },
    views,
    category: category.name,
    createdAt,
    modifiedAt,
    bookmarked: isBookmarked,
    isEditable,
  };
};

export const convertModifyPostData = (post: PostDetail | null) => {
  if (!post) {
    return {
      title: "",
      contents: "",
      categoryId: -1,
      pined: false,
      exposeOption: {
        name: "PUBLIC",
        password: "",
      },
      attachmentIds: Array<number>(),
    };
  }

  const { title, contents, category, isPined, exposeType, attachments } = post;

  return {
    title,
    contents,
    categoryId: category.categoryId,
    pined: isPined,
    exposeOption: {
      name: exposeType,
      password: "",
    },
    attachmentIds: attachments.fileMetaDataList.map((v) => v.fileMetaDataId),
  };
};

export const getExposeOptionName = (exposeOption: string) => {
  switch (exposeOption) {
    case "PUBLIC":
      return "전체";
    case "PRIVACY":
      return "비밀글";
    case "KUMOH":
      return "금오인";
    default:
      return "";
  }
};
