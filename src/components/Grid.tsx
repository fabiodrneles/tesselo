// Tesselo – SLICE 3 update
// Grid: renders the base cell structure (hint numbers) plus confirmed placed
// shape overlays. It also exposes cellSize to the parent via a callback ref.

import React from "react";
import { View, Text, Dimensions } from "react-native";
import { Shape } from "../utils/generator";

// ---------------------------------------------------------------------------
// Palette (mirrors tailwind.config.js)
// ---------------------------------------------------------------------------

const SHAPE_COLORS = [
  "#4FD1C5", // teal_neon
  "#F6AD55", // orange_sun
  "#B794F4", // purple_lav
  "#FC8181", // coral_soft
] as const;

function colorForIndex(index: number): string {
  return SHAPE_COLORS[index % SHAPE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CellProps = {
  cellSize: number;
  hintValue: number | null;
};

type GridProps = {
  size: 4 | 5 | 6 | 8;
  /** Puzzle hint shapes – only hint numbers are rendered, not fills. */
  shapes: Shape[];
  /** Confirmed placed shapes – rendered as semi-transparent colored rects. */
  placedShapes?: Shape[];
  /** Called once the cellSize is computed, so the parent can pass it down to ShapeDrawer. */
  onCellSize?: (size: number) => void;
};

// ---------------------------------------------------------------------------
// Cell – memoized so drags don't repaint the whole grid
// ---------------------------------------------------------------------------

const Cell = React.memo(function Cell({ cellSize, hintValue }: CellProps) {
  return (
    <View
      className="border border-grid_line items-center justify-center"
      style={{ width: cellSize, height: cellSize }}
    >
      {hintValue !== null && (
        <Text
          className="text-white font-bold"
          style={{ fontSize: cellSize * 0.38 }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {hintValue}
        </Text>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export default function Grid({
  size,
  shapes,
  placedShapes = [],
  onCellSize,
}: GridProps) {
  const screenWidth = Dimensions.get("window").width;
  const padding = 32;
  const gridPixelSize = screenWidth - padding * 2;
  const cellSize = Math.floor(gridPixelSize / size);
  const totalSize = cellSize * size;

  // Inform parent of computed cellSize (stable value – only changes when size changes)
  React.useEffect(() => {
    onCellSize?.(cellSize);
  }, [cellSize, onCellSize]);

  // Build hint lookup map: "col,row" → value
  const hintMap = React.useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const shape of shapes) {
      map.set(`${shape.hintCol},${shape.hintRow}`, shape.value);
    }
    return map;
  }, [shapes]);

  return (
    <View
      className="border border-grid_line"
      style={{ width: totalSize, height: totalSize }}
    >
      {/* Base cell grid */}
      {Array.from({ length: size }).map((_, row) => (
        <View key={row} className="flex-row">
          {Array.from({ length: size }).map((_, col) => {
            const hintValue = hintMap.get(`${col},${row}`) ?? null;
            return (
              <Cell
                key={col}
                cellSize={cellSize}
                hintValue={hintValue}
              />
            );
          })}
        </View>
      ))}

      {/* Confirmed placed shape overlays (absolute, sit on top of cells) */}
      {placedShapes.map((shape, idx) => (
        <View
          key={shape.id}
          style={{
            position: "absolute",
            left: shape.col * cellSize,
            top: shape.row * cellSize,
            width: shape.width * cellSize,
            height: shape.height * cellSize,
            backgroundColor: colorForIndex(idx),
            opacity: 0.65,
            borderRadius: 3,
          }}
        />
      ))}
    </View>
  );
}
