import {
  Flex,
  Table as ChakraTable,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import { Icon, Text } from "@chakra-ui/react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { PostListItem } from "@types";
import { BsLink45Deg, BsPinAngleFill } from "react-icons/bs";
import { PiFireFill } from "react-icons/pi";
import { Link } from "react-router-dom";

import { RoleBadge } from "@/components/common/RoleBadge";
import { toYYMMDD_DOT } from "@/utils/dateUtils";
import { isRecentModifiedPost, isRecentPost } from "@/utils/postUtils";

import { NewIcon } from "./NewIcon";
import { UpdateIcon } from "./UpdateIcon";

const columnHelper = createColumnHelper<PostListItem>();

const columns: ColumnDef<PostListItem, any>[] = [
  columnHelper.accessor("number", {
    header: "번호",
    cell: (info) => {
      if (info.row.original.pined) {
        return <Icon as={BsPinAngleFill} color="primary" />;
      } else if (info.row.original.trending) {
        return <Icon as={PiFireFill} color="orange.400" />;
      } else {
        return info.getValue();
      }
    },
  }),
  columnHelper.accessor("title", {
    header: "제목",
    cell: (info) => {
      const {
        commentSize,
        hasAttachment,
        pined,
        trending,
        postId,
        createdDateTime,
        modifiedDateTime,
        category: { name },
      } = info.row.original;
      return (
        <Flex alignItems="center" gap="0.2rem">
          <Link to={`${postId}`}>
            <Text
              noOfLines={1}
              _hover={{
                textDecoration: "underline",
                textDecorationColor: "gray.6",
              }}
              fontWeight={pined || trending ? "bold" : "normal"}
            >
              [{name}] {info.getValue()}
            </Text>
          </Link>
          <Text color={"orange.5"}>[{commentSize}]</Text>
          {hasAttachment && <Icon as={BsLink45Deg} ml="0.25rem" />}
          {isRecentPost(createdDateTime) ? (
            <NewIcon />
          ) : isRecentModifiedPost(createdDateTime, modifiedDateTime) ? (
            <UpdateIcon />
          ) : null}
        </Flex>
      );
    },
  }),
  columnHelper.accessor("author.name", {
    header: "작성자",
    cell: (info) => {
      const { badgeType, badgeLabel } = info.row.original.author;
      return (
        <Flex justifyContent="flex-start" alignItems="center" gap="4px">
          <Text whiteSpace="nowrap" textAlign="left">
            {info.getValue()}
          </Text>
          <RoleBadge badgeType={badgeType} badgeLabel={badgeLabel} />
        </Flex>
      );
    },
  }),
  columnHelper.accessor("createdDateTime", {
    header: "작성일",
    cell: (info) => toYYMMDD_DOT(info.getValue()),
  }),
  columnHelper.accessor("views", {
    header: "조회수",
    cell: (info) => info.getValue(),
  }),
];

const columnWidth = ["10%", "60%", "10%", "10%", "10%"];

interface PostTableProps {
  data: PostListItem[];
}

export const PostTable = ({ data }: PostTableProps) => {
  const table = useReactTable<PostListItem>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const titleColor = useColorModeValue("gray.7", "whiteAlpha.800");
  const borderColor = useColorModeValue("gray.3", "whiteAlpha.400");
  const pinnedBgColor = useColorModeValue("gray.1", "whiteAlpha.100");
  const trendingBgColor = useColorModeValue("orange.50", "orange.900");
  const trendingBorderColor = useColorModeValue("orange.200", "orange.700");

  const rows = table.getRowModel().rows;
  const lastTrendingIdx = rows.reduce(
    (acc, row, idx) => (row.original.trending ? idx : acc),
    -1
  );

  return (
    <ChakraTable>
      <Thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <Tr key={headerGroup.id}>
            {headerGroup.headers.map((header, i) => (
              <Th
                key={header.id}
                w={columnWidth[i]}
                fontSize="md"
                textAlign="center"
                borderColor={borderColor}
                whiteSpace="nowrap"
                color={titleColor}
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
        {rows.map((row, i) => {
          const isTrending = row.original.trending;
          const isLastTrending = i === lastTrendingIdx;

          return (
            <Tr
              key={i}
              bgColor={
                row.original.pined
                  ? pinnedBgColor
                  : isTrending
                  ? trendingBgColor
                  : "transparent"
              }
              fontSize="sm"
              color={titleColor}
              borderBottom={isLastTrending ? `2px solid` : undefined}
              borderColor={isLastTrending ? trendingBorderColor : undefined}
            >
              {row.getVisibleCells().map((cell, i) => (
                <Td
                  key={cell.id}
                  w={columnWidth[i]}
                  textAlign={cell.column.id === "title" ? "left" : "center"}
                  borderColor={borderColor}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              ))}
            </Tr>
          );
        })}
      </Tbody>
    </ChakraTable>
  );
};
