import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Spinner,
  Stack,
  Tab,
  TabList,
  Tabs,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { BsBell, BsTrash, BsX } from "react-icons/bs";
import { useNavigate } from "react-router-dom";

import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  fetchUnreadCount,
  markAllAsRead,
  markAsRead,
  NotificationItem,
} from "@/api/notification";
import { useSse } from "@/hooks/useSse";

interface Props {
  isLoggedIn: boolean;
}

export const NotificationBell = ({ isLoggedIn }: Props) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const bgColor = useColorModeValue("white", "gray.800");
  const unreadBg = useColorModeValue("blue.50", "blue.900");
  const hoverBg = useColorModeValue("gray.50", "gray.700");

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const [notiRes, countRes] = await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
      setNotifications(notiRes.data.content);
      setUnreadCount(countRes.data.count);
    } catch {
      console.error();
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn) loadNotifications();
  }, [isLoggedIn]);

  useSse(isLoggedIn, (notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  });

  const displayed = showUnreadOnly
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const handleClick = async (noti: NotificationItem) => {
    if (!noti.isRead) {
      await markAsRead(noti.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === noti.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (noti.relatedId) navigate(`/posts/${noti.relatedId}`);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteNotification(id);
    const deleted = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (deleted && !deleted.isRead)
      setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleDeleteAll = async () => {
    await deleteAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
    toast({
      title: "전체 알림이 삭제됐습니다",
      status: "success",
      duration: 2000,
    });
  };

  if (!isLoggedIn) return null;

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Box position="relative" display="inline-flex">
          <IconButton
            aria-label="알림"
            icon={<BsBell size={20} />}
            variant="ghost"
            size="sm"
          />
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-1"
              right="-1"
              bg="red.500"
              color="white"
              borderRadius="full"
              fontSize="0.8rem"
              fontWeight="bold"
              minW="1.2rem"
              h="1.2rem"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="0 0 0 2px white"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>

      <PopoverContent w="360px" bgColor={bgColor}>
        <PopoverHeader p={0}>
          <Flex px={4} pt={3} pb={2} justify="space-between" align="center">
            <Text fontWeight="bold">알림</Text>
            <ButtonGroup size="xs" spacing={1}>
              {unreadCount > 0 && (
                <Button variant="ghost" onClick={handleMarkAllAsRead}>
                  모두 읽음
                </Button>
              )}
              {notifications.length > 0 && (
                <IconButton
                  aria-label="전체 삭제"
                  icon={<BsTrash />}
                  variant="ghost"
                  colorScheme="red"
                  onClick={handleDeleteAll}
                />
              )}
            </ButtonGroup>
          </Flex>
          <Tabs
            size="sm"
            index={showUnreadOnly ? 1 : 0}
            onChange={(i) => setShowUnreadOnly(i === 1)}
          >
            <TabList px={4}>
              <Tab>전체</Tab>
              <Tab>
                안읽음
                {unreadCount > 0 && (
                  <Badge
                    ml={1}
                    colorScheme="red"
                    borderRadius="full"
                    fontSize="0.55rem"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Tab>
            </TabList>
          </Tabs>
        </PopoverHeader>

        <PopoverBody p={0} maxH="380px" overflowY="auto">
          {isLoading ? (
            <Box textAlign="center" py={6}>
              <Spinner size="sm" />
            </Box>
          ) : displayed.length === 0 ? (
            <Text textAlign="center" py={6} color="gray.500" fontSize="sm">
              {showUnreadOnly ? "안읽은 알림이 없습니다" : "알림이 없습니다"}
            </Text>
          ) : (
            <Stack spacing={0} divider={<Divider />}>
              {displayed.map((noti) => (
                <Flex
                  key={noti.id}
                  px={4}
                  py={3}
                  cursor="pointer"
                  bg={noti.isRead ? undefined : unreadBg}
                  _hover={{ bg: hoverBg }}
                  onClick={() => handleClick(noti)}
                  align="center"
                  gap={2}
                >
                  <Box flex={1} minW={0}>
                    <Text
                      fontSize="sm"
                      fontWeight={noti.isRead ? "normal" : "bold"}
                      noOfLines={1}
                    >
                      {noti.title}
                    </Text>
                    <Text fontSize="xs" color="gray.500" noOfLines={1}>
                      {noti.content}
                    </Text>
                  </Box>
                  <IconButton
                    aria-label="삭제"
                    icon={<BsX />}
                    size="xs"
                    variant="ghost"
                    flexShrink={0}
                    onClick={(e) => handleDelete(e, noti.id)}
                  />
                </Flex>
              ))}
            </Stack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};
