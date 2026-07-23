import { HTTP_METHODS } from ".";
import { _axios, getJWTHeader } from "./axiosInstance";

export type DepartmentBoardSource = "NOTICE" | "FREE";

export interface DepartmentBoardRequest {
  source: DepartmentBoardSource;
  fromDate: string;
  toDate: string;
  includeAttachments: boolean;
}

export interface DepartmentBoardFailure {
  articleNo?: number | string;
  postId?: number | string;
  reason?: string;
  message?: string;
}

export interface DepartmentBoardSuccess {
  articleNo?: number | string;
  title?: string;
}

export interface DepartmentBoardResult {
  jobId: string;
  status: string;
  downloadFileName?: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  successes: DepartmentBoardSuccess[];
  failures: DepartmentBoardFailure[];
}

export const previewDepartmentBoard = (data: DepartmentBoardRequest) => {
  return _axios<DepartmentBoardResult>({
    url: "/admin/department-board-api-download/preview",
    method: HTTP_METHODS.POST,
    headers: { ...getJWTHeader() },
    timeout: 120000,
    data,
  });
};

export const downloadDepartmentBoard = (data: DepartmentBoardRequest) => {
  return _axios<Blob>({
    url: "/admin/department-board-api-download/download",
    method: HTTP_METHODS.POST,
    headers: { ...getJWTHeader() },
    responseType: "blob",
    timeout: 120000,
    data,
  });
};
