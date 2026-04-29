import { Box, Flex, Icon, Text, useColorModeValue } from "@chakra-ui/react";
import { BestComment } from "@types";
import { AiFillLike } from "react-icons/ai";

const RANK_ACCENT = ["yellow.400", "gray.400", "orange.300"];

interface BestCommentsProps {
  bestComments: BestComment[];
  onClickComment: (commentId: number, pageNumber: number) => void;
}

export const BestComments = ({
  bestComments,
  onClickComment,
}: BestCommentsProps) => {
  const color = useColorModeValue("gray.7", "whiteAlpha.800");
  const borderColor = useColorModeValue("gray.3", "whiteAlpha.400");
  const metaColor = useColorModeValue("gray.5", "whiteAlpha.500");
  const bg = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const headerBg = useColorModeValue("gray.50", "whiteAlpha.50");

  if (bestComments.length === 0) return null;

  return (
    <Box borderTop="1px solid" borderColor={borderColor}>
      {/* 헤더 */}
      <Flex
        px="1rem"
        py="0.5rem"
        alignItems="center"
        gap="0.375rem"
        bgColor={headerBg}
        borderBottom="1px solid"
        borderColor={borderColor}
      >
        <Text
          fontSize="xs"
          fontWeight="700"
          color={metaColor}
          letterSpacing="0.05em"
        >
          BEST
        </Text>
      </Flex>

      {/* 댓글 목록 */}
      {bestComments.map((comment, idx) => (
        <Flex
          key={comment.commentId}
          bgColor={bg}
          borderBottom="1px solid"
          borderColor={borderColor}
          cursor="pointer"
          _hover={{ bgColor: hoverBg }}
          onClick={() => onClickComment(comment.commentId, comment.pageNumber)}
          overflow="hidden"
        >
          {/* 좌측 컬러 액센트 바 */}
          <Box w="3px" flexShrink={0} bgColor={RANK_ACCENT[idx]} />

          <Flex flex="1" px="14px" py="12px" gap="10px" alignItems="flex-start">
            {/* 순위 번호 */}
            <Text
              fontSize="xl"
              fontWeight="900"
              color={RANK_ACCENT[idx]}
              lineHeight="1.3"
              flexShrink={0}
              w="20px"
              textAlign="center"
            >
              {idx + 1}
            </Text>

            {/* 내용 */}
            <Box flex="1" minW={0}>
              <Text
                fontSize="sm"
                color={color}
                textAlign="left"
                noOfLines={2}
                lineHeight="1.6"
                whiteSpace="pre-line"
              >
                {comment.contents}
              </Text>
              <Flex alignItems="center" gap="0.5rem" mt="6px">
                <Text fontSize="xs" color={metaColor}>
                  {comment.author.name}
                </Text>
                {comment.isReply && (
                  <Text fontSize="xs" color={metaColor}>
                    · 대댓글
                  </Text>
                )}
                <Flex
                  alignItems="center"
                  gap="3px"
                  ml="auto"
                  color={RANK_ACCENT[idx]}
                >
                  <Icon as={AiFillLike} boxSize="12px" />
                  <Text fontSize="xs" fontWeight="700">
                    {comment.likeCount}
                  </Text>
                </Flex>
              </Flex>
            </Box>
          </Flex>
        </Flex>
      ))}
    </Box>
  );
};
