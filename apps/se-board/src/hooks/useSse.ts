import { useEffect, useRef } from "react";

import { NotificationItem } from "@/api/notification";
import { getStoredAccessToken } from "@/api/storage";

const ALARM_ENDPOINT = process.env.REACT_APP_ALARM_ENDPOINT ?? "";

export const useSse = (
  isLoggedIn: boolean,
  onNotification: (notification: NotificationItem) => void
) => {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    const connect = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = getStoredAccessToken();
        console.log("[SSE] token:", token ? "있음" : "없음(null)");
        const response = await fetch(`${ALARM_ENDPOINT}/sse/connect`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token ?? ""}`,
            Accept: "text/event-stream",
          },
        });

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
          const result = await reader.read();
          done = result.done;
          const { value } = result;
          if (done) {
            // 스트림 자연 종료 시 재연결 (서버 타임아웃 등)
            if (!controller.signal.aborted) setTimeout(connect, 1000);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data:")) {
              try {
                const data = JSON.parse(line.slice(5).trim());
                if (data !== "connected") {
                  onNotification(data as NotificationItem);
                }
              } catch {
                console.error("Could not parse data:", line);
              }
            }
          }
        }
      } catch (e: any) {
        if (e.name === "AbortError") return;
        // 재연결
        setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      abortRef.current?.abort();
    };
  }, [isLoggedIn]);
};
