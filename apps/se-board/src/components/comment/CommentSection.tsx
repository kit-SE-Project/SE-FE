import { Box, useColorModeValue, useToast } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Comment, CommentPaginationInfo } from "@types";
import { useEffect, useRef, useState } from "react";

import { useGetCommentQuery } from "@/react-query/hooks";
import { useBestCommentsQuery } from "@/react-query/hooks/useCommentQuery";

import { BestComments } from "./BestComments";
import { CommentContents } from "./CommentContents";
import { CommentHeader } from "./CommentHeader";
import { CommentInput } from "./CommentInput";
import { ShowMoreCommentButton } from "./ShowMoreCommentButton";
import { SkeletonComment } from "./SkeletonComment";

interface CommentSectionProps {
  postId: string | undefined;
  isPostRequestError: boolean;
  password?: string;
}

export const CommentSection = ({
  postId,
  isPostRequestError,
  password,
}: CommentSectionProps) => {
  const { data, isLoading, fetchNextPage, isFetchingNextPage } =
    useGetCommentQuery(isPostRequestError, postId, password);

  const { data: bestComments } = useBestCommentsQuery(postId);

  const queryClient = useQueryClient();
  const toast = useToast();

  const [comments, setComments] = useState<Comment[]>([]);
  const [pagenationInfo, setPagenationInfo] = useState<CommentPaginationInfo>();
  const targetCommentIdRef = useRef<number | null>(null);

  useEffect(() => {
    queryClient.invalidateQueries(["comments", postId]);
  }, []);

  useEffect(() => {
    if (!data) return;

    setPagenationInfo(data.pages[data.pages.length - 1].paginationInfo);
    setComments(data.pages.map((page) => page.content).flat());
  }, [data]);

  // 새 페이지 로드 후 target 댓글 DOM 탐색
  useEffect(() => {
    const targetId = targetCommentIdRef.current;
    if (targetId === null || isFetchingNextPage) return;

    const el = document.getElementById(`comment-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      targetCommentIdRef.current = null;
      return;
    }

    // 아직 못 찾았고 더 페이지가 있으면 계속 로드
    if (pagenationInfo && !pagenationInfo.last) {
      fetchNextPage();
    } else {
      // 모든 페이지 로드했는데도 없음
      toast({
        title: "댓글을 찾을 수 없습니다.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      targetCommentIdRef.current = null;
    }
  }, [comments, isFetchingNextPage]);

  const handleBestCommentClick = (commentId: number, pageNumber: number) => {
    const el = document.getElementById(`comment-${commentId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // DOM에 없으면 해당 페이지까지 로드
    targetCommentIdRef.current = commentId;

    const loadedPages = data?.pages.length ?? 0;
    if (pageNumber >= loadedPages) {
      toast({
        title: "댓글을 불러오는 중입니다...",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      fetchNextPage();
    } else {
      // 이미 로드된 페이지인데 DOM에 없는 경우 (대댓글 등)
      toast({
        title: "댓글을 찾을 수 없습니다.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      targetCommentIdRef.current = null;
    }
  };

  const color = useColorModeValue("gray.7", "whiteAlpha.700");
  const borderColor = useColorModeValue("gray.3", "whiteAlpha.400");

  return (
    <Box
      maxW="100%"
      mx="auto"
      borderBottom={`1px solid`}
      borderColor={borderColor}
      mb="100px"
      textAlign="center"
      color={color}
    >
      <CommentHeader commentTotalSize={pagenationInfo?.totalAllSize || 0} />
      <CommentInput />
      {bestComments && bestComments.length > 0 && (
        <BestComments
          bestComments={bestComments}
          onClickComment={handleBestCommentClick}
        />
      )}
      {isLoading ? (
        <SkeletonComment />
      ) : (
        <CommentContents comments={comments} />
      )}
      {!pagenationInfo?.last && (
        <ShowMoreCommentButton
          onClick={() => fetchNextPage()}
          isFetchingNextPage={isFetchingNextPage}
        />
      )}
    </Box>
  );
};
