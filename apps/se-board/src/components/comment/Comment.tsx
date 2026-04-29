import { Box, useColorModeValue } from "@chakra-ui/react";
import { Comment as CommentType } from "@types";
import { useRef, useState } from "react";

import { SubCommentInput } from ".";
import { CommentFormation } from "./CommentFormation";

interface CommentProps {
  comment: CommentType;
}

export const Comment = ({ comment }: CommentProps) => {
  const [isWriteState, setIsWriteState] = useState<number | null>(null);

  const subCommentAreaRef = useRef<HTMLTextAreaElement>(null);

  const color = useColorModeValue("gray.7", "whiteAlpha.800");
  const borderColor = useColorModeValue("gray.3", "whiteAlpha.400");

  return (
    <Box
      id={`comment-${comment.commentId}`}
      borderTop={`1px solid`}
      borderColor={borderColor}
      py={{ base: "0.0125rem", md: "0" }}
      color={color}
    >
      <CommentFormation comment={comment} setIsWriteState={setIsWriteState} />
      {comment.subComments.map((subComment) => (
        <Box
          key={subComment.commentId}
          id={`comment-${subComment.commentId}`}
          w="100%"
          pl={{
            base: "36px",
            md: "64px",
          }}
          borderTop={`1px solid`}
          borderColor={borderColor}
        >
          <CommentFormation
            comment={subComment}
            setIsWriteState={setIsWriteState}
            tag={comment.author.name}
          />
        </Box>
      ))}
      {isWriteState !== null && (
        <Box borderTop={`1px solid`} borderColor={borderColor} py="0.5rem">
          <SubCommentInput
            superCommentId={comment.commentId}
            tagCommentId={isWriteState}
            inputRef={subCommentAreaRef}
            setIsWriteState={setIsWriteState}
          />
        </Box>
      )}
    </Box>
  );
};
