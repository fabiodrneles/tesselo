// Tesselo — IconRestart
// Seta circular completa (loop fechado) com ponta no topo-direito.
// Transmite "recomeçar" sem ambiguidade.

import React from "react";
import Svg, { Path } from "react-native-svg";

type Props = {
  size?: number;
  color?: string;
};

export default function IconRestart({ size = 24, color = "#FC8181" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Arco circular quase completo — sentido horário, inicia no topo */}
      <Path
        d="M12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20C16.418 20 20 16.418 20 12C20 9.6 18.96 7.44 17.3 5.94"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Ponta da seta no início do arco (topo-direito) */}
      <Path
        d="M17 3L17.3 5.94L14.4 6.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
