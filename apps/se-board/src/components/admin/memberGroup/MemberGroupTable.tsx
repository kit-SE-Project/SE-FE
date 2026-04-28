import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  Table,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import {
  ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Role } from "@types";
import { useEffect, useMemo, useState } from "react";
import React from "react";
import { BsFillPencilFill, BsTrash3 } from "react-icons/bs";

import { RoleBadge } from "@/components/common/RoleBadge";
import {
  useAddRole,
  useDeleteRole,
  useGetRoleInfos,
  useUpdateRole,
} from "@/react-query/hooks";
import { errorHandle } from "@/utils/errorHandling";

const columnHelper = createColumnHelper<Role>();

const columnWidth = ["10rem", "10rem", "8rem", "8rem", "50rem", "10rem"];
const mobileColumnWidth = ["8rem", "8rem", "6rem", "6rem", "30rem", "8rem"];

const EMPTY_ROLE: Role = {
  roleId: -1,
  name: "",
  alias: "",
  description: "",
  badgeType: null,
  badgePriority: null,
};

interface MemberGroupTableProps {
  addIsOpen: boolean;
  setAddIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MemberGroupTable = ({
  addIsOpen,
  setAddIsOpen,
}: MemberGroupTableProps) => {
  const { data, refetch } = useGetRoleInfos();
  const { mutate: deleteRoleMutate, isLoading: deleteIsLoading } =
    useDeleteRole();
  const { mutate: modifyRoleMutate, isLoading: modifyIsLoading } =
    useUpdateRole();
  const { mutate: addRoleMutate, isLoading: addIsLoading } = useAddRole();

  const [roleList, setRoleList] = useState<Role[]>([]);
  const [modifyRole, setModifyRole] = useState<Role>(EMPTY_ROLE);
  const [addRole, setAddRole] = useState<Role>(EMPTY_ROLE);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: modifyIsOpen,
    onOpen: modifyOnOpen,
    onClose: modifyOnClose,
  } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const deleteRoleId = React.useRef<number>(-1);

  useEffect(() => {
    if (!data) return;
    setRoleList(data);
  }, [data]);

  const columns = useMemo<ColumnDef<Role, any>[]>(
    () => [
      columnHelper.accessor("name", {
        header: "그룹명",
        cell: (info) => info.row.original.name,
      }),
      columnHelper.accessor("alias", {
        header: "별칭",
        cell: (info) => info.row.original.alias,
      }),
      columnHelper.accessor("badgeType", {
        header: "뱃지",
        cell: (info) => {
          const { badgeType, alias } = info.row.original;
          return badgeType ? (
            <Flex justifyContent="center">
              <RoleBadge badgeType={badgeType} badgeLabel={alias} size="md" />
            </Flex>
          ) : (
            "-"
          );
        },
      }),
      columnHelper.accessor("badgePriority", {
        header: "우선순위",
        cell: (info) => info.row.original.badgePriority ?? "-",
      }),
      columnHelper.accessor("description", {
        header: "설명",
        cell: (info) => info.row.original.description,
      }),
      columnHelper.display({
        id: "removeAndModify",
        header: "삭제/수정",
        cell: (info) => (
          <Flex
            justifyContent="space-between"
            alignItems="center"
            w="85%"
            mx="auto"
          >
            <Tooltip label="삭제" placement="top">
              <IconButton
                aria-label="삭제"
                variant="danger"
                icon={<BsTrash3 />}
                fontSize="1.1rem"
                size="sm"
                onClick={() => {
                  deleteRoleId.current = info.row.original.roleId;
                  onOpen();
                }}
              />
            </Tooltip>
            <Tooltip label="수정" placement="top">
              <IconButton
                aria-label="수정"
                bgColor="gray.3"
                _hover={{ bgColor: "gray.5" }}
                icon={<BsFillPencilFill />}
                size="sm"
                onClick={() => {
                  setModifyRole(info.row.original);
                  modifyOnOpen();
                }}
              />
            </Tooltip>
          </Flex>
        ),
      }),
    ],
    []
  );

  const table = useReactTable<Role>({
    data: roleList,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const onMemberGroupDeleteClick = () => {
    deleteRoleMutate(deleteRoleId.current, {
      onSuccess: () => {
        refetch();
        onClose();
        deleteRoleId.current = -1;
      },
      onError: (error) => {
        errorHandle(error);
      },
    });
  };

  const onModifyRole = () => {
    modifyRoleMutate(modifyRole, {
      onSuccess: () => {
        refetch();
        modifyOnClose();
        setModifyRole(EMPTY_ROLE);
      },
      onError: (error) => {
        errorHandle(error);
      },
    });
  };

  const onAddRole = () => {
    addRoleMutate(addRole, {
      onSuccess: () => {
        refetch();
        setAddIsOpen(false);
        setAddRole(EMPTY_ROLE);
      },
      onError: (error) => {
        errorHandle(error);
      },
    });
  };

  const currentRole = addIsOpen ? addRole : modifyRole;
  const setCurrentRole = addIsOpen ? setAddRole : setModifyRole;

  return (
    <>
      <Table>
        <Thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <Tr key={headerGroup.id}>
              {headerGroup.headers.map((header, i) => (
                <Th
                  key={header.id}
                  w={{ base: mobileColumnWidth[i], md: columnWidth[i] }}
                  fontSize="md"
                  textAlign="center"
                  borderY="1px solid"
                  borderColor="gray.3"
                  whiteSpace="nowrap"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </Th>
              ))}
            </Tr>
          ))}
        </Thead>
        <Tbody>
          {table.getRowModel().rows.map((row) => (
            <Tr key={row.id} fontSize="sm">
              {row.getVisibleCells().map((cell, i) => (
                <Td
                  key={cell.id}
                  textAlign={
                    cell.column.id !== "description" ? "center" : "left"
                  }
                  wordBreak="keep-all"
                  py="0.5rem"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              권한 삭제
            </AlertDialogHeader>
            <AlertDialogBody>해당 권한을 삭제하시겠습니까?</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                취소
              </Button>
              <Button
                variant="danger"
                onClick={onMemberGroupDeleteClick}
                ml={3}
                isLoading={deleteIsLoading}
                loadingText="삭제중"
              >
                삭제
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* 추가/수정 다이얼로그 */}
      <AlertDialog
        isOpen={modifyIsOpen || addIsOpen}
        leastDestructiveRef={cancelRef}
        onClose={modifyOnClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              권한 {addIsOpen ? "추가" : "수정"}
            </AlertDialogHeader>

            <AlertDialogBody>
              <Box>
                <FormControl>
                  <FormLabel>그룹명</FormLabel>
                  <Input
                    type="text"
                    placeholder="그룹명을 입력하세요."
                    value={currentRole.name}
                    onChange={(e) =>
                      setCurrentRole({ ...currentRole, name: e.target.value })
                    }
                  />
                </FormControl>

                <FormControl mt={4}>
                  <FormLabel>별칭</FormLabel>
                  <Input
                    type="text"
                    placeholder="별칭을 입력하세요."
                    value={currentRole.alias}
                    onChange={(e) =>
                      setCurrentRole({ ...currentRole, alias: e.target.value })
                    }
                  />
                </FormControl>

                <FormControl mt={4}>
                  <FormLabel>설명</FormLabel>
                  <Textarea
                    placeholder="설명을 입력하세요."
                    value={currentRole.description}
                    onChange={(e) =>
                      setCurrentRole({
                        ...currentRole,
                        description: e.target.value,
                      })
                    }
                  />
                </FormControl>

                <FormControl mt={4}>
                  <FormLabel>뱃지 아이콘</FormLabel>
                  <Flex alignItems="center" gap="0.75rem">
                    <Select
                      value={currentRole.badgeType ?? ""}
                      onChange={(e) =>
                        setCurrentRole({
                          ...currentRole,
                          badgeType:
                            (e.target.value as "CHECK" | "KUMOH_CROW") || null,
                          badgePriority: e.target.value
                            ? currentRole.badgePriority
                            : null,
                        })
                      }
                    >
                      <option value="">없음</option>
                      <option value="CHECK">CHECK (파란 체크)</option>
                      <option value="KUMOH_CROW">KUMOH_CROW (까마귀)</option>
                    </Select>
                    {currentRole.badgeType && (
                      <RoleBadge
                        badgeType={currentRole.badgeType}
                        badgeLabel={currentRole.alias}
                        size="md"
                      />
                    )}
                  </Flex>
                </FormControl>

                {currentRole.badgeType && (
                  <FormControl mt={4}>
                    <FormLabel>뱃지 우선순위</FormLabel>
                    <NumberInput
                      min={1}
                      value={currentRole.badgePriority ?? ""}
                      onChange={(_, val) =>
                        setCurrentRole({
                          ...currentRole,
                          badgePriority: isNaN(val) ? null : val,
                        })
                      }
                    >
                      <NumberInputField placeholder="숫자가 낮을수록 우선 표시 (예: 1)" />
                    </NumberInput>
                  </FormControl>
                )}
              </Box>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={
                  addIsOpen
                    ? () => {
                        setAddRole(EMPTY_ROLE);
                        setAddIsOpen(false);
                      }
                    : modifyOnClose
                }
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={addIsOpen ? onAddRole : onModifyRole}
                ml={3}
                isLoading={modifyIsLoading || addIsLoading}
                loadingText={addIsOpen ? "등록 중" : "수정 중"}
              >
                {addIsOpen ? "등록" : "수정"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
