import { Button, Center, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

import { cancelPendingAllDayLogin, consumeAllDayLogoutIntent } from "@/api/allday";
import { useLogout } from "@/react-query/hooks/auth";

export function AllDayLogoutPage() {
  const logout = useLogout({ returnToAllDay: true });
  const started = useRef(false);
  const signOut = () => {
    try { cancelPendingAllDayLogin(); } catch { /* Logout still works without storage. */ }
    logout.mutate();
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // A cross-site GET or a stale history entry must not log the board out.
    if (consumeAllDayLogoutIntent()) signOut();
    // The mutation is intentionally started once per explicit rental logout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Center minH="60vh" px={4}>
    <Stack spacing={4} textAlign="center">
      <Text role={logout.isError ? "alert" : "status"}>
        {logout.isError
          ? "서버 대여 세션은 종료됐지만 SE 게시판 로그아웃을 완료하지 못했습니다. 다시 시도해 주세요."
          : logout.isLoading
            ? "SE 게시판과 서버 대여에서 로그아웃하고 있습니다."
            : "SE 게시판에서도 로그아웃하면 다음 이용 시 직접 로그인해야 합니다."}
      </Text>
      {!logout.isLoading && <Button onClick={signOut}>
        {logout.isError ? "로그아웃 다시 시도" : "SE 게시판 로그아웃"}
      </Button>}
    </Stack>
  </Center>;
}
