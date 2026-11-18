# 서버 올데이 웹

SE-FE 안의 서버 대여 웹 프로젝트입니다. 운영 주소는 게시판과 같은 오리진의 `/allday/`입니다. Expo 54·React Native Web·NativeWind·JavaScript를 사용해 브라우저용 HTML/JS/CSS를 생성합니다. 이 복사본의 지원 플랫폼은 웹입니다.

## 통합 웹 실행

저장소 루트에서 [전체 웹 실행 안내](../../README.md)를 따르세요. 게시판과 대여 웹을 각각 빌드한 뒤 `npm run preview:web`으로 `http://127.0.0.1:3100/allday/`에 제공합니다.

통합 대여 빌드 명령 `npm run build:allday`는 SSO와 `/allday` 자산 경로를 활성화합니다. SSO는 같은 오리진의 `/api/v1/*` 및 세션 쿠키를 사용하고, SE 게시판 토큰을 브라우저 저장소에서 가져오지 않습니다.

## 대여 웹만 개발

이 폴더에서 Node 22.14.0 기준:

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run web
```

이미 .env가 있으면 덮어쓰지 마세요. SSO 비활성화 개발 모드의 주소는 `http://localhost:3001`이며 `.env`의 `EXPO_PUBLIC_API_URL`을 실제 개발용 대여 백엔드로 지정합니다. 이 모드의 아이디·비밀번호도 실제 개발 백엔드가 확인하며, 프론트 임시 계정이나 데이터로 대체하지 않습니다.

```powershell
npm.cmd test
npm.cmd run build:web
```

서버·카테고리·예약·대여 진행·접속 정보·반납은 백엔드 API로 처리합니다. 운영에서는 게시판 통합 로그인 버튼을 사용합니다. 관리자 화면과 API 권한은 서버의 회원/역할 응답에 따릅니다.

## 참고

- [웹 통합 기록](../../docs/서버올데이_웹_통합_2026-11-12.md)
- [카테고리 API 확인](docs/카테고리_API_연동_확인_2026-11-11.md)
- [API 감사](API_AUDIT.md)
- [검증 이력](VERIFICATION.md)

이전 독립 배포의 API 감사·인수인계 문서는 시점별 기록입니다. 현재 실행 경로·SSO·포트 설정은 이 문서와 저장소 루트 안내를 기준으로 합니다.
