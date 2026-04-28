import { Box, Hide, Show } from "@chakra-ui/react";
import { ErrorCode, PostDetail } from "@types";
import { useEffect, useRef, useState } from "react";
import React from "react";
import { useParams } from "react-router-dom";

import { CommentSection } from "@/components/comment";
import {
  AttachmentFile,
  Content,
  DesktopHeader,
  Header,
  PostLike,
} from "@/components/detailPost";
import { useGetPostQuery, useSecretPostMutation } from "@/react-query/hooks";
import { useMobileHeaderState } from "@/store/mobileHeaderState";
import { errorHandle } from "@/utils/errorHandling";
import { convertPostInfo } from "@/utils/postUtils";

import { PageNotFound } from "./PageNotFound";
import { PWInput } from "./SecretPostPWInput";
import { SkeletonPostPage } from "./SkeletonPostPage";

export const PostPage = () => {
  const { postId } = useParams();

  const enabledRef = useRef<boolean>(true);

  const { data, isFetching, isError, error } = useGetPostQuery(
    postId,
    enabledRef.current
  );
  const { mutate, isLoading: secretIsLoading } = useSecretPostMutation();

  const [postData, setPostData] = useState<PostDetail>();
  const [password, setPassword] = useState<string>("");

  const { mobileHeaderOpen, mobileHeaderClose } = useMobileHeaderState();

  let postHeaderInfo = postData ? convertPostInfo(postData) : undefined;
  let attachemntFileData = postData
    ? postData.attachments.fileMetaDataList
    : undefined;
  let content = postData ? postData.contents : undefined;

  useEffect(() => {
    mobileHeaderClose();

    return () => mobileHeaderOpen();
  }, []);

  useEffect(() => {
    if (data) {
      setPostData(data);
    }
  }, [data]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate(
      { postId: Number(postId), password },
      {
        onSuccess: (data) => {
          setPostData(data);
        },
        onError: (error: unknown | ErrorCode) => {
          errorHandle(error);
        },
      }
    );
  };

  if (isError) {
    enabledRef.current = false;
    const { code, message } = error as { code: number; message: string };

    if (code === 113 && !postHeaderInfo) {
      return (
        <PWInput
          password={password}
          handleChange={(e) => setPassword(e.target.value)}
          onSubmit={onSubmit}
        />
      );
    } else if (code !== 113) {
      errorHandle(error);
    }
  }

  return postHeaderInfo ? (
    <Box maxW="984px" w="100%">
      <Show above="md">
        <Box pt="0rem">
          <DesktopHeader HeadingInfo={postHeaderInfo} />
        </Box>
      </Show>
      <Hide above="md">
        <Header HeadingInfo={postHeaderInfo} />
      </Hide>
      <AttachmentFile files={attachemntFileData || []} />

      <Content contents={content || "<p></p>"} />

      {postData && (
        <PostLike
          postId={postData.postId}
          likeCount={postData.likeCount ?? 0}
          dislikeCount={postData.dislikeCount ?? 0}
          myReaction={postData.myReaction ?? null}
        />
      )}

      <CommentSection
        postId={postId}
        isPostRequestError={!!postHeaderInfo}
        password={password || undefined}
      />
    </Box>
  ) : isFetching || secretIsLoading ? (
    <SkeletonPostPage />
  ) : (
    <PageNotFound />
  );
};
