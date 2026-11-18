# SE 게시판 · Server Allday 웹

`codex/server-allday-integration` 브랜치에서 게시판과 서버 대여 웹을 함께 배포합니다.

| 주소 | 화면/API |
| --- | --- |
| `/` | 기존 SE 게시판 |
| `/allday/` | 서버 대여 웹 |
| `/allday/sso` | 게시판이 처리하는 통합 로그인 중계 |
| `/api/v1/*` | 대여 백엔드로 전달 |

두 웹은 별도 HTML·React·CSS·의존성으로 빌드합니다. 대여 웹은 Expo/React Native Web으로 브라우저용 파일을 생성하며, 이 저장소의 대여 프로젝트는 웹만 지원합니다.

게시판의 기존 ‘서버대여’ 메뉴는 유지하며, 새 웹은 ‘서버 대여 (테스트중)’ 메뉴로 `/allday/`에 연결합니다.

## 로컬 설치와 빌드

대여 웹은 Node 22.14.0에서 확인했습니다. 루트의 pnpm 의존성으로 합치지 않고 각 폴더의 lockfile을 사용합니다.

```powershell
npm.cmd --prefix apps/se-board ci --legacy-peer-deps
npm.cmd --prefix apps/server-allday ci
npm.cmd run build:board
npm.cmd run build:allday
npm.cmd run preview:web
```

게시판 API 기본값은 `https://seboard.site/v1`입니다. 2026-11-12 배포된 공개 웹 번들과 실제 `/v1/menu`의 JSON 응답으로 확인했습니다. 개발·검증 서버를 사용할 때는 기존 빌드 변수 `REACT_APP_API_ENDPOINT`로 바꿀 수 있습니다. 알림 등 추가 설정은 `apps/se-board/.env.example` 및 기존 배포 변수를 참고하세요. `REACT_APP_ALLDAY_ORIGIN`을 생략하면 현재 웹 오리진을 사용합니다. 직접 지정할 때는 HTTPS 또는 개발용 `http://127.0.0.1:포트` 오리진만 지정하고 `/allday` 경로는 붙이지 않습니다.

미리보기 주소:

통합 미리보기가 실행 중일 때도 루트의 `build:board`·`build:allday`를 사용하세요. 임시 폴더에서 빌드한 뒤 새 파일을 반영하고 이전 해시 자산을 유지하므로 뒤로 가기로 돌아온 페이지의 파일이 빌드 도중 사라지지 않습니다. 각 프로젝트의 원래 직접 빌드 명령은 공개 폴더를 비울 수 있습니다.

- 게시판: `http://127.0.0.1:3100/`
- 대여: `http://127.0.0.1:3100/allday/`

```powershell
$env:ALLDAY_API_UPSTREAM='http://127.0.0.1:18082'
npm.cmd run preview:web
```

`ALLDAY_API_UPSTREAM`에는 실제 대여 백엔드 오리진을 지정합니다. 백엔드가 없으면 실제 503 오류를 표시하며 임시 로그인이나 목업 데이터로 대체하지 않습니다. 로컬 SSO 검사에는 양 백엔드의 공개 오리진·콜백·중계 URL도 이 미리보기 주소에 맞춰야 합니다.

대여 웹의 기존 비밀번호 개발 모드는 `apps/server-allday`에서 SSO 설정을 끄고 `npm run web`으로 실행합니다. 포트는 3001입니다. 통합 미리보기의 운영용 대여 빌드는 SSO를 사용합니다.

## 검사

```powershell
npm.cmd --prefix apps/server-allday test
npm.cmd --prefix apps/se-board test -- --watchAll=false --runInBand
npm.cmd run test:web
```

대여 인증·예약·관리자/카테고리, 게시판 SSO·토큰 갱신, 통합 정적 경로·쿠키 프록시를 검사합니다. 실제 SE 로그인·DB·VM 생성/반납까지 확인하는 배포 E2E 검사는 별도로 필요합니다.

## 운영 배포

`Dockerfile.web`이 두 웹을 각각 빌드한 뒤 Nginx 이미지에 결합합니다. `.github/workflows/cd.yml`은 저장소 루트 context와 이 Dockerfile을 사용합니다. 기존 CD의 main 배포 조건을 유지하므로 이 작업 브랜치를 로컬에서 수정하는 것만으로 운영 배포되지 않습니다.

- 런타임 `ALLDAY_API_UPSTREAM`을 실제 백엔드 서비스 주소로 지정하세요. 컨테이너의 기본 `127.0.0.1`은 다른 백엔드 컨테이너를 가리키지 않습니다.
- 웹과 대여 `/api/v1/`이 같은 공개 오리진이어야 합니다. Ingress에서 `/api/v1/`을 직접 다른 곳으로 보내면 이 이미지의 프록시·콜백 보정이 실행되지 않습니다.
- `apps/se-board/nginx.integrated.conf.template`이 게시판·대여·SSO 중계를 구분합니다. `/allday/sso`를 대여 웹 fallback으로 보내지 마세요.
- 현재 대여 백엔드의 `/api/v1/sso/callback`이 루트 `/`로 보내는 성공·expired/unavailable 응답은 `/allday/`로 보정합니다. 백엔드가 이미 `/allday/`로 보내면 그대로 통과합니다. 다른 API 리다이렉트는 바꾸지 않습니다.
- 대여 API 경로는 `/api/v1/` 그대로입니다. Origin·Cookie·Set-Cookie를 보존하며 캐시하지 않습니다. 내부 매니저 경로는 이 웹 프록시로 공개하지 않습니다.
- 게시판 backend authorize·내부 exchange/identity·grant 무효화 계약을 유지합니다. 브라우저에서 게시판 토큰을 대여 웹에 복사하지 않습니다.
- SSO 공개 오리진·콜백·portal 설정은 같은 게시판 HTTPS 도메인으로 맞춥니다. 공유 비밀·실제 토큰·비밀번호는 웹 빌드 변수나 저장소에 넣지 않습니다.

상세 구성과 확인 결과는 [통합 기록](docs/서버올데이_웹_통합_2026-11-12.md)을 참고하세요.
