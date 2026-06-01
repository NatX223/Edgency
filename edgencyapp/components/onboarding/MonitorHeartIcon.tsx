import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { Colors } from '@/constants/tokens';

interface MonitorHeartIconProps {
  size?: number;
  color?: string;
}

export function MonitorHeartIcon({
  size = 64,
  color = Colors.primaryContainer,
}: MonitorHeartIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Monitor/screen outline */}
      <Path
        d="M2 6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V15C22 16.1046 21.1046 17 20 17H4C2.89543 17 2 16.1046 2 15V6Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Stand */}
      <Path
        d="M8 21H16"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Stand stem */}
      <Path
        d="M12 17V21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* ECG / heart pulse line */}
      <Path
        d="M3 10.5H7L8.5 8L10.5 13L12.5 9.5L14 11.5H21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
