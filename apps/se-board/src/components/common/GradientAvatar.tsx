import { Avatar, AvatarProps, Box, useColorModeValue } from "@chakra-ui/react";
import React from "react";

interface GradientAvatarProps extends AvatarProps {
  gradientStart?: string | null;
  gradientEnd?: string | null;
  /** 그라데이션 링 두께 (px) */
  borderWidth?: number;
  /** 그라데이션과 아바타 사이 갭 두께 (px) */
  gapWidth?: number;
  /** 외곽 glow 효과 여부 */
  glow?: boolean;
}

export const GradientAvatar = ({
  gradientStart,
  gradientEnd,
  borderWidth = 3,
  gapWidth = 2,
  glow = true,
  size,
  ...avatarProps
}: GradientAvatarProps) => {
  const hasFrame = !!gradientStart && !!gradientEnd;
  // 갭 링: 배경색과 동일하게 맞춰야 그라데이션이 분리되어 보임
  const gapColor = useColorModeValue("white", "#1A202C");

  if (!hasFrame) {
    return <Avatar size={size} {...avatarProps} />;
  }

  return (
    <Box
      borderRadius="full"
      p={`${borderWidth}px`}
      background={`linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`}
      display="inline-flex"
      flexShrink={0}
      // 그라데이션 색상으로 은은한 glow 효과 → 어두운 배경에서도 눈에 띔
      boxShadow={
        glow
          ? `0 0 6px 2px ${gradientStart}66, 0 0 12px 2px ${gradientEnd}33`
          : undefined
      }
    >
      {/* 갭 링: 그라데이션과 아바타를 분리해 배경에 묻히지 않게 함 */}
      <Box
        borderRadius="full"
        p={`${gapWidth}px`}
        background={gapColor}
        display="inline-flex"
      >
        <Avatar size={size} {...avatarProps} />
      </Box>
    </Box>
  );
};
