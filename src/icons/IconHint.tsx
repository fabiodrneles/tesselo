// Tesselo — IconHint
// Lâmpada minimalista: bulbo circular + base retangular + raios de luz.
// Representa a dica do número no grid.

import React from "react";
import Svg, { Path, Line } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
};

export default function IconHint({ size = 24, color = "#F6AD55" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bulbo da lâmpada */}
      <Path
        d="M12 3C8.686 3 6 5.686 6 9C6 11.22 7.21 13.163 9 14.197V16C9 16.552 9.448 17 10 17H14C14.552 17 15 16.552 15 16V14.197C16.79 13.163 18 11.22 18 9C18 5.686 15.314 3 12 3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Base / soquete */}
      <Path
        d="M10 17H14V19C14 19.552 13.552 20 13 20H11C10.448 20 10 19.552 10 19V17Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Filamento interno — linha horizontal dentro do bulbo */}
      <Line
        x1="10"
        y1="13"
        x2="14"
        y2="13"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
