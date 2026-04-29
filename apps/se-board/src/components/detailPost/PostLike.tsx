import { Button, Flex, Icon, Text } from "@chakra-ui/react";
import {
  AiFillDislike,
  AiFillLike,
  AiOutlineDislike,
  AiOutlineLike,
} from "react-icons/ai";

import { useLike } from "@/hooks/useLike";
import { openColors } from "@/styles";

interface PostLikeProps {
  postId: number;
  likeCount: number;
  dislikeCount: number;
  myReaction: "LIKE" | "DISLIKE" | null;
}

export const PostLike = ({
  postId,
  likeCount,
  dislikeCount,
  myReaction,
}: PostLikeProps) => {
  const {
    likeCount: currentLikeCount,
    dislikeCount: currentDislikeCount,
    myReaction: currentReaction,
    toggleLike,
    toggleDislike,
  } = useLike(postId, likeCount, dislikeCount, myReaction);

  return (
    <Flex justify="center" gap="12px" py="24px">
      <Button
        variant="outline"
        borderRadius="full"
        px="20px"
        borderColor={
          currentReaction === "LIKE" ? openColors.blue[5] : "gray.300"
        }
        color={currentReaction === "LIKE" ? openColors.blue[5] : "inherit"}
        onClick={toggleLike}
        leftIcon={
          <Icon
            as={currentReaction === "LIKE" ? AiFillLike : AiOutlineLike}
            boxSize="20px"
          />
        }
      >
        <Text fontWeight="bold">{currentLikeCount}</Text>
      </Button>

      <Button
        variant="outline"
        borderRadius="full"
        px="20px"
        borderColor={
          currentReaction === "DISLIKE" ? openColors.red[5] : "gray.300"
        }
        color={currentReaction === "DISLIKE" ? openColors.red[5] : "inherit"}
        onClick={toggleDislike}
        leftIcon={
          <Icon
            as={
              currentReaction === "DISLIKE" ? AiFillDislike : AiOutlineDislike
            }
            boxSize="20px"
          />
        }
      >
        <Text fontWeight="bold">{currentDislikeCount}</Text>
      </Button>
    </Flex>
  );
};
