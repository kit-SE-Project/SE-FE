import {
  Button,
  Center,
  Divider,
  Flex,
  Link as ChakraLink,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSetRecoilState } from "recoil";

import { loginWithKakao } from "@/api/auth";
import { fetchUserSimpleInfo } from "@/api/profile";
import { setStoredAccessToken, setStoredRefreshToken } from "@/api/storage";
import { ReactComponent as KakaoSymbol } from "@/assets/images/kakao_symbol.svg";
import { Logo } from "@/components";
import { useNavigatePage } from "@/hooks";
import { roleNames, userState } from "@/store/user";

import { LoginForm } from "./LoginForm";

export const LoginPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { goToMainPage } = useNavigatePage();
  const setUserInfo = useSetRecoilState(userState);

  const bgColor = useColorModeValue("gray.0", "#1A202C");
  const cardBgColor = useColorModeValue("white", "whiteAlpha.50");
  const color = useColorModeValue("gray.7", "whiteAlpha.800");

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      loginWithKakao(id).then((res) => {
        setStoredRefreshToken(res.data.refreshToken);
        setStoredAccessToken(res.data.accessToken);
        fetchUserSimpleInfo().then((res) => {
          const { nickname, email, roles } = res.data;
          setUserInfo((prev) => ({
            ...prev,
            nickname,
            email,
            roles: roles.map((v) => roleNames[v as keyof typeof roleNames]),
          }));
        });
        goToMainPage();
      });
    }
  }, []);

  return (
    <Center w="full" h="100vh" bgColor={bgColor} color={color}>
      <Flex
        direction="column"
        alignItems="center"
        justifyContent="center"
        maxW={{ base: "full", md: "480px" }}
        minH={{ base: "full", md: "max-content" }}
        w="full"
        px={{ base: "1rem", md: "3rem" }}
        py="2rem"
        borderRadius={3}
        bgColor={cardBgColor}
      >
        <Logo size="64px" />
        <Flex w="full" pt="3rem" pb="2rem">
          <LoginForm />
        </Flex>
        <Flex fontSize="sm" gap="0.5rem" alignSelf="flex-end" mb="2rem">
          <Text>계정이 없으신가요?</Text>
          <Link to="/signup">
            <Button
              variant="link"
              fontSize="sm"
              fontWeight="bold"
              color="primary"
            >
              회원가입
            </Button>
          </Link>
        </Flex>
        <Divider />
        <Flex
          direction="column"
          alignItems="center"
          gap="1rem"
          w="full"
          mt="2rem"
        >
          <Text fontSize="sm">SNS계정으로 로그인 / 회원가입</Text>
          <Stack w="full">
            <ChakraLink
              href={`${process.env.REACT_APP_API_ENDPOINT}/oauth2/authorization/kakao`}
              _hover={{ textDecoration: "none" }}
            >
              <Flex
                px="1rem"
                h="40px"
                alignItems="center"
                justifyContent="space-between"
                bgColor="#FEE500"
                _hover={{ bgColor: "#FEE500" }}
                w="full"
                borderRadius="md"
              >
                <KakaoSymbol width="1.5rem" height="1.5rem" />
                <Text
                  color="#000000D9"
                  flexGrow="1"
                  fontWeight="semibold"
                  textAlign="center"
                >
                  카카오 로그인
                </Text>
              </Flex>
            </ChakraLink>
          </Stack>
        </Flex>
      </Flex>
    </Center>
  );
};
