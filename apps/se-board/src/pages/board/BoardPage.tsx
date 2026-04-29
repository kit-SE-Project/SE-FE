import {
  Button,
  Flex,
  Heading,
  Hide,
  Icon,
  Show,
  Skeleton,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import { PostListItemDTO } from "@types";
import { BsPencilFill } from "react-icons/bs";
import { useSearchParams } from "react-router-dom";

import { convertPostListItemDTOToPostListItem } from "@/api/post";
import { MobilePostPageBottonMenu } from "@/components";
import { useNavigatePage } from "@/hooks";
import { useMenu } from "@/hooks/useMenu";
import { usePostSearchParams } from "@/hooks/usePostSearchParams";
import { useFetchPostList } from "@/react-query/hooks/usePost";
import { useTrendingPostQuery } from "@/react-query/hooks/usePostQuery";

import { CategoryNavigation } from "./CategoryNavigation";
import { PostList } from "./PostList";
import { PostSearchForm } from "./PostSearchForm";
import { PostTable } from "./PostTable";

export const BoardPage = () => {
  const { goToWritePage } = useNavigatePage();
  const [searchParams] = useSearchParams();

  const { getCurrentMenu, getCurrentMenuId } = useMenu();
  const { page, searchOption, query } = usePostSearchParams();

  const currentMenuId = getCurrentMenuId();
  const currentMenu = getCurrentMenu();

  const isAllTab = !searchParams.has("category");

  const currentCategory = currentMenu?.subMenu?.find(
    (sub) => sub.menuId === currentMenuId
  );
  const popularPostEnabled = currentCategory?.popularPostEnabled ?? false;

  const trendingQueryId = isAllTab
    ? currentMenu?.menuId
    : popularPostEnabled
    ? currentMenuId
    : undefined;

  const { postList, totalItems, isLoading } = useFetchPostList({
    categoryId: currentMenuId!,
    page,
    perPage: 20,
    searchOption,
    query,
  });

  const { data: trendingData } = useTrendingPostQuery(trendingQueryId);

  const titleColor = useColorModeValue("gray.7", "whiteAlpha.800");
  const borderColor = useColorModeValue("gray.3", "whiteAlpha.400");

  const skeletonStartColor = useColorModeValue("gray.1", "whiteAlpha.50");
  const skeletonEndColor = useColorModeValue("gray.3", "whiteAlpha.100");

  const trendingPosts =
    trendingData?.map((item: PostListItemDTO) => ({
      ...convertPostListItemDTOToPostListItem(item),
      trending: true as const,
    })) ?? [];

  const pinedPosts = postList.filter((p) => p.pined);
  const pinedPostIds = new Set(pinedPosts.map((p) => p.postId));

  // 핀 글은 trending에서만 제외 (상단에 이미 표시되므로)
  const filteredTrendingPosts = trendingPosts.filter(
    (p) => !pinedPostIds.has(p.postId)
  );
  // 일반 게시글은 핀 글만 제외 (인기글은 중복 허용)
  const normalPosts = postList.filter((p) => !p.pined);

  const tableData = [...pinedPosts, ...filteredTrendingPosts, ...normalPosts];

  return (
    <>
      <Show above="md">
        <Stack alignItems="center" maxW="1180px" w="full" px="1rem" py="3rem">
          <Flex justifyContent="space-between" alignItems="center" w="full">
            <Heading fontSize="2xl" pl="1rem" color={titleColor}>
              {getCurrentMenu()?.name}
            </Heading>
            <PostSearchForm />
          </Flex>
          <Flex
            alignItems="center"
            justifyContent="space-between"
            w="full"
            py="0.5rem"
            borderY="1px"
            borderColor={borderColor}
            gap="5rem"
          >
            <CategoryNavigation categoryList={getCurrentMenu()?.subMenu!} />
            <Button
              onClick={goToWritePage}
              variant="primary"
              leftIcon={<Icon as={BsPencilFill} />}
            >
              글쓰기
            </Button>
          </Flex>

          {isLoading ? (
            <Stack w="full">
              {[...new Array(20)].map((_, i) => (
                <Skeleton
                  key={i}
                  height="2.5rem"
                  startColor={skeletonStartColor}
                  endColor={skeletonEndColor}
                />
              ))}
            </Stack>
          ) : postList.length === 0 ? (
            <Flex py="8rem" fontSize="1.25rem" fontWeight="bold" color="gray.5">
              게시물이 없습니다
            </Flex>
          ) : (
            <PostTable
              data={tableData}
              totalItems={totalItems}
              perPage={20}
              page={page}
            />
          )}
        </Stack>
      </Show>
      <Hide above="md">
        {isLoading ? (
          <Stack w="full" py="1rem" mt="56px">
            {[...new Array(20)].map((_, i) => (
              <Skeleton
                key={i}
                height="6rem"
                startColor={skeletonStartColor}
                endColor={skeletonEndColor}
              />
            ))}
          </Stack>
        ) : postList.length === 0 ? (
          <Flex
            h="calc(100vh - 56px)"
            alignItems="center"
            fontSize="1.25rem"
            fontWeight="bold"
            color="gray.5"
          >
            게시물이 없습니다
          </Flex>
        ) : (
          <PostList
            data={tableData}
            totalItems={totalItems}
            perPage={40}
            page={page}
          />
        )}
        <MobilePostPageBottonMenu categoryList={getCurrentMenu()?.subMenu!} />
      </Hide>
    </>
  );
};
