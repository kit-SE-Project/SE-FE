import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChangePasswordRequestDTO,
  checkAuthCodeDTO,
  FormLoginResponse,
  LoginFormFileds,
  OAuthSignupDTO,
  SignupDTO,
} from "@types";
import { AxiosResponse } from "axios";
import { useNavigate } from "react-router-dom";
import { useResetRecoilState, useSetRecoilState } from "recoil";

import {
  changePassword,
  checkAuthCode,
  checkDuplicatedNicname,
  checkKumohmailAuthCode,
  convertLoginFormFiledsToLoginDTO,
  fetchOAUthUserBasicInfo,
  login,
  loginWithKakao,
  logout,
  oAuthSignup,
  reissueToken,
  requestEmailAuthCode,
  requestKumohmailAuthCode,
  signup,
} from "@/api/auth";
import { deleteFcmToken } from "@/api/fcm";
import { fetchUserSimpleInfo } from "@/api/profile";
import { getJWTHeader, isSessionAuthError, refreshStoredAccessToken } from "@/api/axiosInstance";
import {
  clearStoredAuthTokens,
  getStoredRefreshToken,
  isMaintainLogin,
  setStoredAccessToken,
  setStoredRefreshToken,
} from "@/api/storage";
import { useNavigatePage } from "@/hooks";
import { roleNames, userState } from "@/store/user";

import { queryKeys } from "../queryKeys";

export const useRequestEmailAuthCode = () => {
  return useMutation((email: string) => requestEmailAuthCode(email));
};

export const useSignup = () => {
  const navigate = useNavigate();

  const emailAuthCodeMutation = useMutation((email: string) =>
    requestEmailAuthCode(email)
  );

  const checkAuthCodeMutation = useMutation((data: checkAuthCodeDTO) =>
    checkAuthCode(data)
  );

  const checkDuplicatedNicnameMutation = useMutation((nicname: string) =>
    checkDuplicatedNicname(nicname)
  );

  const signupMutation = useMutation((data: SignupDTO) => signup(data), {
    onSuccess: () => {
      navigate("/signup/complete");
    },
  });

  const oAuthSignupMutation = useMutation(
    (data: OAuthSignupDTO) => oAuthSignup(data),
    {
      onSuccess: () => {
        navigate("/signup/complete");
      },
    }
  );

  return {
    emailAuthCodeMutation,
    checkAuthCodeMutation,
    signupMutation,
    oAuthSignupMutation,
    checkDuplicatedNicnameMutation,
  };
};

export const useFetchOAuthUserBasicInfo = (id: string) => {
  return useQuery(["oauthasd"], () => fetchOAUthUserBasicInfo(id), {
    onError: () => {
      window.alert("만료된 페이지 입니다.");
      window.location.href = "/login";
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useLogin = (maintainLogin = false, onAuthenticated?: () => void) => {
  const queryClient = useQueryClient();
  const setUserState = useSetRecoilState(userState);
  const { goToMainPage } = useNavigatePage();
  return useMutation<
    AxiosResponse<FormLoginResponse>,
    { code: number; message: string },
    LoginFormFileds
  >((data: LoginFormFileds) => login(convertLoginFormFiledsToLoginDTO(data)), {
    onSuccess: (res) => {
      if (maintainLogin) {
        setStoredAccessToken(res.data.accessToken, true);
        setStoredRefreshToken(res.data.refreshToken, true);
      } else {
        setStoredAccessToken(res.data.accessToken);
        setStoredRefreshToken(res.data.refreshToken);
      }

      fetchUserSimpleInfo().then((res) => {
        const { nickname, userId, email, roles } = res.data;
        setUserState((prev) => ({
          ...prev,
          nickname,
          userId,
          email,
          roles: roles.map((v) => roleNames[v as keyof typeof roleNames]),
        }));
      });

      if (onAuthenticated) onAuthenticated();
      else goToMainPage();
      queryClient.invalidateQueries([queryKeys.menuList]);
    },
  });
};

export const useKakaoLogin = async (id: string) => {
  const setUserState = useSetRecoilState(userState);
  const queryClient = useQueryClient();

  const { goToMainPage } = useNavigatePage();
  return loginWithKakao(id).then((res) => {
    setStoredRefreshToken(res.data.refreshToken);

    fetchUserSimpleInfo().then((res) => {
      const { nickname, userId, email, roles } = res.data;
      setUserState((prev) => ({
        ...prev,
        nickname,
        userId,
        email,
        roles: roles.map((v) => roleNames[v as keyof typeof roleNames]),
      }));
    });
    queryClient.invalidateQueries([queryKeys.menuList]);
    goToMainPage();
  });
};

export const useLogout = (options?: { returnToAllDay: boolean }) => {
  const resetUserState = useResetRecoilState(userState);
  const queryClient = useQueryClient();

  const { goToLoginPage } = useNavigatePage();
  return useMutation(["logout"], async () => {
    let refreshToken = getStoredRefreshToken();
    if (options?.returnToAllDay && !refreshToken) return null;
    try {
      if (options?.returnToAllDay && !getJWTHeader().Authorization) {
        await refreshStoredAccessToken();
        refreshToken = getStoredRefreshToken();
      }
      try { return await logout(refreshToken!, !!options?.returnToAllDay); }
      catch (failure) {
        const current = getStoredRefreshToken();
        if (!options?.returnToAllDay || !current || current === refreshToken) throw failure;
        // An automatic refresh may have rotated the token in the first request body.
        return await logout(current, true);
      }
    } catch (failure) {
      const result = failure as { status?: number; response?: { status?: number } };
      if (options?.returnToAllDay && (isSessionAuthError(failure) ||
          result?.status === 401 || result?.response?.status === 401)) return null;
      throw failure;
    }
  }, {
    onSuccess: (res) => {
      // 로그인 유지였던 경우 FCM 토큰 삭제
      if (isMaintainLogin()) deleteFcmToken().catch(() => {});

      clearStoredAuthTokens();
      queryClient.invalidateQueries([queryKeys.menuList]);
      resetUserState();
      if (options?.returnToAllDay) {
        if (res?.data.requiredRedirect) window.location.href = res.data.url;
        else window.location.replace("/allday/");
        return;
      }
      if (res?.data.requiredRedirect) window.location.href = res.data.url;
      goToLoginPage();
    },
  });
};

export const useReissueToken = () => {
  const setUserState = useSetRecoilState(userState);

  return useMutation(() => reissueToken("Bearer " + getStoredRefreshToken()!), {
    onSuccess: (res) => {
      setUserState((prev) => ({ ...prev, accessToken: res.data.accessToken }));
      if (isMaintainLogin()) {
        setStoredAccessToken(res.data.accessToken, true);
        setStoredRefreshToken(res.data.refreshToken, true);
      } else {
        setStoredAccessToken(res.data.accessToken);
        setStoredRefreshToken(res.data.refreshToken);
      }

      fetchUserSimpleInfo().then((res) => {
        const { nickname, userId, roles } = res.data;
        setUserState((prev) => ({
          ...prev,
          nickname,
          userId,
          roles: roles.map((v) => roleNames[v as keyof typeof roleNames]),
        }));
      });
    },
    onError: () => {
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("refresh_token");
      window.alert("로그인이 만료되었습니다.");
      window.location.href = "/";
    },
  });
};

export const useChangePassword = () => {
  return useMutation((data: ChangePasswordRequestDTO) => changePassword(data), {
    onSuccess: () => {},
    onError: () => {},
  });
};

export const useKumohCertification = () => {
  const emailAuthCodeMutation = useMutation((email: string) =>
    requestKumohmailAuthCode(email)
  );

  const checkAuthCodeMutation = useMutation(
    (data: checkAuthCodeDTO) => checkKumohmailAuthCode(data).then(),
    { onSuccess: () => {} }
  );

  return { emailAuthCodeMutation, checkAuthCodeMutation };
};
