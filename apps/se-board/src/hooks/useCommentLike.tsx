import { useToast } from "@chakra-ui/react";
import { useEffect, useState } from "react";

import {
  useDislikeCommentMutation,
  useLikeCommentMutation,
} from "@/react-query/hooks";
import { useUserState } from "@/store/user";

export const useCommentLike = (
  commentId: number,
  initialLikeCount: number,
  initialDislikeCount: number,
  initialMyReaction: "LIKE" | "DISLIKE" | null
) => {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [myReaction, setMyReaction] = useState(initialMyReaction);

  const { hasAuth } = useUserState();
  const { mutate: likeMutate } = useLikeCommentMutation();
  const { mutate: dislikeMutate } = useDislikeCommentMutation();
  const toast = useToast();

  useEffect(() => {
    setLikeCount(initialLikeCount);
    setDislikeCount(initialDislikeCount);
    setMyReaction(initialMyReaction);
  }, [initialLikeCount, initialDislikeCount, initialMyReaction]);

  const toggleLike = () => {
    if (!hasAuth) {
      toast({
        title: "로그인 후 추천 가능해요!",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    likeMutate(commentId, {
      onSuccess: () => {
        if (myReaction === "LIKE") {
          setLikeCount((prev) => prev - 1);
          setMyReaction(null);
        } else if (myReaction === "DISLIKE") {
          setDislikeCount((prev) => prev - 1);
          setLikeCount((prev) => prev + 1);
          setMyReaction("LIKE");
        } else {
          setLikeCount((prev) => prev + 1);
          setMyReaction("LIKE");
        }
      },
      onError: () => {
        toast({
          title: "추천에 실패했습니다.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      },
    });
  };

  const toggleDislike = () => {
    if (!hasAuth) {
      toast({
        title: "로그인 후 비추천 가능해요!",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    dislikeMutate(commentId, {
      onSuccess: () => {
        if (myReaction === "DISLIKE") {
          setDislikeCount((prev) => prev - 1);
          setMyReaction(null);
        } else if (myReaction === "LIKE") {
          setLikeCount((prev) => prev - 1);
          setDislikeCount((prev) => prev + 1);
          setMyReaction("DISLIKE");
        } else {
          setDislikeCount((prev) => prev + 1);
          setMyReaction("DISLIKE");
        }
      },
      onError: () => {
        toast({
          title: "비추천에 실패했습니다.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      },
    });
  };

  return { likeCount, dislikeCount, myReaction, toggleLike, toggleDislike };
};
