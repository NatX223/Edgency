import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/tokens';

interface ShieldIconProps {
  size?: number;
  color?: string;
}

export function ShieldIcon({ size = 64, color = Colors.primaryContainer }: ShieldIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Shield outline */}
      <Path
        d="M12 2L4 5.5V11C4 15.418 7.582 19.618 12 21C16.418 19.618 20 15.418 20 11V5.5L12 2Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <Path
        d="M8.5 12L10.8 14.3L15.5 9.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
