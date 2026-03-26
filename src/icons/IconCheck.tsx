// Tesselo — IconCheck
// Visto (checkmark) arredondado com círculo de fundo.
// Usado no VictoryModal ao completar um nível.

import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
};

export default function IconCheck({ size = 56, color = "#68D391" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      {/* Círculo de fundo semi-transparente */}
      <Circle cx={28} cy={28} r={26} fill={color} opacity={0.15} />
      {/* Anel */}
      <Circle
        cx={28} cy={28} r={24}
        stroke={color}
        strokeWidth={2}
        opacity={0.4}
      />
      {/* Checkmark — traço arredondado */}
      <Path
        d="M17 28.5L24.5 36L39 21"
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
