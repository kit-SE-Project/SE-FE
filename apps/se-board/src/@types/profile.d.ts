declare module "@types" {
  interface FrameInfo {
    frameId: number;
    name: string;
    description: string;
    gradientStart: string;
    gradientEnd: string;
    frameType: "TIER" | "EVENT" | "ADMIN";
  }

  interface MemberFrameInfo {
    memberFrameId: number;
    frame: FrameInfo;
    acquiredAt: string;
  }

  interface FetchUserSimpleInfoResponse {
    nickname: string;
    email: string;
    userId: number;
    roles: string[];
    profileImageUrl: string | null;
  }

  interface FetchUserProfileReqsponse {
    nickname: string;
    postCount: number;
    commentCount: number;
    bookmarkCount: number | null;
    profileImageUrl: string | null;
    tier: string | null;
    activityScore: number | null;
    equippedFrame: FrameInfo | null;
    badgeType: "CHECK" | "KUMOH_CROW" | null;
    badgeLabel: string | null;
  }
}
