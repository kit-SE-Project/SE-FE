import { Pageable, PostListItemDTO } from "@types";

declare module "@types" {
  interface MainpageMenuInfo {
    posts: {
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
    };
    trendingPosts: PostListItemDTO[];
    menuName: string;
    urlId: string;
  }

  interface BannerDTO {
    fileMetaData: {
      fileMetaDataId: number;
      originalFileName: string;
      storedFileName: string;
      url: string;
    };
    bannerUrl: string;
  }
}
