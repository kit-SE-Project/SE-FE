# 아이디·비밀번호 로그인 — API 0.5.0

로그인 화면에서 아이디와 비밀번호를 입력합니다. 토큰은 백엔드가 발급하며 사용자가 직접 입력하지 않습니다. 기본 API 주소는 `http://127.0.0.1:18082`, 환경변수는 `EXPO_PUBLIC_API_URL`입니다. 로그인 화면의 연결 설정을 펼쳐 주소를 바꿀 수 있습니다.

## 요청 흐름

1. `POST /formLogin`, `Content-Type: application/x-www-form-urlencoded`. 본문은 username, password, largeLogin=false입니다. 비밀번호의 앞뒤 공백을 임의로 제거하지 않습니다.
2. 응답 accessToken·refreshToken을 앱 메모리에 보관합니다. 웹에서는 신원·서버 목록 조회 성공 후
   refreshToken과 검증된 API 주소·세션 구분값만 탭별 sessionStorage에 보관합니다. 비밀번호·프로필·
   역할·accessToken은 저장하지 않으며 localStorage와 로그에도 기록하지 않습니다.
3. `GET /api/v1/me`의 memberId, role=STUDENT/ADMIN, authorities, rentalEligible을 확인하고 서버 목록을 조회합니다. ADMIN만 관리자 메뉴를 표시하며 대여 자격이 없는 계정은 신청을 차단합니다.
4. 보호 API에는 `Authorization: Bearer <accessToken>`만 보냅니다. 401이면 JSON `{refreshToken}`으로 `POST /refresh`를 호출해 두 토큰을 교체하고 원 요청을 한 번 재시도합니다. 동시 401과 늦게 도착한 이전 토큰의 401이 중복 갱신을 만들지 않도록 처리했습니다.
5. 로그인 실패 401, 시도 제한 429, 서버 설정·장애 503 및 요청 ID를 화면에 표시합니다. 갱신 실패는 재로그인으로 처리하고 로컬 계정으로 대체하지 않습니다.
6. 로그아웃은 `POST /logoutProc`에 access 헤더와 refresh 본문을 보내 세션 폐기를 요청합니다. 네트워크 실패에도 로컬 토큰은 제거하고 서버 폐기 확인 실패를 안내합니다. 현재 정책은 access 만료 시 로컬 정리 및 서버 세션 만료 대기입니다.

현재 앱은 largeLogin=false만 사용합니다. 같은 웹 탭의 새로고침에서는 저장된 refreshToken으로
`/refresh`를 한 번 호출하고 `/api/v1/me`에서 현재 신원·권한을 다시 조회한 뒤 화면에 진입합니다.
중복 복원은 한 요청으로 공유하고, 토큰 회전 결과를 즉시 저장합니다. 로그인 실패나 만료·폐기·
잘못된 신원에는 저장 정보를 삭제합니다. 일시적 네트워크 오류는 저장된 최신 토큰을 유지하되
서비스 화면 접근은 허용하지 않고 재확인/재로그인을 제공합니다. 로그아웃은 저장 정보도 지웁니다.
다른 계정의 늦은 갱신·로그아웃이 현재 계정의 저장값을 변경하지 않도록 세션 구분값을 검사합니다.

쿠키 인증은 아직 사용하지 않습니다. ngrok 주소에서는 명세가 허용한
`ngrok-skip-browser-warning` 헤더를 자동으로 붙입니다.

## 저장 방식의 한계

sessionStorage는 같은 탭에서 새로고침하는 동안 유지되는 브라우저 저장소이지 보안 금고가
아닙니다. JavaScript에서 refreshToken을 읽을 수 있으므로 XSS에 노출될 수 있습니다. 이 구현은
기존 JSON 토큰 계약을 바꾸지 않는 프론트 한정 개선이며 운영 인증의 최종 형태로 보지 않습니다.
운영에서는 백엔드와 Secure/HttpOnly/SameSite 쿠키 및 CSRF/CORS 정책을 함께 설계해야 합니다.
탭/브라우저 복원 시 저장소가 복구될 수 있으므로 공유 기기에서는 명시적으로 로그아웃합니다.

브라우저 저장소가 막히거나 용량 오류가 생기면 경고 후 메모리 방식으로 동작합니다. 복원 중
토큰 회전 응답을 잃었거나 서버 세션이 만료됐다면 다시 로그인해야 할 수 있습니다. 네이티브 앱의
안전한 토큰 저장은 이번 웹 수정에 포함하지 않았습니다.

- [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

이 인증은 전달 백엔드의 DB 계정·JWT 계약입니다. 실제 운영 SEBoard/SSO 인증과 물리 VM 접속은 별도 통합 대상이며 현재 프론트 검증이 그 성공을 의미하지 않습니다.

## 파일

- `src/screens/LoginScreen.jsx`: 로그인·빈 입력·실패 안내
- `src/components/BackendAccessFields.jsx`: 아이디·비밀번호·보기/숨기기·주소 설정
- `src/api.js`: 폼 로그인, 토큰 보관·갱신·로그아웃, 신원 검사
- `App.jsx`: 세션 및 API 데이터·역할·대여 자격 연결
- `tests/api-auth.test.cjs`: 인증 요청, 동시 갱신·재시도, 오류 및 로그아웃 검증
- `tests/session-restore.test.cjs`: 저장·복원·회전·폐기·일시적 장애·계정 전환 검증

계정 예시나 목업 로그인은 앱에 포함하지 않습니다. 테스트 fixture는 오프라인 검사에서만 사용합니다.
