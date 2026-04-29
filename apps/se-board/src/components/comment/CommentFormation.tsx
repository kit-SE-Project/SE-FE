import {
  Box,
  Button,
  Flex,
  Icon,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  SimpleGrid,
  Text,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { CommentContent } from "@types";
import React, { useRef, useState } from "react";
import {
  AiFillDislike,
  AiFillLike,
  AiOutlineDislike,
  AiOutlineLike,
} from "react-icons/ai";
import { BsArrowReturnRight, BsAt } from "react-icons/bs";

import { GradientAvatar } from "@/components/common/GradientAvatar";
import { RoleBadge } from "@/components/common/RoleBadge";
import { useNavigatePage } from "@/hooks";
import { useCommentLike } from "@/hooks/useCommentLike";
import { openColors } from "@/styles";
import { isModifiedContent, toYYYYMMDDHHhh } from "@/utils/dateUtils";

import { CommentMoreButton } from "../detailPost";
import { CommentModifyInput } from "./CommentInput";

interface CommentFormationProps {
  comment: CommentContent;
  setIsWriteState: React.Dispatch<React.SetStateAction<number | null>>;
  tag?: string;
}

export const CommentFormation = ({
  comment,
  setIsWriteState,
  tag,
}: CommentFormationProps) => {
  const [isModify, setIsModify] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const commentModifyAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
    onOpen();
  };

  const hoverColor = useColorModeValue("gray.0", "whiteAlpha.200");

  const { likeCount, dislikeCount, myReaction, toggleLike, toggleDislike } =
    useCommentLike(
      comment.commentId,
      comment.likeCount,
      comment.dislikeCount,
      comment.myReaction
    );

  return (
    <Box w="100%" p="16px">
      {!isModify ? (
        <>
          <Box display="flex" justifyContent="space-between">
            <AuthorInfoMenuList
              name={comment.author.name}
              authorId={comment.author.userId}
              profileImageUrl={comment.author.profileImageUrl}
              frameGradientStart={comment.author.frameGradientStart}
              frameGradientEnd={comment.author.frameGradientEnd}
              badgeType={comment.author.badgeType}
              badgeLabel={comment.author.badgeLabel}
            />
            <Box w="fit-content">
              {comment.isActive && (
                <CommentMoreButton
                  isEditable={comment.isEditable}
                  setIsModify={setIsModify}
                  commentId={comment.commentId}
                  isReply={tag ? true : false}
                />
              )}
            </Box>
          </Box>
          <Box display="inline-block" w="100%" mt="8px">
            {tag && (
              <Box
                display="flex"
                alignItems="center"
                textAlign="center"
                w="fit-content"
                h="fit-content"
                mr="6px"
                mb="-2px"
                p="1px 4px"
                bgColor="blue.1"
                color="blue.7"
                borderRadius="10px"
                float="left"
              >
                <BsAt fontSize="18px" />
                <Text whiteSpace="nowrap">{tag}</Text>
              </Box>
            )}
            <Text mb="-2px" textAlign="left" maxW="850px" whiteSpace="pre-line">
              {comment.contents}
            </Text>
          </Box>
          <Text
            textAlign="left"
            fontSize={{ base: "sm" }}
            fontWeight="400"
            mt="2px"
          >
            {toYYYYMMDDHHhh(comment.createdAt)}
            {isModifiedContent(comment.createdAt, comment.modifiedAt) && (
              <Text as="span" ml="0.25rem" color="gray.6">
                (수정됨)
              </Text>
            )}
          </Text>
          {comment.attachments && comment.attachments.length > 0 && (
            <SimpleGrid
              columns={Math.min(comment.attachments.length, 4)}
              gap="8px"
              mt="10px"
            >
              {comment.attachments.map((att) => (
                <Image
                  key={att.fileMetaDataId}
                  src={att.url}
                  alt={att.originalFileName}
                  w="100%"
                  h="100px"
                  objectFit="cover"
                  borderRadius="6px"
                  cursor="pointer"
                  onClick={() => handleImageClick(att.url)}
                  _hover={{ opacity: 0.85 }}
                />
              ))}
            </SimpleGrid>
          )}

          <Flex alignItems="center" mt="8px" gap="6px">
            <Button
              size="xs"
              variant="ghost"
              px="6px"
              color={myReaction === "LIKE" ? openColors.blue[5] : "gray.500"}
              leftIcon={
                <Icon
                  as={myReaction === "LIKE" ? AiFillLike : AiOutlineLike}
                  boxSize="14px"
                />
              }
              onClick={toggleLike}
            >
              {likeCount}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              px="6px"
              color={myReaction === "DISLIKE" ? openColors.red[5] : "gray.500"}
              leftIcon={
                <Icon
                  as={
                    myReaction === "DISLIKE" ? AiFillDislike : AiOutlineDislike
                  }
                  boxSize="14px"
                />
              }
              onClick={toggleDislike}
            >
              {dislikeCount}
            </Button>
            {comment.isActive && (
              <Button
                size="sm"
                p="0"
                ml="4px"
                leftIcon={<BsArrowReturnRight />}
                variant="ghost"
                color="gray.6"
                _hover={{ bgColor: hoverColor, color: "gray.7" }}
                onClick={() => setIsWriteState(comment.commentId)}
              >
                답글 작성
              </Button>
            )}
          </Flex>
        </>
      ) : (
        <CommentModifyInput
          commentId={comment.commentId}
          commentContent={comment.contents}
          existingAttachments={comment.attachments ?? []}
          isComment={tag ? false : true}
          setIsModify={setIsModify}
          inputRef={commentModifyAreaRef}
        />
      )}

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
        <ModalOverlay />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton color="white" />
          <ModalBody p={0} display="flex" justifyContent="center">
            {selectedImage && (
              <Image
                src={selectedImage}
                maxH="80vh"
                maxW="100%"
                objectFit="contain"
                borderRadius="8px"
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

const AuthorInfoMenuList = ({
  name,
  authorId,
  profileImageUrl,
  frameGradientStart,
  frameGradientEnd,
  badgeType,
  badgeLabel,
}: {
  name: string;
  authorId: string | null;
  profileImageUrl?: string | null;
  frameGradientStart?: string | null;
  frameGradientEnd?: string | null;
  badgeType?: "CHECK" | "KUMOH_CROW" | null;
  badgeLabel?: string | null;
}) => {
  const { goToProfilePage } = useNavigatePage();

  return (
    <Menu autoSelect={false}>
      <MenuButton cursor={!authorId ? "not-allowed" : "pointer"}>
        <Box display="flex" alignItems="center" w="fit-content">
          <GradientAvatar
            src={profileImageUrl ?? undefined}
            size="sm"
            name={profileImageUrl ? undefined : name}
            gradientStart={frameGradientStart}
            gradientEnd={frameGradientEnd}
            borderWidth={2}
            gapWidth={1}
          />
          <Text px="10px" fontSize="lg" fontWeight="600" whiteSpace="nowrap">
            {name}
          </Text>
          <RoleBadge badgeType={badgeType} badgeLabel={badgeLabel} />
        </Box>
      </MenuButton>
      {!!authorId && (
        <MenuList>
          <MenuItem onClick={() => goToProfilePage(authorId)}>
            프로필 보기
          </MenuItem>
        </MenuList>
      )}
    </Menu>
  );
};
