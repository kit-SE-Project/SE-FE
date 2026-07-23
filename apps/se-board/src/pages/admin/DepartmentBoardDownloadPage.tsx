import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { BsDownload, BsEye } from "react-icons/bs";

import {
  DepartmentBoardRequest,
  DepartmentBoardResult,
  DepartmentBoardSource,
  downloadDepartmentBoard,
  previewDepartmentBoard,
} from "@/api/departmentBoard";
import { PageHeaderTitle } from "@/components/admin";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateValue = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
};

const getValidationMessage = ({ fromDate, toDate }: DepartmentBoardRequest) => {
  if (!fromDate || !toDate) {
    return "시작일과 종료일을 모두 입력해주세요.";
  }

  if (fromDate > toDate) {
    return "시작일은 종료일보다 늦을 수 없습니다.";
  }

  if (toDate > toDateInputValue(new Date())) {
    return "종료일은 오늘 이후로 설정할 수 없습니다.";
  }

  const diffDays = (getDateValue(toDate) - getDateValue(fromDate)) / MS_PER_DAY;

  if (diffDays > 365) {
    return "조회 기간은 최대 365일까지 가능합니다.";
  }

  return "";
};

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message);
  }

  return "요청 처리 중 오류가 발생했습니다.";
};

const saveBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const getDownloadFileName = (contentDisposition: unknown) => {
  const value = Array.isArray(contentDisposition)
    ? String(contentDisposition[0])
    : contentDisposition
    ? String(contentDisposition)
    : "";
  const match = value.match(/filename="?([^"]+)"?/);

  return match?.[1] ? decodeURIComponent(match[1]) : "";
};

export const DepartmentBoardDownloadPage = () => {
  const toast = useToast();
  const [source, setSource] = useState<DepartmentBoardSource>("NOTICE");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const includeAttachments = false;
  const [validationMessage, setValidationMessage] = useState("");
  const [result, setResult] = useState<DepartmentBoardResult>();
  const [resultTitle, setResultTitle] = useState("");
  const [loadingAction, setLoadingAction] = useState<
    "preview" | "download" | null
  >(null);
  const failures = result?.failures ?? [];
  const successes = result?.successes ?? [];

  const requestBody: DepartmentBoardRequest = {
    source,
    fromDate,
    toDate,
    includeAttachments,
  };

  const submit = async (action: "preview" | "download") => {
    const message = getValidationMessage(requestBody);
    setValidationMessage(message);

    if (message) return;

    setLoadingAction(action);

    try {
      const response = await previewDepartmentBoard(requestBody);

      setResult(response.data);
      setResultTitle(action === "preview" ? "미리보기 결과" : "다운로드 결과");

      if (action === "download") {
        const archiveResponse = await downloadDepartmentBoard(requestBody);
        const downloadFileName =
          getDownloadFileName(archiveResponse.headers["content-disposition"]) ||
          response.data.downloadFileName ||
          `department-board-${source.toLowerCase()}-${Date.now()}.zip`;

        saveBlob(archiveResponse.data, downloadFileName);
        setResult({ ...response.data, downloadFileName });
      }

      toast({
        title:
          action === "preview"
            ? "미리보기가 완료되었습니다."
            : "다운로드 파일을 생성했습니다.",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: getErrorMessage(error),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Box h="full" textAlign="left">
      <PageHeaderTitle title="학과 게시판 API 다운로드" />

      <Box
        w="full"
        my="20px"
        py="1rem"
        px={{ base: "0.75rem", md: "1rem" }}
        rounded="md"
        bgColor="white"
      >
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing="1rem">
          <FormControl>
            <FormLabel fontWeight="semibold">게시판</FormLabel>
            <Select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as DepartmentBoardSource)
              }
            >
              <option value="NOTICE">공지사항</option>
              <option value="FREE">자유게시판</option>
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel fontWeight="semibold">시작일</FormLabel>
            <Input
              type="date"
              value={fromDate}
              max={toDate || toDateInputValue(new Date())}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel fontWeight="semibold">종료일</FormLabel>
            <Input
              type="date"
              value={toDate}
              max={toDateInputValue(new Date())}
              onChange={(e) => setToDate(e.target.value)}
            />
          </FormControl>
        </SimpleGrid>

        <Checkbox mt="1rem" isChecked={includeAttachments} isDisabled>
          첨부파일 포함
        </Checkbox>

        {validationMessage && (
          <Alert status="warning" mt="1rem">
            <AlertIcon />
            {validationMessage}
          </Alert>
        )}

        <HStack mt="1rem" spacing="0.5rem">
          <Button
            leftIcon={<BsEye />}
            variant="outline"
            onClick={() => submit("preview")}
            isLoading={loadingAction === "preview"}
            isDisabled={loadingAction !== null}
            loadingText="확인 중"
          >
            미리보기
          </Button>
          <Button
            leftIcon={<BsDownload />}
            variant="primary"
            onClick={() => submit("download")}
            isLoading={loadingAction === "download"}
            isDisabled={loadingAction !== null}
            loadingText="실행 중"
          >
            다운로드 실행
          </Button>
        </HStack>
      </Box>

      {result && (
        <Box
          w="full"
          my="20px"
          py="1rem"
          px={{ base: "0.75rem", md: "1rem" }}
          rounded="md"
          bgColor="white"
        >
          <Text fontSize="lg" fontWeight="bold" mb="0.75rem">
            {resultTitle}
          </Text>
          <Table size="sm" variant="simple">
            <Tbody>
              <Tr>
                <Th w="180px">작업 상태</Th>
                <Td>{result.status}</Td>
              </Tr>
              <Tr>
                <Th>저장 경로</Th>
                <Td>{result.downloadFileName || "-"}</Td>
              </Tr>
              <Tr>
                <Th>전체 게시글 수</Th>
                <Td>{result.totalCount}</Td>
              </Tr>
              <Tr>
                <Th>성공 개수</Th>
                <Td>{result.successCount}</Td>
              </Tr>
              <Tr>
                <Th>실패 개수</Th>
                <Td>{result.failCount}</Td>
              </Tr>
            </Tbody>
          </Table>

          <Text fontWeight="bold" mt="1rem" mb="0.5rem">
            실패 목록
          </Text>
          {failures.length ? (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>게시글 번호</Th>
                  <Th>실패 사유</Th>
                </Tr>
              </Thead>
              <Tbody>
                {failures.map((failure, index) => (
                  <Tr key={`${failure.articleNo ?? failure.postId}-${index}`}>
                    <Td>{failure.articleNo ?? failure.postId ?? "-"}</Td>
                    <Td>{failure.reason ?? failure.message ?? "-"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Text color="gray.6">실패한 게시글이 없습니다.</Text>
          )}

          <Text fontWeight="bold" mt="1rem" mb="0.5rem">
            성공한 게시글 제목 목록
          </Text>
          {successes.length ? (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>게시글 번호</Th>
                  <Th>제목</Th>
                </Tr>
              </Thead>
              <Tbody>
                {successes.map((success, index) => (
                  <Tr key={`${success.articleNo}-${index}`}>
                    <Td>{success.articleNo ?? "-"}</Td>
                    <Td>{success.title || "-"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Text color="gray.6">성공한 게시글이 없습니다.</Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DepartmentBoardDownloadPage;
