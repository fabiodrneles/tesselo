// Tesselo — IconLogo
// Grid 3×3 com dois retângulos coloridos encaixados sem sobreposição —
// a mecânica central do jogo representada como marca.
//
// Layout (viewBox 48×48, grid de 3×3 células de 12px com gap de 3px):
//
//   ┌──────────────┬──────┐
//   │              │  B   │
//   │      A       ├──────┤
//   │              │  C   │
//   ├──────┬───────┴──────┤
//   │  D   │      E       │
//   └──────┴──────────────┘
//
//  A = teal    (col 0–1, row 0–1)  valor 4
//  B = orange  (col 2,   row 0)    valor 1  — apenas indicador, sem borda
//  C = purple  (col 2,   row 1)    valor 1
//  D = coral   (col 0,   row 2)    valor 1
//  E = teal    (col 1–2, row 2)    valor 2

import React from "react";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

type Props = {
  size?: number;
  // color sobrescreve apenas o retângulo principal (A); os demais usam a paleta fixa
  color?: string;
};

// Geometria: 3 colunas + 3 linhas, célula = 13px, gap = 2px, padding = 3px
const PAD  = 3;
const CELL = 13;
const GAP  = 2;
const R    = 3; // border-radius dos rects

function x(col: number) {
  return PAD + col * (CELL + GAP);
}
function y(row: number) {
  return PAD + row * (CELL + GAP);
}
function w(span: number) {
  return span * CELL + (span - 1) * GAP;
}

export default function IconLogo({ size = 48, color = "#4FD1C5" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* ── Shape A — teal 2×2 (canto superior esquerdo) ── */}
      <Rect
        x={x(0)} y={y(0)}
        width={w(2)} height={w(2)}
        rx={R} ry={R}
        fill={color}
        opacity={0.85}
      />

      {/* ── Shape B — orange 1×1 (canto superior direito) ── */}
      <Rect
        x={x(2)} y={y(0)}
        width={w(1)} height={w(1)}
        rx={R} ry={R}
        fill="#F6AD55"
        opacity={0.85}
      />

      {/* ── Shape C — purple 1×1 (meio direita) ── */}
      <Rect
        x={x(2)} y={y(1)}
        width={w(1)} height={w(1)}
        rx={R} ry={R}
        fill="#B794F4"
        opacity={0.85}
      />

      {/* ── Shape D — coral 1×1 (canto inferior esquerdo) ── */}
      <Rect
        x={x(0)} y={y(2)}
        width={w(1)} height={w(1)}
        rx={R} ry={R}
        fill="#FC8181"
        opacity={0.85}
      />

      {/* ── Shape E — teal 2×1 (inferior centro-direita) ── */}
      <Rect
        x={x(1)} y={y(2)}
        width={w(2)} height={w(1)}
        rx={R} ry={R}
        fill={color}
        opacity={0.55}
      />

      {/* ── Número indicador no shape A (valor 4) ── */}
      <SvgText
        x={x(0) + w(2) / 2}
        y={y(0) + w(2) / 2 + 4.5}
        fontSize={12}
        fontWeight="bold"
        fill="rgba(255,255,255,0.9)"
        textAnchor="middle"
      >
        4
      </SvgText>
    </Svg>
  );
}
