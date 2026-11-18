# API 0.5.0 연동 대조 결과

## 2026-10-23 강제 회수 대상 선택

기존 `POST /api/v1/admin/rentals/{id}/force-return` 계약을 그대로 사용합니다. 서버 ID나 첫
계약이 아니라 관리자가 명시적으로 선택한 rental ID와 확인한 version·사유·멱등 키를
전송합니다. 사용자 목록 선택과 확인 창을 여는 동작만으로는 API를 호출하지 않습니다.
이미 반납 중/종료된 대여는 재선택할 수 없고, 선택한 대여의 version이 변경되면 재확인을
요구합니다. 자동 시험 65개 및 웹 production export 통과. 백엔드 소스는 변경하지 않았습니다.

## 2026-10-23 관리자 표시·선택 방식

`GET /api/v1/admin/rentals`의 RentalListItem에는 대여자 이름이 없고 memberId가 있습니다.
기존 `사용자 10000`은 임의 번호가 아닌 이 필드의 표시였으며, 이름과 구분되도록
`회원 ID 10000`으로 바꿨습니다. 프로필/관리자 계정을 대여자 이름으로 대체하지 않습니다.
서버 수정/삭제 버튼을 누른 뒤 대상 선택 원이 나타나도록 바꿨고 기존 PATCH/DELETE의
사유·version·멱등 키·확인 절차는 유지합니다. 새 API는 추가하거나 호출하지 않았습니다.

## 2026-10-23 자동 조회 최적화

백엔드 계약 변경 없이 목록 전체 상세 요청을 제거했습니다. 목록 응답의 contractStart/End,
status/version으로 화면을 구성하며, 열린 대여만 상세를 조회합니다. 목록·접속 정보는 15초,
상세는 상태에 따라 2/15/30초 간격입니다. 웹 탭 숨김 시 자동 조회를 멈추고 복귀 시 즉시
갱신합니다. 동시에 열린 상세 요청은 같은 클라이언트·ID끼리만 공유합니다. 자동 시험 57개와
웹 production export가 통과했습니다. 상세 API가 반환하는 jobs 배열 자체를 줄인 것은 아닙니다.

## 2026-10-23 사용자 화면 간소화

현재 진행 화면은 계약 상세만 2초 간격으로 조회하고 상태·진행 단계·현재 작업 요약만 표시합니다.
미래 슬롯별 PENDING 작업과 과거 작업 목록·이벤트 이력은 표시하지 않고 events API도 요청하지
않습니다. events 클라이언트 함수와 계약 테스트는 유지합니다. 아래 작업 목록 화면은 이전 기록입니다.
자동 시험 50개와 웹 production export가 통과했습니다. 실제 작업큐나 백엔드 API는 변경하지 않았습니다.

## 2026-10-23 작업 상태 표시 추가

기존 상세 API의 RentalJob 스키마(id/type/status/step/retryCount/nextRunAt/reasonCode)를
작업 목록에 연결하고 계약별 events GET을 추가했습니다. 최신 요청 계약 테스트는 서비스
요청 20개를 대조합니다. 상세 진행 화면은 조회 완료 후 2초 간격으로 다시 요청하며
진행률 퍼센트를 만들지 않습니다. Agent의 내부 API나 관리자 전체 작업큐 API는 호출하지 않습니다.

`npm test` 38개 통과, 웹 production export 성공. 로컬 시험 API로 작업 단계의 자동 갱신,
실패·재시도 표시와 최근 이벤트 펼치기를 확인했습니다. 시험 코드는 tests에만 있으며 앱에
포함되지 않습니다. 실제 운영 Worker/Proxmox 실행을 검증한 결과는 아닙니다.

## 2026-10-14 기존 대조 기록

2026-10-14 전달 폴더 `Server_Allday_프론트_API_전달_0.5.0_2026-10-14`의 OpenAPI와 답변 문서를 기준으로 수정했습니다. 매니페스트의 8개 파일 해시가 모두 일치하며 OpenAPI SHA-256은 `38adc577e87abcd94c765a7b8f8b83179c4a488b2151f066d45e6e66dcee33f4`입니다. 참조 문서·백엔드 파일은 수정하지 않았습니다.

## 반영 사항

| 항목 | 현재 동작 |
| --- | --- |
| 로그인 | 아이디·비밀번호를 `/formLogin`에 폼 인코딩으로 보내 토큰 발급; 직접 토큰 입력 제거 |
| 신원·권한 | `/api/v1/me`의 memberId·STUDENT/ADMIN·authorities·rentalEligible 검사 |
| 갱신 | 401에 `/refresh` 한 번, 동시 요청의 갱신 공유, 늦은 401의 중복 갱신 방지 |
| 재시도 | mutation의 본문·멱등 키 유지, 재인증 실패 시 세션 정리 |
| 로그아웃 | `/logoutProc` 요청, 성공 여부와 관계없이 로컬 제거, 실패 안내 |
| 서버 수정 | PATCH 전체 편집 값·version·필수 사유; nodeName 제외; 중복 표시명 허용 |
| 진행 대여 | 표시명만 편집 허용, 나머지 사양·분류 잠금; 최종 검사는 서버 응답 |
| 논리 삭제 | DELETE JSON version·사유·멱등 키; 204 무본문 처리; 실패 시 목록·오류 갱신 |
| 과거 기록 | `serverSnapshot`의 이름·GPU를 우선 사용하여 현재 서버 변경과 분리 |
| 예약 시각 | 가용 시간 응답의 serverNow·reservationHorizonAt 및 최소 전환 간격 반영 |
| ngrok | 해당 호스트에 명세의 경고 우회 헤더 추가; 쿠키는 전송하지 않음 |
| 파일 구조 | App·화면·컴포넌트를 `.jsx`, API·설정·진입점은 `.js`로 유지 |

백엔드의 52개 동작 중 이 프론트가 사용하는 서비스 요청 **19개**의 메서드·경로·쿼리·헤더·필수 필드·자료형을 대조했습니다. 별도 인증 검사에서 로그인·갱신·로그아웃 형식과 세션 경계를 검증합니다. worker/Agent·알림 등 모든 백엔드 동작을 화면에 연결했다는 의미는 아닙니다.

## 검증

`npm test` **28개 통과**, 웹 production export 성공. 테스트 명세 스냅샷은 `tests/contracts/public-api.json`이며 새 전달본의 실제 HTTP 응답 예시를 사용해 과거 기록 변환을 검사했습니다. 해당 데이터는 서비스 번들에 포함하지 않습니다.

```powershell
npm test
node scripts/audit-api.cjs
npm run build:web
```

감사 결과는 `artifacts/api-audit.json`, 실행·화면 확인 범위는 `VERIFICATION.md`에 기록합니다. 생성 JSON은 Git에서 제외합니다. 테스트 응답으로 로그인·서버 수정·삭제의 HTTP 요청 생성을 검사했으며 운영 계정·비밀값을 사용하지 않았습니다.

## 확인 범위

실제 제공 URL의 로그인 성공·CORS, 운영 SEBoard/SSO, worker·물리 VM·SSH 전체 흐름은 별도 검증이 필요합니다. 전달 매니페스트에도 realSEBoardConnected=false, publicBaseUrl=null로 기록되어 있습니다. 기존 `.env.example`의 팀 연결 주소는 임의 변경하지 않았습니다.

0.2.0의 토큰 직접 입력과 서버 수정·삭제 미지원 설명은 이번 0.5.0 구현에 적용되지 않습니다. 과거 요청서는 당시 요청 기록으로 보존하고 상단에 최신 상태를 표시했습니다.
## 2026-10-27 접속 정보 표시 보완

같은 날짜 헤더 개편에서 기존 계약의 `GET /mypage`를 표시용 닉네임 조회에 추가 연결했습니다.
명세의 DemoProfile.nickname을 사용하며 인증된 Actor.memberId와 일치하지 않으면 표시하지
않습니다. 권한은 계속 /api/v1/me로 확인합니다. Bearer GET 요청과 신원 일치 검사 시험을
추가했고 자동 시험은 총 77개입니다. 기존 19개 서비스 요청 감사 기록은 당시 범위입니다.

기존 서버·대여·connection·credential API만 사용하며 새 백엔드 엔드포인트를 만들지 않았습니다.
현재 서버 상태가 MAINTENANCE 또는 미확인일 때 접속 정보 조회/표시를 중단합니다. 대여가
RETURNING/RETURNED/CANCELLED여도 접속 정보를 제공하지 않습니다. 점검 해제 후에는
기존 응답을 재사용하지 않고 connection API의 available 값을 새로 확인합니다.

서버 목록에도 version 병합을 적용하여 늦게 도착한 AVAILABLE 응답이 최신 점검 상태를
덮지 않도록 했습니다. AVAILABLE이 아니면 reservationAllowed=true여도 신규 신청을
차단합니다. 상태 전환 뒤 늦게 도착한 credential 응답은 무시합니다.

프론트는 네트워크 규칙을 변경하지 않습니다. 실제 SSH/Jupyter 차단·세션 종료·접속 권한
폐기는 백엔드/관리 서버/Node Helper의 구현과 장비 시험으로 별도 확인해야 합니다.
자동 시험 75개 통과 및 웹 production export 성공. 실서비스 API나 장비는 변경하지 않았습니다.

