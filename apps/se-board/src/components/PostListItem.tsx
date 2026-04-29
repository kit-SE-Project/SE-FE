import {
  Center,
  Flex,
  Heading,
  Icon,
  Link as ChakraLink,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { PostListItem as PostListItemInfo } from "@types";
import { BsLink45Deg } from "react-icons/bs";
import { PiFireFill } from "react-icons/pi";
import { Link } from "react-router-dom";

import { RoleBadge } from "@/components/common/RoleBadge";
import { NewIcon } from "@/components/NewIcon";
import { toYYMMDD_DOT } from "@/utils/dateUtils";
import {
  commentsSizeFormat,
  isRecentModifiedPost,
  isRecentPost,
} from "@/utils/postUtils";

import { UpdateIcon } from "./UpdateIcon";

interface PostListItemProps extends PostListItemInfo {
  ellipsisLine?: 0 | 1 | 2;
  menuUrlId?: string;
}

export const PostListItem = ({
  postId,
  title,
  author,
  views,
  category,
  createdDateTime,
  modifiedDateTime,
  hasAttachment,
  commentSize,
  pined,
  trending,
  ellipsisLine = 0,
  menuUrlId,
}: PostListItemProps) => {
  const titleColor = useColorModeValue("gray.7", "whiteAlpha.800");
  const subTitleColor = useColorModeValue("gray.7", "whiteAlpha.700");
  const commentBgColor = useColorModeValue("gray.1", "whiteAlpha.200");
  const hoverColor = useColorModeValue("gray.0", "whiteAlpha.200");

  return (
    <ChakraLink
      as={Link}
      to={menuUrlId ? `${menuUrlId}/${postId}` : `${postId}`}
      display="flex"
      alignItems="flex-start"
      px="1rem"
      py="0.5rem"
      _hover={{ bgColor: hoverColor, cursor: "pointer" }}
    >
      <Flex direction="column" gap="0.5rem" mr="2rem">
        <Heading
          as="h3"
          size="sm"
          noOfLines={ellipsisLine}
          fontWeight={pined ? "black" : "bold"}
          fontSize="sm"
          color={titleColor}
        >
          [{category.name}] {title}
        </Heading>
        <Flex
          alignItems="center"
          columnGap="0.375rem"
          fontSize="xs"
          flexWrap="wrap"
          color={subTitleColor}
        >
          <Flex alignItems="center" columnGap="0.375rem">
            <Text>{author.name}</Text>
            <RoleBadge
              badgeType={author.badgeType}
              badgeLabel={author.badgeLabel}
            />
            <Flex>
              <Text>{toYYMMDD_DOT(createdDateTime)}</Text>
              {/* {isModified(createdDateTime, modifiedDateTime) && (
                <Text>(수정됨)</Text>
              )} */}
            </Flex>
          </Flex>
          <Flex alignItems="center" columnGap="0.375rem">
            <Flex gap="0.125rem">
              <Text as="span">조회</Text>
              <Text as="span">{views}</Text>
            </Flex>

            {hasAttachment && <Icon as={BsLink45Deg} />}
            {isRecentPost(createdDateTime) ? (
              <NewIcon />
            ) : isRecentModifiedPost(createdDateTime, modifiedDateTime) ? (
              <UpdateIcon />
            ) : null}
            {trending && <Icon as={PiFireFill} color="orange.400" />}
          </Flex>
        </Flex>
      </Flex>
      <Center
        flexDirection="column"
        p="0.75rem"
        ml="auto"
        bgColor={commentBgColor}
        color={titleColor}
        rounded="xl"
        whiteSpace="nowrap"
        fontSize="xs"
        fontWeight="bold"
      >
        <Text>댓글</Text>
        <Text>{commentsSizeFormat(commentSize)}</Text>
      </Center>
    </ChakraLink>
  );
};
