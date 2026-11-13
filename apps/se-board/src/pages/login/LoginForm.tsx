import {
  Button,
  Flex,
  Icon,
  Input,
  Spacer,
  Text,
  useBoolean,
} from "@chakra-ui/react";
import { LoginFormFileds } from "@types";
import { SubmitHandler, useForm } from "react-hook-form";
import { BsCheckCircle, BsCheckCircleFill } from "react-icons/bs";
import { Link } from "react-router-dom";

import { useLogin } from "@/react-query/hooks/auth";

export const LoginForm = () => {
  const [maintainLogin, setMaintainLogin] = useBoolean();

  const { mutate: login, isLoading, error } = useLogin(maintainLogin);

  const {
    register,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = useForm<LoginFormFileds>();

  const onSubmit: SubmitHandler<LoginFormFileds> = (data) => login(data);

  return (
    <form style={{ width: "100%" }} onSubmit={handleSubmit(onSubmit)}>
      <Flex direction="column" gap="0.5rem">
        <Input placeholder="아이디" {...register("id", { required: true })} />
        <Input
          placeholder="비밀번호"
          type="password"
          {...register("password", { required: true })}
        />
        {error && (
          <Text color="red.500" ml="0.5rem">
            {error.message}
          </Text>
        )}
        <Button
          type="submit"
          isDisabled={!isValid}
          isLoading={isLoading}
          variant="primary"
          w="full"
          mt="0.5rem"
        >
          로그인
        </Button>
        <Flex>
          <Flex
            onClick={setMaintainLogin.toggle}
            alignItems="center"
            gap="0.25rem"
            cursor="pointer"
          >
            {maintainLogin ? (
              <Icon as={BsCheckCircleFill} color="primary" />
            ) : (
              <Icon as={BsCheckCircle} />
            )}
            <Text fontSize="sm">로그인 유지</Text>
          </Flex>
          <Spacer />
          <Link to="/passwordChange">
            <Text fontSize="sm" _hover={{ textDecoration: "underline" }}>
              비밀번호 재설정
            </Text>
          </Link>
        </Flex>
      </Flex>
    </form>
  );
};
