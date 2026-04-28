import { atom, useRecoilState } from "recoil";

export const roleNames = {
  ROLE_KUMOH: "금오인",
};

export const userState = atom<{
  nickname: string;
  userId: number;
  email: string;
  roles: string[];
  profileImageUrl: string | null;
  frameGradientStart: string | null;
  frameGradientEnd: string | null;
}>({
  key: "userState",
  default: {
    nickname: "",
    email: "",
    userId: -1,
    roles: [],
    profileImageUrl: null,
    frameGradientStart: null,
    frameGradientEnd: null,
  },
});

export const useUserState = () => {
  const [user, setUser] = useRecoilState(userState);

  return {
    userInfo: user,
    hasAuth: user.userId !== -1,
  };
};
