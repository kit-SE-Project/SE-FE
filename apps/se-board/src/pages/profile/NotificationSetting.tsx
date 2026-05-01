import {
  Box,
  Divider,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Switch,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

import {
  BoardMenu,
  fetchAvailableBoards,
  fetchSettings,
  fetchSubscribedBoards,
  NotificationType,
  subscribeBoard,
  unsubscribeBoard,
  updateSetting,
} from "@/api/notification";

const TYPE_LABELS: Partial<Record<NotificationType, string>> = {
  COMMENT: "내 게시글에 댓글",
  REPLY: "내 댓글에 대댓글",
  POST_LIKE: "내 게시글 좋아요",
  FRAME_ACQUIRED: "프레임 획득",
};

export const NotificationSettingPage = () => {
  const [settings, setSettings] = useState<Record<
    NotificationType,
    boolean
  > | null>(null);
  const [boards, setBoards] = useState<BoardMenu[]>([]);
  const [subscribedIds, setSubscribedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const bgColor = useColorModeValue("white", "gray.800");
  const titleColor = useColorModeValue("gray.700", "whiteAlpha.800");
  const sectionColor = useColorModeValue("gray.500", "whiteAlpha.600");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.400");

  useEffect(() => {
    Promise.all([
      fetchSettings(),
      fetchAvailableBoards(),
      fetchSubscribedBoards(),
    ])
      .then(([settingsRes, boardsRes, subscribedRes]) => {
        setSettings(settingsRes.data);
        setBoards(boardsRes.data);
        setSubscribedIds(new Set(subscribedRes.data));
      })
      .catch(() =>
        toast({
          title: "설정을 불러오지 못했습니다",
          status: "error",
          duration: 2000,
        })
      )
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggleType = async (type: NotificationType, enabled: boolean) => {
    setSettings((prev) => (prev ? { ...prev, [type]: enabled } : prev));
    try {
      await updateSetting(type, enabled);
    } catch {
      setSettings((prev) => (prev ? { ...prev, [type]: !enabled } : prev));
      toast({
        title: "설정 변경에 실패했습니다",
        status: "error",
        duration: 2000,
      });
    }
  };

  const handleToggleBoard = async (menuId: number, subscribed: boolean) => {
    setSubscribedIds((prev) => {
      const next = new Set(prev);
      subscribed ? next.add(menuId) : next.delete(menuId);
      return next;
    });
    try {
      if (subscribed) await subscribeBoard(menuId);
      else await unsubscribeBoard(menuId);
    } catch {
      setSubscribedIds((prev) => {
        const next = new Set(prev);
        subscribed ? next.delete(menuId) : next.add(menuId);
        return next;
      });
      toast({
        title: "설정 변경에 실패했습니다",
        status: "error",
        duration: 2000,
      });
    }
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <Text
      px="2rem"
      pt="1.25rem"
      pb="0.5rem"
      fontSize="xs"
      fontWeight="bold"
      color={sectionColor}
      textTransform="uppercase"
      letterSpacing="wider"
    >
      {label}
    </Text>
  );

  const SettingRow = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <Box>
      <Flex
        alignItems="center"
        justifyContent="space-between"
        w="full"
        py="0.875rem"
        px="2rem"
        color={titleColor}
      >
        <Text fontSize={{ base: "0.9375rem", sm: "1rem" }} fontWeight="medium">
          {label}
        </Text>
        <Switch
          size="md"
          isChecked={checked}
          onChange={(e) => onChange(e.target.checked)}
          colorScheme="blue"
        />
      </Flex>
      <Divider borderColor={borderColor} />
    </Box>
  );

  return (
    <Box
      position="relative"
      zIndex={0}
      w="full"
      minH={{ base: "100vh", md: "calc(100vh - 59px)" }}
      bg={useColorModeValue("gray.50", "#1A202C")}
    >
      <Flex
        direction="column"
        maxW={{ base: "full", md: "480px" }}
        minH={{ base: "100vh", md: "100%" }}
        w="full"
        pt={{ base: "56px", md: 0 }}
        marginX="auto"
        bgColor={bgColor}
      >
        <Heading
          fontSize={{ base: "1.125rem", md: "1.25rem" }}
          color={titleColor}
          py="0.875rem"
          textAlign="center"
        >
          알림 설정
        </Heading>
        <Divider borderColor={borderColor} />

        {isLoading ? (
          <Stack w="full" px="2rem" pt="1rem" spacing={4}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} height="44px" borderRadius="md" />
            ))}
          </Stack>
        ) : (
          <>
            {/* 알림 타입 설정 */}
            <SectionLabel label="알림 종류" />
            {(Object.keys(TYPE_LABELS) as NotificationType[]).map((type) => (
              <SettingRow
                key={type}
                label={TYPE_LABELS[type]!}
                checked={settings?.[type] ?? true}
                onChange={(v) => handleToggleType(type, v)}
              />
            ))}

            {/* 게시판 구독 */}
            <SectionLabel label="게시판 구독" />
            <Text px="2rem" pb="0.5rem" fontSize="xs" color={sectionColor}>
              새 글 알림을 받을 게시판을 선택하세요
            </Text>
            {boards.length === 0 ? (
              <Text px="2rem" py="1rem" fontSize="sm" color={sectionColor}>
                게시판이 없습니다
              </Text>
            ) : (
              boards.map((board) => (
                <SettingRow
                  key={board.menuId}
                  label={board.name}
                  checked={subscribedIds.has(board.menuId)}
                  onChange={(v) => handleToggleBoard(board.menuId, v)}
                />
              ))
            )}
          </>
        )}
      </Flex>
    </Box>
  );
};
