import { Alert, AlertIcon, Button, Flex, GridItem, SimpleGrid, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useRecoilValue } from "recoil";

import { convertPostListItemDTOToPostListItem } from "@/api/post";
import { useMainPageMenu } from "@/react-query/hooks/useMainPage";
import { useFetchBanners } from "@/react-query/hooks/useMenu";
import { menuListState } from "@/store/menu";

import { BoardPreview, BoardPreviewSkeleton } from "./BoardPreview";
import { Carousel } from "./Carousel";
import { RecruitPreview } from "./RecruitPreview";

export const MainPage = () => {
  const { data, isLoading, isError, refetch } = useMainPageMenu();
  const { data: bannerResponse, isLoading: bannerLoading } = useFetchBanners();
  const menuList = useRecoilValue(menuListState);

  const recruitMenuAccessible = menuList.some(
    (menu) => menu.type === "RECRUIT" && menu.accessible !== false
  );
  return (
    <Stack
      alignItems="center"
      maxW={{ base: "100%", md: "1180px" }}
      w="full"
      px="1rem"
      py={{ base: "calc(56px + 1rem)", md: "1rem" }}
    >
      {isLoading && <Text role="status">게시판을 불러오고 있습니다.</Text>}
      {isError && <Alert status="error" borderRadius="md"><AlertIcon /><Stack><Text>게시판 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</Text><Button onClick={() => refetch()}>다시 불러오기</Button></Stack></Alert>}
      {bannerLoading ? (
        <Skeleton
          w={{ base: "full", md: "container.md" }}
          h={{ base: "8rem", sm: "9rem", md: "10rem", lg: "11rem" }}
        />
      ) : (
        bannerResponse?.length !== 0 && (
          <Flex
            w={{ base: "full", md: "container.md" }}
            h={{ base: "8rem", sm: "9rem", md: "10rem", lg: "11rem" }}
          >
            <Carousel banners={bannerResponse || []} />
          </Flex>
        )
      )}
      <Flex alignItems="center" w="full" mt="4rem">
        <SimpleGrid
          w="full"
          columns={{ base: 1, md: 2 }}
          spacingX="2rem"
          spacingY="4rem"
        >
          {isLoading && (
            <>
              <BoardPreviewSkeleton />
              <BoardPreviewSkeleton />
            </>
          )}

          {data?.map((menu, i) => (
            <GridItem
              key={menu.urlId}
              colSpan={{
                base: 1,
                md: i === data.length - 1 && data.length % 2 === 1 ? 2 : 1,
              }}
            >
              <BoardPreview
                menuName={menu.menuName}
                menuUrlId={menu.urlId}
                posts={menu.posts.content
                  .map((v) => convertPostListItemDTOToPostListItem(v))
                  .map((v) => ({ ...v, pined: false }))}
                trendingPosts={(menu.trendingPosts ?? [])
                  .map((v) => convertPostListItemDTOToPostListItem(v))
                  .map((v) => ({ ...v, trending: true }))}
              />
            </GridItem>
          ))}
          {recruitMenuAccessible && (
            <GridItem
              colSpan={{ base: 1, md: data && data.length % 2 === 0 ? 2 : 1 }}
            >
              <RecruitPreview />
            </GridItem>
          )}
        </SimpleGrid>
      </Flex>
    </Stack>
  );
};
