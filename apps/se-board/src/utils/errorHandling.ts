import { ErrorCode } from "@types";

export const incorrectPostPassword = () => {
  return alert("비밀번호가 틀렸습니다.");
};

const errorCodeToAlert = [
  103, 109, 114, 115, 117, 118, 122, 123, 124, 125, 126, 127, 128, 129, 130,
  131, 132, 133, 134, 135, 136, 137, 138, 140, 141, 142, 143, 144, 145, 202,
  203, 204, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 400,
];
const errorCodeToAlertAndGoToBack = [104, 200, 201, 300];
const errorCodeToAlertAndMain = [146];

export function errorHandle(error: ErrorCode | unknown) {
  const { code, message } = error as ErrorCode;

  if (errorCodeToAlert.includes(code)) {
    return alert(message);
  } else if (errorCodeToAlertAndGoToBack.includes(code)) {
    alert(message);
    window.history.back();
  } else if (errorCodeToAlertAndMain.includes(code)) {
    alert(message);
    window.location.replace("/");
  } else if (code === 139) {
    alert("댓글 작성에 실패했습니다. 다시 시도해주세요.");
    window.location.reload();
  }
}
