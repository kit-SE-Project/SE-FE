import { Center, Flex, Heading, Icon, Text } from "@chakra-ui/react";
import { PostListItem as PostListItemInfo } from "@types";
import { BsFileZipFill, BsPinAngleFill } from "react-icons/bs";

import { toYYMMDD_DOT } from "@/utils/dateUtils";
import { commentsSizeFormat, isModified } from "@/utils/postUtils";

interface PostListItemProps extends PostListItemInfo {
  ellipsisLine?: 0 | 1 | 2;
}

export const PostListItem = ({
  postId,
  title,
  author,
  views,
  createdDateTime,
  modifiedDateTime,
  hasAttachment,
  commentsSize,
  pined,
  ellipsisLine = 0,
}: PostListItemProps) => {
  return (
    <Flex p="1rem" alignItems="flex-start">
      {pined && <Icon as={BsPinAngleFill} mr="0.5rem" color="primary" />}
      <Flex direction="column" gap="0.5rem" mr="2rem">
        <Heading
          as="h3"
          size="sm"
          noOfLines={ellipsisLine}
          fontWeight={pined ? "black" : "bold"}
          color={pined ? "primary" : "gray.7"}
        >
          {title}
        </Heading>
        <Flex
          alignItems="center"
          columnGap="0.75rem"
          fontSize="sm"
          flexWrap="wrap"
        >
          <Text>{author.name}</Text>
          <Flex>
            <Text>{toYYMMDD_DOT(createdDateTime)}</Text>
            {isModified(createdDateTime, modifiedDateTime) && (
              <Text>(수정됨)</Text>
            )}
          </Flex>
          <Flex gap="0.25rem">
            <Text as="span">조회</Text>
            <Text as="span">{views}</Text>
          </Flex>
          {hasAttachment && <Icon as={BsFileZipFill} />}
        </Flex>
      </Flex>
      <Center
        flexDirection="column"
        p="0.75rem"
        ml="auto"
        bgColor="gray.2"
        rounded="xl"
        whiteSpace="nowrap"
        fontSize="0.875rem"
        fontWeight="bold"
      >
        <Text>댓글</Text>
        <Text>{commentsSizeFormat(commentsSize)}</Text>
      </Center>
    </Flex>
  );
};
