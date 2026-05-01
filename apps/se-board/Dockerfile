# ---- Build Stage ----
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY libs libs

# ckeditor5-custom-build가 로컬 파일 의존성이므로 libs 먼저 복사 후 설치
#test
RUN npm install --legacy-peer-deps && npm install --legacy-peer-deps @ckeditor/ckeditor5-watchdog

COPY public public
COPY src src
COPY craco.config.js tsconfig.json tsconfig.paths.json ./

# CRA 환경변수는 빌드 타임에 주입
ARG REACT_APP_API_ENDPOINT
ARG REACT_APP_FILE_ENDPOINT
ARG REACT_APP_API_FILE_ENDPOINT
ARG REACT_APP_ENDPOINT
ARG REACT_APP_ALARM_ENDPOINT

ENV REACT_APP_API_ENDPOINT=$REACT_APP_API_ENDPOINT
ENV REACT_APP_FILE_ENDPOINT=$REACT_APP_FILE_ENDPOINT
ENV REACT_APP_API_FILE_ENDPOINT=$REACT_APP_API_FILE_ENDPOINT
ENV REACT_APP_ENDPOINT=$REACT_APP_ENDPOINT
ENV REACT_APP_ALARM_ENDPOINT=$REACT_APP_ALARM_ENDPOINT

RUN DISABLE_ESLINT_PLUGIN=true npm run build

# ---- Runtime Stage ----
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
