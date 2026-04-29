import { Flex, GridItem, SimpleGrid, Skeleton, Stack } from "@chakra-ui/react";

import { convertPostListItemDTOToPostListItem } from "@/api/post";
import { useMainPageMenu } from "@/react-query/hooks/useMainPage";
import { useFetchBanners } from "@/react-query/hooks/useMenu";

import { BoardPreview, BoardPreviewSkeleton } from "./BoardPreview";
import { Carousel } from "./Carousel";

export const MainPage = () => {
  const { data, isLoading } = useMainPageMenu();
  const { data: bannerResponse, isLoading: bannerLoading } = useFetchBanners();
  return (
    <Stack
      alignItems="center"
      maxW={{ base: "100%", md: "1180px" }}
      w="full"
      px="1rem"
      py={{ base: "calc(56px + 1rem)", md: "1rem" }}
    >
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
        </SimpleGrid>
      </Flex>
    </Stack>
  );
};
