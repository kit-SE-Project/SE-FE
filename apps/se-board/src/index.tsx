// CKEditor content styles — 에디터 밖에서 위지윅 콘텐츠 렌더링에 필요
import "./styles/ck-content.css";

import { ColorModeScript } from "@chakra-ui/react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { RecoilRoot } from "recoil";

import { queryClient } from "@/react-query";
import { theme } from "@/styles/chakraTheme";

import { App } from "./App";
import reportWebVitals from "./reportWebVitals";
import * as serviceWorker from "./serviceWorker";

const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <RecoilRoot>
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <ColorModeScript initialColorMode={"system"} />
          <App />
          <ReactQueryDevtools />
        </QueryClientProvider>
      </ChakraProvider>
    </RecoilRoot>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorker.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
