// Tesselo — IconUndo
// Seta curvada anti-horária com ponta retornando para a esquerda.
// Minimalista, stroke-only, paleta Neon.

import React from "react";
import Svg, { Path } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
};

export default function IconUndo({ size = 24, color = "#4FD1C5" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Arco de retorno — percorre 3/4 de círculo de raio 7 */}
      <Path
        d="M7 8H14.5C17.538 8 20 10.462 20 13.5C20 16.538 17.538 19 14.5 19H6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Seta apontando para a esquerda na ponta do arco */}
      <Path
        d="M10 5L7 8L10 11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
