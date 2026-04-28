import {
  Box,
  Divider,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { PostListItem as PostListItemInfo } from "@types";
import { Fragment } from "react";
import { useNavigate } from "react-router-dom";

import { PostListItem } from "@/components";

interface BoardPreviewProps {
  menuName: string;
  menuUrlId: string;
  posts: PostListItemInfo[];
  trendingPosts?: PostListItemInfo[];
}

export const BoardPreview = ({
  menuName,
  menuUrlId,
  posts,
  trendingPosts = [],
}: BoardPreviewProps) => {
  const navigate = useNavigate();
  const headingBgColor = useColorModeValue("gray.1", "whiteAlpha.200");
  const headingColor = useColorModeValue("blackAlpha.700", "whiteAlpha.700");
  const trendingAccentColor = useColorModeValue("orange.400", "orange.300");

  return (
    <Stack w="full">
      <Flex
        onClick={() => navigate(menuUrlId)}
        position="relative"
        alignItems="center"
        w="full"
        px={{ base: "1rem", md: "2rem" }}
        py={{ base: "1rem", md: "1.2rem" }}
        mb={{ base: "1rem" }}
        bgColor={headingBgColor}
        borderRadius="0.5rem"
        _hover={{ cursor: "pointer" }}
      >
        <Heading fontSize={{ base: "1.5rem", md: "2rem" }} color={headingColor}>
          {menuName}
        </Heading>
      </Flex>
      <Flex direction="column" w="full">
        {trendingPosts.length > 0 && (
          <Box mb="0.5rem">
            {trendingPosts.map((post, i) => (
              <Fragment key={post.postId}>
                <Box borderLeft="3px solid" borderColor={trendingAccentColor}>
                  <PostListItem
                    ellipsisLine={1}
                    menuUrlId={menuUrlId}
                    {...post}
                  />
                </Box>
                {i < trendingPosts.length - 1 && <Divider />}
              </Fragment>
            ))}
            <Divider />
          </Box>
        )}
        {posts.length === 0 ? (
          <EmptyPost />
        ) : (
          <>
            <Divider />
            {posts.map((post) => (
              <Fragment key={post.postId}>
                <PostListItem
                  ellipsisLine={2}
                  menuUrlId={menuUrlId}
                  {...post}
                />
                <Divider />
              </Fragment>
            ))}
          </>
        )}
      </Flex>
    </Stack>
  );
};

export const BoardPreviewSkeleton = () => {
  return (
    <Stack w="full">
      <Skeleton
        w="full"
        h="4.5rem"
        mb={{ base: "1rem", md: "2rem" }}
      ></Skeleton>
      <Skeleton w="full" h="5rem" />
      <Skeleton w="full" h="5rem" />
      <Skeleton w="full" h="5rem" />
      <Skeleton w="full" h="5rem" />
      <Skeleton w="full" h="5rem" />
    </Stack>
  );
};

const EmptyPost = () => {
  return (
    <Flex w="full" h="10rem" alignItems="center" justify="center">
      <Text>게시글이 없습니다</Text>
    </Flex>
  );
};
