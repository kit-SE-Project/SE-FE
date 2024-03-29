import { Box, Text } from "@chakra-ui/react";
import { IpInfo } from "@types";
import React, { useEffect, useState } from "react";

import {
  useDeleteBannedIpMutation,
  useGetBannedIpQuery,
  usePostBannedIpMutation,
} from "@/react-query/hooks";

import { ItemInput, ListContainer } from "..";

export const SpamIP = () => {
  const { data, refetch } = useGetBannedIpQuery();
  const { mutate: postMutate, isLoading: postIsLoading } =
    usePostBannedIpMutation();
  const { mutate: deleteMutate, isLoading: deleteIsLoading } =
    useDeleteBannedIpMutation();

  const [bannedIps, setBannedIps] = useState<IpInfo[]>([]);
  const [ip, setIp] = useState<string>("");

  useEffect(() => {
    if (!data) return;

    setBannedIps(data);
  }, [data]);

  const deleteOnClick = (ipAddress: string) => {
    deleteMutate(ipAddress, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const addOnClick = () => {
    postMutate(ip, {
      onSuccess: () => {
        setIp("");
        refetch();
      },
    });
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIp(e.target.value);
  };

  return (
    <Box my="16px">
      <Text fontSize={{ base: "md" }} fontWeight="semibold" mb="8px">
        스팸 IP 관리({bannedIps.length}개)
      </Text>
      <ListContainer
        data={bannedIps}
        deleteOnClick={deleteOnClick}
        isLoading={deleteIsLoading}
      />
      <ItemInput
        label="스팸 IP 추가"
        placeholder="스팸 IP 입력"
        value={ip}
        onChange={onChange}
        addOnClick={addOnClick}
        isLoading={postIsLoading}
      />
    </Box>
  );
};
