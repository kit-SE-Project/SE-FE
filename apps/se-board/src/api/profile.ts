import {
  FetchUserProfileReqsponse,
  FetchUserSimpleInfoResponse,
  MemberFrameInfo,
} from "@types";

import { HTTP_METHODS } from ".";
import { _axios, getJWTHeader } from "./axiosInstance";

export const fetchUserSimpleInfo = async () => {
  return _axios<FetchUserSimpleInfoResponse>({
    url: "mypage",
    method: HTTP_METHODS.GET,
    headers: getJWTHeader(),
  });
};

export const fetchUserProfile = async (userId: string) => {
  return _axios<FetchUserProfileReqsponse>({
    url: `profile/${userId}`,
    method: HTTP_METHODS.GET,
    headers: getJWTHeader(),
  });
};

export const updateUserProfile = async (data: { nickname: string }) => {
  return _axios({
    url: "mypage/info",
    method: HTTP_METHODS.PUT,
    headers: getJWTHeader(),
    data,
  });
};

export const uploadProfileImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return _axios<string>({
    url: "profile/image",
    method: HTTP_METHODS.PUT,
    headers: { ...getJWTHeader(), "Content-Type": "multipart/form-data" },
    data: formData,
  });
};

export const deleteProfileImage = async () => {
  return _axios({
    url: "profile/image",
    method: HTTP_METHODS.DELETE,
    headers: getJWTHeader(),
  });
};

export const fetchMyFrames = async () => {
  return _axios<MemberFrameInfo[]>({
    url: "profile/frames",
    method: HTTP_METHODS.GET,
    headers: getJWTHeader(),
  });
};

export const equipFrame = async (frameId: number) => {
  return _axios({
    url: `profile/frame/${frameId}`,
    method: HTTP_METHODS.PUT,
    headers: getJWTHeader(),
  });
};

export const unequipFrame = async () => {
  return _axios({
    url: "profile/frame",
    method: HTTP_METHODS.DELETE,
    headers: getJWTHeader(),
  });
};
