import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  SimpleGrid,
  Switch,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { CategoryInfomation, MenuInfomation, MenuRoleInfo } from "@types";
import { useEffect, useRef, useState } from "react";
import { BsPlusLg } from "react-icons/bs";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

import {
  useDeleteCategory,
  usePostAddMenuOrCategory,
  usePostMoveCategory,
  usePutCategory,
} from "@/react-query/hooks/useMenu";
import { categoryListState } from "@/store/categoryState";
import { newSEMenuState } from "@/store/menu";
import { errorHandle } from "@/utils/errorHandling";

import { AuthorityMenu } from "./AuthorityMenu";

interface CategoryManageProps {
  menuId: number;
  subMenus: MenuInfomation[];
}

export const CategoryManage = ({ menuId, subMenus }: CategoryManageProps) => {
  const setCategoryList = useSetRecoilState(categoryListState(menuId));
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (!subMenus) return;

    setCategoryList(subMenus);
  }, [subMenus]);

  return (
    <Box
      my="20px"
      bgColor="white"
      py="1rem"
      px={{ base: "0.75rem", md: "1rem" }}
      rounded="3xl"
    >
      <Heading fontSize="xl" mb="0.75rem">
        카테고리 관리
      </Heading>
      <Box
        my="0.5rem"
        maxH="20rem"
        border="2px solid"
        borderColor="gray.3"
        wordBreak="keep-all"
        overflow="auto"
      >
        <SimpleGrid
          columns={5}
          textAlign="center"
          fontSize={{ base: "16px", md: "18px" }}
          fontWeight="semibold"
        >
          <Box py="0.375rem" borderBottom="1px solid" borderColor="gray.5">
            카테고리 이름
          </Box>
          <Box py="0.375rem" borderBottom="1px solid" borderColor="gray.5">
            카테고리 ID
          </Box>
          <Box py="0.375rem" borderBottom="1px solid" borderColor="gray.5">
            관리 권한
          </Box>
          <Box py="0.375rem" borderBottom="1px solid" borderColor="gray.5">
            작성 권한
          </Box>
          <Box py="0.375rem" borderBottom="1px solid" borderColor="gray.5">
            수정 / 삭제
          </Box>
        </SimpleGrid>
        {subMenus.map((category, idx) => (
          <CategoryManageItem key={idx} category={category} menuId={menuId} />
        ))}
      </Box>
      <Flex justifyContent="end" mt="0.75rem">
        <Button
          variant="primary"
          w="8.75rem"
          h="2.5rem"
          fontSize="16px"
          leftIcon={<BsPlusLg />}
          onClick={onOpen}
        >
          카테고리 추가
        </Button>
      </Flex>
      <EnrollAlert isOpen={isOpen} onClose={onClose} menuId={menuId} />
    </Box>
  );
};

interface CategoryManageItemProps {
  category: MenuInfomation;
  menuId: number;
}

const categoryRoleList = [
  { value: "all", label: "모든 사용자" },
  { value: "overUser", label: "준회원이상" },
  { value: "overKumoh", label: "정회원이상" },
  { value: "onlyAdmin", label: "관리자만" },
  { value: "select", label: "선택 사용자" },
];

const CategoryManageItem = ({ category, menuId }: CategoryManageItemProps) => {
  const {
    isOpen: deleteIsOpen,
    onOpen: deleteOnOpen,
    onClose: deleteOnClose,
  } = useDisclosure();

  const {
    isOpen: modifyIsOpen,
    onOpen: modifyOnOpen,
    onClose: modifyOnClose,
  } = useDisclosure();

  return (
    <SimpleGrid
      columns={5}
      spacingY={{ md: "0.5rem" }}
      textAlign="center"
      overflowY="auto"
      fontSize={{ base: "14px", md: "16px" }}
      fontWeight="300"
    >
      <Box my="auto">{category.name}</Box>
      <Box my="auto">{category.urlId}</Box>
      <Box my="auto" maxH="2.5rem" overflow="auto" wordBreak="keep-all">
        {
          categoryRoleList.find((v) => v.value === category.manage.option)
            ?.label
        }
      </Box>
      <Box my="auto" maxH="2.5rem" overflow="auto" wordBreak="keep-all">
        {categoryRoleList.find((v) => v.value === category.write.option)?.label}
      </Box>
      <ButtonGroup spacing="0.25rem" mx="auto" my="0.5rem" size="sm">
        <Button variant="primary" onClick={modifyOnOpen}>
          수정
        </Button>
        <Button variant="danger" onClick={deleteOnOpen}>
          삭제
        </Button>
      </ButtonGroup>
      <DeleteAlert
        isOpen={deleteIsOpen}
        onClose={deleteOnClose}
        menuId={menuId}
        category={category}
      />
      <ModifyAlert
        isOpen={modifyIsOpen}
        onClose={modifyOnClose}
        menuId={menuId}
        category={category}
      />
    </SimpleGrid>
  );
};

interface AlertProps {
  isOpen: boolean;
  onClose: () => void;
  menuId: number;
  category: MenuInfomation;
}

const DeleteAlert = ({ isOpen, onClose, menuId, category }: AlertProps) => {
  const queryClient = useQueryClient();

  const categoryList = useRecoilValue(categoryListState(menuId)).filter(
    (v) => v.menuId !== category.menuId
  );
  const [curSEMenu, setCurSEMenu] = useRecoilState(newSEMenuState);

  const {
    mutate: moveMutate,
    isLoading: moveIsLoading,
    isSuccess: moveIsSuccess,
    reset: moveReset,
  } = usePostMoveCategory();
  const { mutate: deleteMutate, isLoading: deleteIsLoading } =
    useDeleteCategory();

  const toast = useToast();

  const cancelRef = useRef<HTMLButtonElement>(null);
  const toCategoryIdRef = useRef<number | undefined>(undefined);

  function onCategoryMoveClick() {
    if (!toCategoryIdRef.current)
      return alert("이동할 카테고리를 선택해주세요.");

    if (!categoryList.find((v) => v.menuId === toCategoryIdRef.current)) {
      return alert("이동할 카테고리를 다시 선택해주세요.");
    }

    moveMutate(
      {
        fromCategoryId: category.menuId,
        toCategoryId: toCategoryIdRef.current,
      },
      {
        onSuccess: () => {
          toast({
            title: "카테고리 이동 완료",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        },
      }
    );
  }

  function onCategoryDeleteClick() {
    deleteMutate(category.menuId, {
      onSuccess: () => {
        onClose();
        setCurSEMenu(curSEMenu);
        queryClient.invalidateQueries(["adminMenuList"]);
        moveReset();
        toast({
          title: "카테고리 삭제 완료",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      },
    });
  }

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="xl" fontWeight="bold">
            카테고리 삭제
          </AlertDialogHeader>

          <AlertDialogBody>
            <Text>게시글 이동 후 카테고리 삭제 가능합니다.</Text>
            <Text
              display={categoryList.length === 0 ? "block" : "none"}
              mt="-0.125rem"
              color="red.5"
              fontSize="14px"
              wordBreak="keep-all"
            >
              카테고리가 1개 존재하는 경우, 메뉴 설정 하단의 메뉴 삭제에서
              게시글을 이동시켜주세요.
            </Text>
            <FormControl alignItems="center" mt="1rem">
              <FormLabel
                fontWeight="bold"
                w="fit-content"
                wordBreak="keep-all"
                mb="0.25rem"
              >
                게시글 이동 카테고리
              </FormLabel>
              <Flex alignItems="center">
                <Select
                  w="13rem"
                  mr="4px"
                  border="1px"
                  borderColor="gray.4"
                  disabled={categoryList.length === 0}
                  onChange={(e) =>
                    (toCategoryIdRef.current = Number(e.target.value))
                  }
                >
                  <option value="" hidden>
                    카테고리
                  </option>
                  {categoryList.map((category) => (
                    <option key={category.menuId} value={category.menuId}>
                      {category.name}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="primary"
                  onClick={onCategoryMoveClick}
                  isLoading={moveIsLoading}
                  loadingText="이동 중"
                  isDisabled={categoryList.length === 0 || moveIsSuccess}
                >
                  이동
                </Button>
              </Flex>
            </FormControl>
          </AlertDialogBody>

          <AlertDialogFooter>
            <ButtonGroup>
              <Button ref={cancelRef} onClick={onClose}>
                취소
              </Button>
              <Button
                variant="danger"
                isDisabled={!moveIsSuccess}
                onClick={onCategoryDeleteClick}
                isLoading={deleteIsLoading}
                loadingText="삭제 중"
              >
                삭제
              </Button>
            </ButtonGroup>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

const ModifyAlert = ({ isOpen, onClose, menuId, category }: AlertProps) => {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = usePutCategory();

  const toast = useToast();

  const [categoryInfo, setCategoryInfo] = useState<MenuInfomation>(category);
  const [popularPostEnabled, setPopularPostEnabled] = useState(
    category.popularPostEnabled ?? false
  );
  const [roles, setRoles] = useState<MenuRoleInfo>({
    access: {
      option: "",
      roles: [],
    },
    write: {
      option: "",
      roles: [],
    },
    manage: {
      option: "",
      roles: [],
    },
    expose: {
      option: "",
      roles: [],
    },
  });

  useEffect(() => {
    if (!category) return;

    setCategoryInfo(category);
    setPopularPostEnabled(category.popularPostEnabled ?? false);
  }, [category]);

  const cancelRef = useRef<HTMLButtonElement>(null);

  function onCategoryModifyClick() {
    mutate(
      {
        categoryId: categoryInfo.menuId,
        data: {
          name: categoryInfo.name,
          urlId: categoryInfo.urlId,
          description: "",
          externalUrl: "",
          access: { option: "", roles: [] },
          write: roles.write,
          manage: roles.manage,
          expose: { option: "", roles: [] },
          popularPostEnabled,
        },
      },
      {
        onSuccess: () => {
          onClose();
          queryClient.invalidateQueries(["adminMenuList"]);
          toast({
            title: "카테고리 수정 완료",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        },
      }
    );
  }

  function onCancelClick() {
    setCategoryInfo(category);
    onClose();
  }

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="xl" fontWeight="bold" mt="0.5rem">
            카테고리 수정
          </AlertDialogHeader>

          <AlertDialogBody pb="1.5rem">
            <FormControl display="flex" alignItems="center">
              <FormLabel fontWeight="bold" w="6.5rem">
                카테고리 이름
              </FormLabel>
              <Input
                type="text"
                placeholder="카테고리 이름 입력"
                value={categoryInfo.name}
                onChange={(e) => {
                  setCategoryInfo({
                    ...categoryInfo,
                    name: e.target.value,
                  });
                }}
                px="0.75rem"
                w="12rem"
                border="1px solid"
                borderColor="gray.4"
              />
            </FormControl>
            <FormControl display="flex" alignItems="center" mt="0.75rem">
              <FormLabel fontWeight="bold" w="6.5rem">
                카테고리 ID
              </FormLabel>
              <Input
                type="text"
                placeholder="카테고리 ID 입력"
                value={categoryInfo.urlId}
                onChange={(e) => {
                  setCategoryInfo({
                    ...categoryInfo,
                    urlId: e.target.value,
                  });
                }}
                px="0.75rem"
                w="12rem"
                border="1px solid"
                borderColor="gray.4"
              />
            </FormControl>
            <FormControl display="flex" alignItems="center" mt="0.75rem">
              <FormLabel fontWeight="bold" w="8.75rem" wordBreak="keep-all">
                카테고리 관리 권한
              </FormLabel>
              <AuthorityMenu
                roleType="manage"
                setRoles={setRoles}
                defaultOption={category.manage?.option || "onlyAdmin"}
                defaultRoles={category.manage?.roles || []}
                disabledList={["all", "overUser", "overKumoh"]}
              />
            </FormControl>
            <FormControl display="flex" alignItems="center" mt="0.75rem">
              <FormLabel fontWeight="bold" w="8.75rem" wordBreak="keep-all">
                카테고리 작성 권한
              </FormLabel>
              <AuthorityMenu
                roleType="write"
                setRoles={setRoles}
                defaultOption={category.write?.option || ""}
                defaultRoles={category.write?.roles || []}
              />
            </FormControl>
            <FormControl display="flex" alignItems="center" mt="0.75rem">
              <FormLabel fontWeight="bold" w="8.75rem" wordBreak="keep-all">
                인기글 섹션
              </FormLabel>
              <Switch
                isChecked={popularPostEnabled}
                onChange={(e) => setPopularPostEnabled(e.target.checked)}
              />
            </FormControl>
          </AlertDialogBody>

          <AlertDialogFooter>
            <ButtonGroup>
              <Button ref={cancelRef} onClick={onCancelClick}>
                취소
              </Button>
              <Button
                variant="primary"
                onClick={onCategoryModifyClick}
                isLoading={isLoading}
                loadingText="수정 중"
              >
                등록
              </Button>
            </ButtonGroup>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

interface EnrollAlertProps {
  isOpen: boolean;
  onClose: () => void;
  menuId: number;
}

const EnrollAlert = ({ isOpen, onClose, menuId }: EnrollAlertProps) => {
  const queryClient = useQueryClient();

  const { mutate, isLoading, reset } = usePostAddMenuOrCategory();

  const [categoryInfo, setCategoryInfo] = useState<CategoryInfomation>({
    name: "",
    urlId: "",
    menuId: 0,
    writeRole: [],
    manageRole: [],
  });
  const [popularPostEnabled, setPopularPostEnabled] = useState(false);
  const [roles, setRoles] = useState<MenuRoleInfo>({
    access: {
      option: "",
      roles: [],
    },
    write: {
      option: "",
      roles: [],
    },
    manage: {
      option: "",
      roles: [],
    },
    expose: {
      option: "",
      roles: [],
    },
  });

  const cancelRef = useRef<HTMLButtonElement>(null);

  function onCategoryEnrollClick() {
    mutate(
      {
        categoryType: "CATEGORY",
        data: {
          superCategoryId: menuId,
          name: categoryInfo.name,
          urlId: categoryInfo.urlId,
          description: "",
          externalUrl: "",
          access: { option: "", roles: [] },
          write: roles.write,
          manage: roles.manage,
          expose: { option: "", roles: [] },
          popularPostEnabled,
        },
      },
      {
        onSuccess: () => {
          onClose();
          queryClient.invalidateQueries(["adminMenuList"]);
          reset();

          setCategoryInfo({
            name: "",
            urlId: "",
            menuId: 0,
            writeRole: [],
            manageRole: [],
          });
          setRoles({
            access: {
              option: "",
              roles: [],
            },
            write: {
              option: "",
              roles: [],
            },
            manage: {
              option: "",
              roles: [],
            },
            expose: {
              option: "",
              roles: [],
            },
          });
        },
        onError: (error) => {
          errorHandle(error);
        },
      }
    );
  }

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="xl" fontWeight="bold" mt="0.5rem">
            카테고리 등록
          </AlertDialogHeader>

          <AlertDialogBody pb="1.5rem">
            <FormControl display="flex" alignItems="center">
              <FormLabel fontWeight="bold" w="6.5rem">
                카테고리 이름
              </FormLabel>
              <Input
                type="text"
                placeholder="카테고리 이름 입력"
                value={categoryInfo.name}
                onChange={(e) => {
                  setCategoryInfo({
                    ...categoryInfo,
                    name: e.target.value,
                  });
                }}
                px="0.75rem"
                w="12rem"
                border="1px solid"
                borderColor="gray.4"
              />
            </FormControl>
            <FormControl display="flex" alignItems="center" mt="0.75rem">
              <FormLabel fontWeight="bold" w="6.5rem">
                카테고리 ID
              </FormLabel>
              <Input
                type="text"
                placeholder="카테고리 ID 입력"
                value={categoryInfo.urlId}
                onChange={(e) => {
                  setCategoryInfo({
                    ...categoryInfo,
                    urlId: e.target.value,
                  });
                }}
                px="0.75rem"
                w="12rem"
                border="1px solid"
                borderColor="gray.4"
              />
            </FormControl>
            <FormControl display="flex" alignItems="center" mt="0.75rem">
              <FormLabel fontWeight="bold" w="8.75rem" wordBreak="keep-all">
                카테고리 관리 권한
              </FormLabel>
              <AuthorityMenu
                roleType="manage"
                setRoles={setRoles}
                defaultOption={"onlyAdmin"}
                disabledList={["all", "overUser", "overKumoh"]}
              />
            </FormControl>
            <FormControl display="flex" alignItems="center" mt="0.75rem">
              <FormLabel fontWeight="bold" w="8.75rem" wordBreak="keep-all">
                카테고리 작성 권한
              </FormLabel>
              <AuthorityMenu roleType="write" setRoles={setRoles} />
            </FormControl>
            <FormControl display="flex" alignItems="center" mt="0.75rem">
              <FormLabel fontWeight="bold" w="8.75rem" wordBreak="keep-all">
                인기글 섹션
              </FormLabel>
              <Switch
                isChecked={popularPostEnabled}
                onChange={(e) => setPopularPostEnabled(e.target.checked)}
              />
            </FormControl>
          </AlertDialogBody>

          <AlertDialogFooter>
            <ButtonGroup>
              <Button
                ref={cancelRef}
                onClick={() => {
                  setCategoryInfo({
                    name: "",
                    urlId: "",
                    menuId: 0,
                    writeRole: [],
                    manageRole: [],
                  });
                  onClose();
                }}
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={onCategoryEnrollClick}
                isLoading={isLoading}
                loadingText="등록 중"
              >
                등록
              </Button>
            </ButtonGroup>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
