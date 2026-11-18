import { BannerDTO, MainpageMenuInfo } from "@types";

import { HTTP_METHODS } from ".";
import { _axios } from "./axiosInstance";

export const fetchMainPageMenu = async () => {
  return _axios<MainpageMenuInfo[]>({
    url: "/mainPage",
    method: HTTP_METHODS.GET,
    authMode: "public",
  });
};

export const fetchBanners = async () => {
  return _axios<BannerDTO[]>({
    url: "/banners",
    method: HTTP_METHODS.GET,
    authMode: "public",
  });
};
