import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@/constants/tokens';

interface PeopleIconProps {
  size?: number;
  color?: string;
}

export function PeopleIcon({ size = 64, color = Colors.primaryContainer }: PeopleIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Center person */}
      <Circle cx="12" cy="7" r="3" stroke={color} strokeWidth="1.8" />
      <Path
        d="M6 21V19C6 16.791 8.686 15 12 15C15.314 15 18 16.791 18 19V21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Left person */}
      <Circle cx="5" cy="9" r="2.2" stroke={color} strokeWidth="1.6" />
      <Path
        d="M2 21V19.5C2 17.85 3.343 16.5 5 16.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Right person */}
      <Circle cx="19" cy="9" r="2.2" stroke={color} strokeWidth="1.6" />
      <Path
        d="M22 21V19.5C22 17.85 20.657 16.5 19 16.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Svg>
  );
}
