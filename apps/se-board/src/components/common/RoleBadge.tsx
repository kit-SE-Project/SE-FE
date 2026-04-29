import { Box, Tooltip } from "@chakra-ui/react";
import React from "react";
import { BsCheckLg } from "react-icons/bs";

const CrowIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <ellipse cx="11" cy="15" rx="5.5" ry="4" transform="rotate(-12 11 15)" />
    <circle cx="17" cy="8.5" r="3.5" />
    <path d="M20.2 7.5 L24 8.5 L20.2 9.5 Z" />
    <path d="M6.5 14 L2 11.5 L3 15.5 L1.5 19 L5 17 L5.5 19.5 L7 16 Z" />
    <circle cx="18.2" cy="7.8" r="1" fill="white" />
  </svg>
);

interface RoleBadgeProps {
  badgeType: "CHECK" | "KUMOH_CROW" | null | undefined;
  badgeLabel: string | null | undefined;
  size?: "sm" | "md";
}

const SIZE = {
  sm: { box: "14px", icon: "8px" },
  md: { box: "18px", icon: "11px" },
};

export const RoleBadge = ({
  badgeType,
  badgeLabel,
  size = "sm",
}: RoleBadgeProps) => {
  if (!badgeType) return null;

  const { box, icon } = SIZE[size];
  const label = badgeLabel ?? "";

  if (badgeType === "CHECK") {
    return (
      <Tooltip label={label} hasArrow placement="top">
        <Box
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          w={box}
          h={box}
          borderRadius="full"
          bg="#3897F0"
          flexShrink={0}
        >
          <BsCheckLg color="white" size={icon} />
        </Box>
      </Tooltip>
    );
  }

  if (badgeType === "KUMOH_CROW") {
    return (
      <Tooltip label={label} hasArrow placement="top">
        <Box
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          w={box}
          h={box}
          borderRadius="full"
          bg="gray.500"
          flexShrink={0}
        >
          <CrowIcon width={icon} height={icon} color="white" />
        </Box>
      </Tooltip>
    );
  }

  return null;
};
