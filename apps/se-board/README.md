# 금오공과대학교 컴퓨터소프트웨어공학과 커뮤니티

## Server AllDay 로그인 연결

빌드 환경의 `REACT_APP_ALLDAY_ORIGIN`에 대여 사이트 HTTPS 오리진을 설정하면 데스크톱과 모바일 메뉴에 서버 대여 링크가 표시됩니다. GitHub Actions는 `ALLDAY_ORIGIN` 변수를 이 빌드 설정에 전달합니다.

`/allday/sso`는 게시판 프론트가 처리합니다. 로그인된 상태에서 게시판 API의 `POST /allday/sso/authorize`로 코드를 발급받고, 인증이 필요하면 기존 게시판 로그인 화면으로 이동합니다. [백엔드 설정](https://github.com/kit-SE-Project/SEBoard_BE/blob/codex/server-allday-integration/server-allday/README.md#seboard-통합-로그인)
