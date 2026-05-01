import {
  Badge,
  Box,
  Button,
  Collapse,
  Flex,
  Icon,
  IconButton,
  Skeleton,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MemberFrameInfo } from "@types";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { IconType } from "react-icons";
import {
  BsBell,
  BsBookmark,
  BsCameraFill,
  BsChatLeftText,
  BsCheckLg,
  BsChevronDown,
  BsChevronRight,
  BsChevronUp,
  BsFileText,
  BsGem,
  BsKey,
  BsPencil,
  BsTrash,
} from "react-icons/bs";
import { useNavigate, useParams } from "react-router-dom";
import { useRecoilValue, useSetRecoilState } from "recoil";

import { GradientAvatar } from "@/components/common/GradientAvatar";
import { RoleBadge } from "@/components/common/RoleBadge";
import {
  useDeleteProfileImage,
  useEquipFrame,
  useFetchMyFrames,
  useFetchUserProfile,
  useUnequipFrame,
  useUploadProfileImage,
} from "@/react-query/hooks/useProfile";
import { userState } from "@/store/user";

import { PageNotFound } from "../PageNotFound";

export const ProfilePage = () => {
  const [isFrameVaultOpen, setIsFrameVaultOpen] = useState(false);
  const userInfo = useRecoilValue(userState);
  const setUserState = useSetRecoilState(userState);
  const { userId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const { data, isError, isLoading } = useFetchUserProfile(userId!);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadImage, isLoading: isUploading } = useUploadProfileImage(
    userId!
  );
  const { mutate: deleteImage, isLoading: isDeleting } = useDeleteProfileImage(
    userId!
  );
  const { data: myFrames } = useFetchMyFrames();
  const { mutate: equipFrameMutate } = useEquipFrame(userId!);
  const { mutate: unequipFrameMutate } = useUnequipFrame(userId!);

  const isMyProfile =
    userInfo.email === userId || userInfo.userId === Number(userId);

  // 내 프로필 조회 시 equippedFrame을 userState에 동기화
  useEffect(() => {
    if (isMyProfile && data) {
      setUserState((prev) => ({
        ...prev,
        frameGradientStart: data.equippedFrame?.gradientStart ?? null,
        frameGradientEnd: data.equippedFrame?.gradientEnd ?? null,
      }));
    }
  }, [isMyProfile, data, setUserState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage(file, {
      onError: () =>
        toast({ title: "이미지 업로드 실패", status: "error", duration: 3000 }),
    });
    e.target.value = "";
  };

  const handleDeleteImage = () => {
    deleteImage(undefined, {
      onSuccess: () =>
        toast({
          title: "프로필 이미지가 삭제되었습니다",
          status: "success",
          duration: 2000,
        }),
      onError: () =>
        toast({ title: "이미지 삭제 실패", status: "error", duration: 3000 }),
    });
  };

  const bgColor = useColorModeValue("gray.0", "#1A202C");
  const cardBgColor = useColorModeValue("white", "whiteAlpha.50");
  const titleColor = useColorModeValue("gray.7", "whiteAlpha.800");
  const subColor = useColorModeValue("gray.7", "whiteAlpha.800");
  const borderColor = useColorModeValue("gray.2", "whiteAlpha.400");
  const hoverBgColor = useColorModeValue("gray.50", "whiteAlpha.50");

  const onClickKumohCertification = () => {
    if (userInfo.roles.includes("금오인")) {
      toast({
        title: "이미 금오인 입니다",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } else {
      navigate("/profile/kumoh-certification");
    }
  };

  if (isError) return <PageNotFound />;

  return (
    <>
      <Flex
        justifyContent="center"
        position="relative"
        zIndex={0}
        w="full"
        minH={{ base: "100vh", md: "calc(100vh - 59px)" }}
        bg={bgColor}
      >
        <Flex
          direction="column"
          maxW="container.sm"
          w="full"
          pt={{ base: "calc(56px + 1rem)", md: "1rem" }}
          px={{ base: 0, md: "1rem" }}
        >
          {isLoading ? (
            <Flex w="full" direction="column">
              <Skeleton height="6rem" w="full" />
              <Stack mt="1rem" w="full">
                <Skeleton height="4rem" w="full" />
                <Skeleton height="4rem" w="full" />
                <Skeleton height="4rem" w="full" />
                <Skeleton height="4rem" w="full" />
                <Skeleton height="4rem" w="full" />
                <Skeleton height="4rem" w="full" />
              </Stack>
            </Flex>
          ) : (
            <>
              <Flex
                w="full"
                bg={cardBgColor}
                py="1rem"
                px="1rem"
                border="1px"
                borderColor={borderColor}
                borderRadius={3}
              >
                <Flex gap="1rem" alignItems="center">
                  <Box position="relative" display="inline-block">
                    <GradientAvatar
                      size="lg"
                      src={data?.profileImageUrl ?? undefined}
                      gradientStart={data?.equippedFrame?.gradientStart}
                      gradientEnd={data?.equippedFrame?.gradientEnd}
                      borderWidth={4}
                      gapWidth={2}
                      cursor={isMyProfile ? "pointer" : "default"}
                      onClick={() =>
                        isMyProfile && fileInputRef.current?.click()
                      }
                      opacity={isUploading ? 0.6 : 1}
                    />
                    {isMyProfile && (
                      <>
                        <Tooltip label="사진 변경" hasArrow>
                          <IconButton
                            aria-label="프로필 이미지 변경"
                            icon={<Icon as={BsCameraFill} boxSize="12px" />}
                            size="xs"
                            borderRadius="full"
                            position="absolute"
                            bottom="0"
                            right="0"
                            bgColor="gray.500"
                            color="white"
                            _hover={{ bgColor: "gray.600" }}
                            onClick={() => fileInputRef.current?.click()}
                            isLoading={isUploading}
                          />
                        </Tooltip>
                        {data?.profileImageUrl && (
                          <Tooltip label="사진 삭제" hasArrow>
                            <IconButton
                              aria-label="프로필 이미지 삭제"
                              icon={<Icon as={BsTrash} boxSize="10px" />}
                              size="xs"
                              borderRadius="full"
                              position="absolute"
                              top="0"
                              right="0"
                              bgColor="red.400"
                              color="white"
                              _hover={{ bgColor: "red.500" }}
                              onClick={handleDeleteImage}
                              isLoading={isDeleting}
                            />
                          </Tooltip>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleFileChange}
                        />
                      </>
                    )}
                  </Box>
                  <Flex direction="column">
                    <Flex alignItems="center" gap="0.5rem" flexWrap="wrap">
                      <Text
                        fontSize={{ base: "1.25rem", sm: "1.5rem" }}
                        fontWeight="bold"
                        color={titleColor}
                      >
                        {data?.nickname}
                      </Text>
                      <RoleBadge
                        badgeType={data?.badgeType}
                        badgeLabel={data?.badgeLabel}
                        size="md"
                      />
                      {isMyProfile && (
                        <Icon
                          onClick={() => navigate("/profile/edit")}
                          as={BsPencil}
                          boxSize={{ base: "0.875rem", sm: "1rem" }}
                          _hover={{ cursor: "pointer" }}
                        />
                      )}
                    </Flex>
                    {data?.activityScore != null && (
                      <Text color={subColor} fontSize="xs">
                        활동 점수: {data.activityScore}
                      </Text>
                    )}
                  </Flex>
                </Flex>
              </Flex>
              <Flex
                direction="column"
                mt="1rem"
                bg={cardBgColor}
                border="1px"
                borderColor={borderColor}
                borderRadius={3}
                _hover={{ cursor: "pointer" }}
              >
                {/* 작성한 글 */}
                <Flex
                  onClick={() => navigate("posts")}
                  alignItems="center"
                  w="full"
                  py="1rem"
                  px="1rem"
                  color={titleColor}
                >
                  <Icon
                    as={BsFileText}
                    boxSize={{ base: "1rem", sm: "1.25rem" }}
                    mr="1rem"
                  />
                  <Text
                    fontSize={{ base: "1rem", sm: "1.25rem" }}
                    fontWeight="bold"
                  >
                    작성한 글
                  </Text>
                  <Text
                    fontSize={{ base: "1rem", sm: "1.25rem" }}
                    fontWeight="bold"
                    color="primary"
                    ml="1rem"
                  >
                    {data?.postCount || 0}
                  </Text>
                  <Icon
                    as={BsChevronRight}
                    boxSize={{ base: "1rem", sm: "1.25rem" }}
                    ml="auto"
                  />
                </Flex>
                {/* 작성한 댓글 */}
                <Flex
                  onClick={() => navigate("comments")}
                  alignItems="center"
                  w="full"
                  py="1rem"
                  px="1rem"
                  color={titleColor}
                >
                  <Icon
                    as={BsChatLeftText}
                    boxSize={{ base: "1rem", sm: "1.25rem" }}
                    mr="1rem"
                  />
                  <Text
                    fontSize={{ base: "1rem", sm: "1.25rem" }}
                    fontWeight="bold"
                  >
                    작성한 댓글
                  </Text>
                  <Text
                    fontSize={{ base: "1rem", sm: "1.25rem" }}
                    fontWeight="bold"
                    color="primary"
                    ml="1rem"
                  >
                    {data?.commentCount || 0}
                  </Text>
                  <Icon
                    as={BsChevronRight}
                    boxSize={{ base: "1rem", sm: "1.25rem" }}
                    ml="auto"
                  />
                </Flex>
                {userInfo.userId === Number(userId) && (
                  <>
                    {/* 북마크 */}
                    <Flex
                      onClick={() => navigate("/profile/bookmark")}
                      alignItems="center"
                      w="full"
                      py="1rem"
                      px="1rem"
                      color={titleColor}
                    >
                      <Icon
                        as={BsBookmark}
                        boxSize={{ base: "1rem", sm: "1.25rem" }}
                        mr="1rem"
                      />
                      <Text
                        fontSize={{ base: "1rem", sm: "1.25rem" }}
                        fontWeight="bold"
                      >
                        북마크
                      </Text>
                      <Text
                        fontSize={{ base: "1rem", sm: "1.25rem" }}
                        fontWeight="bold"
                        color="primary"
                        ml="1rem"
                      >
                        {data?.bookmarkCount || 0}
                      </Text>
                      <Icon
                        as={BsChevronRight}
                        boxSize={{ base: "1rem", sm: "1.25rem" }}
                        ml="auto"
                      />
                    </Flex>
                    {/* 프레임 보관함 */}
                    <Box
                      w="full"
                      color={titleColor}
                      borderTop="1px"
                      borderColor={borderColor}
                    >
                      <Flex
                        alignItems="center"
                        w="full"
                        py="1rem"
                        px="1rem"
                        cursor="pointer"
                        onClick={() => setIsFrameVaultOpen((v) => !v)}
                        _hover={{ bg: hoverBgColor }}
                      >
                        <Icon
                          as={BsGem}
                          boxSize={{ base: "1rem", sm: "1.25rem" }}
                          mr="1rem"
                        />
                        <Text
                          fontSize={{ base: "1rem", sm: "1.25rem" }}
                          fontWeight="bold"
                        >
                          프레임 보관함
                        </Text>
                        {data?.equippedFrame && !isFrameVaultOpen && (
                          <Box
                            ml="0.5rem"
                            w="16px"
                            h="16px"
                            borderRadius="full"
                            background={`linear-gradient(135deg, ${data.equippedFrame.gradientStart}, ${data.equippedFrame.gradientEnd})`}
                            flexShrink={0}
                          />
                        )}
                        <Icon
                          as={isFrameVaultOpen ? BsChevronUp : BsChevronDown}
                          boxSize={{ base: "1rem", sm: "1.25rem" }}
                          ml="auto"
                        />
                      </Flex>
                      <Collapse in={isFrameVaultOpen} animateOpacity>
                        <Box px="1rem" pt={"1rem"} pb="1rem">
                          {myFrames && myFrames.length > 0 ? (
                            <Flex gap="0.75rem" flexWrap="wrap">
                              {myFrames.map((mf) => (
                                <FrameCard
                                  key={mf.memberFrameId}
                                  memberFrame={mf}
                                  isEquipped={
                                    data?.equippedFrame?.frameId ===
                                    mf.frame.frameId
                                  }
                                  onEquip={() =>
                                    equipFrameMutate({
                                      frameId: mf.frame.frameId,
                                      gradientStart: mf.frame.gradientStart,
                                      gradientEnd: mf.frame.gradientEnd,
                                    })
                                  }
                                  onUnequip={() => unequipFrameMutate()}
                                />
                              ))}
                            </Flex>
                          ) : (
                            <Text fontSize="sm" color="gray.5">
                              아직 획득한 프레임이 없어요. 활동 점수를 쌓아
                              티어를 올리면 프레임을 획득할 수 있어요!
                            </Text>
                          )}
                        </Box>
                      </Collapse>
                    </Box>
                    {/* 알림 설정 */}
                    <Flex
                      onClick={() => navigate("/profile/notification/setting")}
                      alignItems="center"
                      w="full"
                      py="1rem"
                      px="1rem"
                      color={titleColor}
                    >
                      <Icon
                        as={BsBell}
                        boxSize={{ base: "1rem", sm: "1.25rem" }}
                        mr="1rem"
                      />
                      <Text
                        fontSize={{ base: "1rem", sm: "1.25rem" }}
                        fontWeight="bold"
                      >
                        알림 설정
                      </Text>
                      <Icon
                        as={BsChevronRight}
                        boxSize={{ base: "1rem", sm: "1.25rem" }}
                        ml="auto"
                      />
                    </Flex>
                    {/* 비밀번호 변경 */}
                    <Flex
                      onClick={() => navigate("/profile/password/edit")}
                      alignItems="center"
                      w="full"
                      py="1rem"
                      px="1rem"
                      color={titleColor}
                    >
                      <Icon
                        as={BsKey}
                        boxSize={{ base: "1rem", sm: "1.25rem" }}
                        mr="1rem"
                      />
                      <Text
                        fontSize={{ base: "1rem", sm: "1.25rem" }}
                        fontWeight="bold"
                      >
                        비밀번호 변경
                      </Text>
                      <Icon
                        as={BsChevronRight}
                        boxSize={{ base: "1rem", sm: "1.25rem" }}
                        ml="auto"
                      />
                    </Flex>
                    {/* 금오인 인증 */}
                    <Flex
                      onClick={onClickKumohCertification}
                      alignItems="center"
                      w="full"
                      py="1rem"
                      px="1rem"
                      color={titleColor}
                    >
                      <Icon
                        as={BsCheckLg}
                        boxSize={{ base: "1rem", sm: "1.25rem" }}
                        mr="1rem"
                      />
                      <Text
                        fontSize={{ base: "1rem", sm: "1.25rem" }}
                        fontWeight="bold"
                      >
                        금오인 인증
                      </Text>
                      <Icon
                        as={BsChevronRight}
                        boxSize={{ base: "1rem", sm: "1.25rem" }}
                        ml="auto"
                      />
                    </Flex>
                  </>
                )}
              </Flex>
              {isMyProfile && (
                <Button
                  onClick={() => navigate("/profile/withdrawal")}
                  variant="link"
                  w="max"
                  p="1rem"
                  fontSize="14px"
                  fontWeight="normal"
                >
                  회원탈퇴
                </Button>
              )}
            </>
          )}
        </Flex>
      </Flex>
    </>
  );
};

const Menu = ({
  icon,
  title,
  onClick,
  rightElement,
}: {
  icon: IconType;
  title: string;
  onClick: () => void;
  rightElement?: ReactNode;
}) => {
  return (
    <Flex
      onClick={onClick}
      alignItems="center"
      w="full"
      py="1rem"
      px="1rem"
      color="gray.7"
    >
      <Icon as={icon} boxSize={{ base: "1rem", sm: "1.25rem" }} mr="1rem" />
      <Text fontSize={{ base: "1rem", sm: "1.25rem" }} fontWeight="bold">
        {title}
      </Text>
      {rightElement}
      <Icon
        as={BsChevronRight}
        boxSize={{ base: "1rem", sm: "1.25rem" }}
        ml="auto"
      />
    </Flex>
  );
};

const FrameCard = ({
  memberFrame,
  isEquipped,
  onEquip,
  onUnequip,
}: {
  memberFrame: MemberFrameInfo;
  isEquipped: boolean;
  onEquip: () => void;
  onUnequip: () => void;
}) => {
  const { frame } = memberFrame;
  const borderColor = useColorModeValue("gray.2", "whiteAlpha.300");

  return (
    <Flex
      direction="column"
      alignItems="center"
      gap="0.5rem"
      p="0.75rem"
      border="1px"
      borderColor={isEquipped ? "blue.400" : borderColor}
      borderRadius="md"
      minW="80px"
      cursor="pointer"
      onClick={isEquipped ? onUnequip : onEquip}
      position="relative"
    >
      {isEquipped && (
        <Badge
          colorScheme="blue"
          position="absolute"
          top="-8px"
          fontSize="0.6rem"
          borderRadius="full"
          px="0.4rem"
        >
          장착중
        </Badge>
      )}
      <Box
        w="40px"
        h="40px"
        borderRadius="full"
        background={`linear-gradient(135deg, ${frame.gradientStart}, ${frame.gradientEnd})`}
      />
      <Text fontSize="xs" fontWeight="bold" textAlign="center" noOfLines={2}>
        {frame.name}
      </Text>
    </Flex>
  );
};
