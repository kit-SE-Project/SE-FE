import { Button, Center, Link, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  allDayLoginFromBrowser,
  allDayStartUrl,
  authorizeAllDay,
} from "@/api/allday";
import { clearStoredAuthTokens } from "@/api/storage";

export function AllDaySsoPage() {
  const navigate = useNavigate();
  const authorization = useRef<Promise<string | null> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!authorization.current) {
      authorization.current = (async () => {
        const login = allDayLoginFromBrowser();
        if (!login) throw new Error("Invalid AllDay login");
        try {
          return await authorizeAllDay(login);
        } catch (failure) {
          const result = failure as { code?: number; status?: number; response?: { status?: number } };
          if ([100, 102, 106, 107, 108, 137].includes(result?.code ?? 0) ||
              result?.status === 401 || result?.response?.status === 401) return null;
          throw failure;
        }
      })();
    }
    authorization.current.then((callback) => {
      if (!active) return;
      if (callback) window.location.replace(callback);
      else {
        clearStoredAuthTokens();
        navigate("/login?allday=1", { replace: true });
      }
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [navigate]);

  return (
    <Center minH="60vh" px={4}>
      <Stack spacing={4} textAlign="center">
        <Text role={error ? "alert" : "status"}>
          {error ? "서버 대여 로그인 요청을 확인할 수 없습니다." : "SE 게시판 로그인을 확인하고 있습니다."}
        </Text>
        {error && allDayStartUrl && <Button as={Link} href={allDayStartUrl}>다시 연결</Button>}
      </Stack>
    </Center>
  );
}
