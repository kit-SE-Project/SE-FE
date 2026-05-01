import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Center,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerProps,
  Flex,
  Icon,
  Link as ExternalLink,
  Text,
  useColorModeValue,
  useDisclosure,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { Menu } from "@types";
import { useEffect, useRef, useState } from "react";
import { BsBoxArrowUpRight, BsList } from "react-icons/bs";
import { NavLink } from "react-router-dom";
import { useRecoilValue } from "recoil";

import { GradientAvatar } from "@/components/common/GradientAvatar";
import { NotificationBell } from "@/components/notification/NotificationBell";
import { useNavigatePage, useWindowSize } from "@/hooks";
import { useLogout } from "@/react-query/hooks/auth";
import { mobileHeaderState } from "@/store/mobileHeaderState";
import { useUserState } from "@/store/user";

import { Logo } from "./Logo";

const NAV_ITEMS: readonly NavItemProps[] = [
  { name: "공지", path: "notice" },
  { name: "자유", path: "free-board" },
  { name: "아카이브", path: "archive" },
  { name: "지도교수 상담", path: "consulting" },
  { name: "팀모집", path: "recruitment" },
  { name: "프로젝트실 예약", path: "projectroom-reservation" },
  { name: "서버 대여", path: "server-rental" },
];

const DESKTOP_NAV_ITEMS: readonly NavItemProps[] = [
  ...NAV_ITEMS,
  {
    name: "학사",
    path: "https://cs.kumoh.ac.kr/cs/sub0601.do",
    isExternalSite: true,
  },
  {
    name: "채용",
    path: "https://cs.kumoh.ac.kr/cs/sub0602.do",
    isExternalSite: true,
  },
] as const;

export const DesktopHeaderNavigation = ({
  menuList = [],
}: {
  menuList: Menu[];
}) => {
  const [viewMode, setViewMode] = useState<"desktop" | "tablet">("desktop");
  const windowSize = useWindowSize();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { goToLoginPage, goToMyPage } = useNavigatePage();
  const { mutate: logout } = useLogout();
  const { userInfo, hasAuth } = useUserState();
  const navRef = useRef<any>();

  const headerBgColor = useColorModeValue("white", "gray.800");
  const color = useColorModeValue("gray.7", "whiteAlpha.800");

  useEffect(() => {
    if (!navRef.current) return;
    if (
      992 <= windowSize.width &&
      navRef.current.clientWidth === navRef.current.scrollWidth
    ) {
      setViewMode("desktop");
    } else {
      setViewMode("tablet");
    }
  }, [windowSize, navRef]);
  return (
    <Center
      bgColor={headerBgColor}
      as="header"
      position={{ base: "fixed", md: "relative" }}
      zIndex={10}
      w="full"
      borderBottomWidth={2}
    >
      <Flex
        maxW="container.xl"
        w="full"
        align="center"
        justify="space-between"
        px="1rem"
      >
        <Logo size="3.5rem" />
        <Box
          as="nav"
          display="flex"
          justifyContent="center"
          visibility={viewMode === "desktop" ? "visible" : "hidden"}
          w={992 <= windowSize.width ? "auto" : "0"}
          h={992 <= windowSize.width ? "auto" : "0"}
        >
          <Box
            ref={navRef}
            display="flex"
            rowGap="1rem"
            columnGap="2rem"
            overflowX="auto"
            px="1rem"
          >
            {menuList.map((menu) => (
              <DesktopNavItem key={menu.name} {...menu} />
            ))}
          </Box>
        </Box>

        {/* 오른쪽 컨트롤 영역 - 벨은 항상, 나머지는 viewMode에 따라 */}
        <Flex align="center" gap="0.5rem" flexShrink={0}>
          {hasAuth && <NotificationBell isLoggedIn={hasAuth} />}

          {/* 데스크탑: 아바타 + 로그아웃 / 로그인 */}
          {viewMode === "desktop" &&
            (hasAuth ? (
              <>
                <Button
                  onClick={goToMyPage}
                  variant="link"
                  color={color}
                  display="flex"
                  alignItems="center"
                  gap="0.5rem"
                >
                  <GradientAvatar
                    src={userInfo.profileImageUrl ?? undefined}
                    size="xs"
                    name={
                      userInfo.profileImageUrl ? undefined : userInfo.nickname
                    }
                    gradientStart={userInfo.frameGradientStart}
                    gradientEnd={userInfo.frameGradientEnd}
                    borderWidth={2}
                    gapWidth={1}
                    glow={false}
                  />
                  {userInfo.nickname}
                </Button>
                <Button
                  onClick={() => logout()}
                  variant="primary-outline"
                  rounded="full"
                >
                  로그아웃
                </Button>
              </>
            ) : (
              <Button
                onClick={goToLoginPage}
                variant="primary-outline"
                rounded="full"
              >
                로그인
              </Button>
            ))}

          {/* 태블릿/모바일: 햄버거 */}
          {viewMode === "tablet" && (
            <>
              <Button onClick={onOpen} variant="ghost" p="0">
                <Icon as={BsList} color={color} boxSize="2rem" />
              </Button>
              <DrawerNavigation
                isOpen={isOpen}
                onClose={onClose}
                menuList={menuList}
              />
            </>
          )}
        </Flex>
      </Flex>
    </Center>
  );
};

interface DrawerNavigationProps extends Omit<DrawerProps, "children"> {
  menuList: Menu[];
}

const DrawerNavigation = ({
  onClose,
  isOpen,
  menuList,
  ...props
}: DrawerNavigationProps) => {
  const { goToLoginPage, goToMyPage } = useNavigatePage();
  const { mutate: logout } = useLogout();
  const { userInfo, hasAuth } = useUserState();

  const color = useColorModeValue("gray.7", "whiteAlpha.800");

  return (
    <Drawer isOpen={isOpen} onClose={onClose} {...props}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        {/* 로그인 했을 때 DrawerHeader 보여주기 */}
        <DrawerHeader borderBottomWidth="1px">
          {hasAuth ? (
            <Flex
              onClick={() => {
                goToMyPage();
                onClose();
              }}
              alignItems="center"
              gap="1rem"
              _hover={{
                cursor: "pointer",
              }}
            >
              <GradientAvatar
                src={userInfo.profileImageUrl ?? undefined}
                name={userInfo.profileImageUrl ? undefined : userInfo.nickname}
                gradientStart={userInfo.frameGradientStart}
                gradientEnd={userInfo.frameGradientEnd}
                borderWidth={3}
                gapWidth={2}
              />
              <Text color={color}>{userInfo.nickname}</Text>
            </Flex>
          ) : (
            <Flex
              onClick={() => {
                goToLoginPage();
                onClose();
              }}
              alignItems="center"
              pl="1rem"
              _hover={{
                cursor: "pointer",
              }}
            >
              <Text fontSize="md" color="gray.6">
                로그인이 필요합니다
              </Text>
            </Flex>
          )}
        </DrawerHeader>
        <DrawerBody>
          <Wrap>
            {menuList.map((item, i) => (
              <DrawerNavItem key={i} {...item} onClick={onClose} />
            ))}
          </Wrap>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px">
          {hasAuth ? (
            <Button onClick={() => logout()} variant="primary" w="full">
              로그아웃
            </Button>
          ) : (
            <Button onClick={goToLoginPage} variant="primary" w="full">
              로그인
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export const HeaderNavigation = () => {
  const open = useRecoilValue(mobileHeaderState);

  const { goToLoginPage } = useNavigatePage();
  const { mutate: logout } = useLogout();
  const { userInfo, hasAuth } = useUserState();

  return (
    <Box display={open ? "block" : "none"}>
      <Flex
        align="center"
        justify="space-between"
        px={{ base: "0.5rem", md: "1rem" }}
        py="0.5rem"
      >
        <Logo size="3rem" />
        {hasAuth ? (
          <Button
            onClick={() => logout()}
            variant="primary-outline"
            rounded="full"
          >
            로그아웃
          </Button>
        ) : (
          <Button
            onClick={goToLoginPage}
            variant="primary-outline"
            rounded="full"
          >
            로그인
          </Button>
        )}
      </Flex>
      <Center as="nav" w="full" position="sticky" top="0" zIndex={10}>
        <Flex
          as="ul"
          gap="1.5rem"
          overflowX="auto"
          flexWrap="nowrap"
          w="full"
          px="0.75rem"
          borderY="1px"
          borderColor="primary"
          bgColor="primary"
        >
          {NAV_ITEMS.map((item, i) => (
            <NavItem key={item.name} {...item} />
          ))}
        </Flex>
      </Center>
    </Box>
  );
};

interface NavItemProps {
  name: string;
  path: string;
  isExternalSite?: boolean;
  onClick?: () => void;
}

const DesktopNavItem = ({ type, name, externalUrl, urlId, subMenu }: Menu) => {
  const color = useColorModeValue("gray.7", "whiteAlpha.800");

  switch (type) {
    case "MENU":
      // 하위메뉴가 없으면 렌더링 X
      if (subMenu.length === 0) return null;
      return (
        <WrapItem flexShrink={0} m="0px" fontSize="1.125rem" fontWeight="bold">
          <Text fontWeight="bold" color={color} position="relative" py="1rem">
            {name}
          </Text>
        </WrapItem>
      );
    case "BOARD":
      return (
        <WrapItem flexShrink={0} m="0px" fontSize="1.125rem" fontWeight="bold">
          <NavLink to={urlId}>
            {({ isActive }) => (
              <Text
                fontWeight="bold"
                color={isActive ? "primary" : color}
                position="relative"
                py="1rem"
                _before={
                  isActive
                    ? {
                        content: `""`,
                        position: "absolute",
                        display: "block",
                        w: "full",
                        h: "0.25rem",
                        roundedTopLeft: "0.25rem",
                        roundedTopRight: "0.25rem",
                        bgColor: "primary",
                        bottom: 0,
                      }
                    : {}
                }
              >
                {name}
              </Text>
            )}
          </NavLink>
        </WrapItem>
      );
    case "EXTERNAL":
      return (
        <WrapItem
          flexShrink={0}
          m="0px"
          fontSize="1.125rem"
          fontWeight="bold"
          color={color}
        >
          <ExternalLink
            href={externalUrl}
            target={
              process.env.REACT_APP_ENDPOINT &&
              externalUrl.startsWith(process.env.REACT_APP_ENDPOINT)
                ? "_self"
                : "_blank"
            }
            display="flex"
            alignItems="center"
            columnGap="0.25rem"
            isExternal
            _hover={{ textDecoration: "none" }}
          >
            <Text py="1rem">{name}</Text>
            <Icon as={BsBoxArrowUpRight} mb="0.25rem" boxSize="0.875rem" />
          </ExternalLink>
        </WrapItem>
      );
    default:
      return <></>;
  }

  // return (
  //   <WrapItem m="0px" fontSize="1.125rem" fontWeight="bold">
  //     {isExternalSite ? (
  //       <ExternalLink
  //         href={path}
  //         target="_blank"
  //         display="flex"
  //         alignItems="center"
  //         columnGap="0.25rem"
  //         isExternal
  //         _hover={{ textDecoration: "none" }}
  //       >
  //         <Text py="1rem">{name}</Text>
  //         <Icon as={BsBoxArrowUpRight} mb="0.25rem" boxSize="0.875rem" />
  //       </ExternalLink>
  //     ) : (
  //       <NavLink to={path}>
  //         {({ isActive }) => (
  //           <Text
  //             fontWeight="bold"
  //             color={isActive ? "primary" : "gray.7"}
  //             position="relative"
  //             py="1rem"
  //             _before={
  //               isActive
  //                 ? {
  //                     content: `""`,
  //                     position: "absolute",
  //                     display: "block",
  //                     w: "full",
  //                     h: "0.25rem",
  //                     roundedTopLeft: "0.25rem",
  //                     roundedTopRight: "0.25rem",
  //                     bgColor: "primary",
  //                     bottom: 0,
  //                   }
  //                 : {}
  //             }
  //           >
  //             {name}
  //           </Text>
  //         )}
  //       </NavLink>
  //     )}
  //   </WrapItem>
  // );
};

const DrawerNavItem = ({
  name,
  type,
  externalUrl,
  urlId,
  subMenu,
  onClick,
}: Menu & { onClick?: () => void }) => {
  const color = useColorModeValue("gray.7", "whiteAlpha.800");
  const hoverColor = useColorModeValue("gray.0", "whiteAlpha.200");

  switch (type) {
    case "MENU":
      if (subMenu.length === 0) return null;
      return (
        <Accordion defaultIndex={[0]} allowMultiple w="full">
          <AccordionItem w="full" border="none">
            <AccordionButton
              w="full"
              p="0"
              _hover={{ backgroundColor: "transparent" }}
            >
              <WrapItem
                w="full"
                m="0px"
                fontSize="1.125rem"
                fontWeight="bold"
                cursor="pointer"
              >
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  w="full"
                  p="1rem"
                  bgColor="transparent"
                  rounded="lg"
                  transition="background-color 0.2s"
                  _hover={{ bgColor: hoverColor }}
                >
                  <Text fontWeight="bold" color={color}>
                    {name}
                  </Text>
                  {/* <Icon as={BsCaretDownFill} /> */}
                  <AccordionIcon />
                </Box>
              </WrapItem>
            </AccordionButton>
            <AccordionPanel padding="0" pl="1rem">
              {subMenu.map((sub) => (
                <DrawerNavItem {...sub} />
              ))}
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      );
    case "BOARD":
      return (
        <WrapItem
          onClick={onClick}
          w="full"
          m="0px"
          fontSize="1.125rem"
          fontWeight="bold"
        >
          <NavLink to={urlId} style={{ width: "100%" }}>
            {({ isActive }) => (
              <Box
                w="full"
                p="1rem"
                bgColor={isActive ? "gray.1" : "transparent"}
                rounded="lg"
                transition="background-color 0.2s"
                _hover={{ bgColor: hoverColor }}
              >
                <Text fontWeight="bold" color={isActive ? "primary" : color}>
                  {name}
                </Text>
              </Box>
            )}
          </NavLink>
        </WrapItem>
      );
    case "EXTERNAL":
      return (
        <WrapItem
          onClick={onClick}
          w="full"
          m="0px"
          fontSize="1.125rem"
          fontWeight="bold"
          color={color}
        >
          <ExternalLink
            isExternal
            href={externalUrl}
            target={
              process.env.REACT_APP_ENDPOINT &&
              externalUrl.startsWith(process.env.REACT_APP_ENDPOINT)
                ? "_self"
                : "_blank"
            }
            w="full"
            _hover={{ textDecoration: "none" }}
          >
            <Box
              display="flex"
              alignItems="center"
              columnGap="0.25rem"
              w="full"
              p="1rem"
              rounded="lg"
              transition="background-color 0.2s"
              _hover={{ bgColor: hoverColor }}
            >
              <Text>{name}</Text>
              <Icon as={BsBoxArrowUpRight} mb="0.25rem" boxSize="0.875rem" />
            </Box>
          </ExternalLink>
        </WrapItem>
      );
    default:
      return <></>;
  }
};

const NavItem = ({ name, path }: NavItemProps) => {
  return (
    <WrapItem m={0}>
      <NavLink to={path}>
        {({ isActive }) => (
          <Text
            position="relative"
            py="0.75rem"
            whiteSpace="nowrap"
            fontWeight="bold"
            color="primary-content"
            opacity={isActive ? 1 : 0.5}
            _before={
              isActive
                ? {
                    content: `""`,
                    position: "absolute",
                    display: "block",
                    bottom: "1px",
                    w: "full",
                    h: "0.25rem",
                    roundedTopLeft: "0.25rem",
                    roundedTopRight: "0.25rem",
                    bgColor: "primary-content",
                    opacity: 0.6,
                  }
                : {}
            }
          >
            {name}
          </Text>
        )}
      </NavLink>
    </WrapItem>
  );
};
