import { Flex, Hide } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { useRecoilValue } from "recoil";

import { DesktopHeaderNavigation } from "@/components";
import {
  ColorModeButton,
  MobileColorModeButton,
} from "@/components/common/ColorModeButton";
import { useFcm } from "@/hooks/useFcm";
import { menuListState } from "@/store/menu";
import { useUserState } from "@/store/user";

export const MainLayout = () => {
  const MenuList = useRecoilValue(menuListState);
  const { hasAuth } = useUserState();
  useFcm(hasAuth);

  return (
    <>
      <DesktopHeaderNavigation menuList={MenuList} />
      <Flex justifyContent="center">
        <Outlet />
        <ColorModeButton />
        {/* 모바일 다크모드 버튼 */}
        <Hide above="md">
          <MobileColorModeButton />
        </Hide>
      </Flex>
    </>
  );
};
