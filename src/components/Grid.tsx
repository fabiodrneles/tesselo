// Tesselo – SLICE 3 update
// Grid: renders the base cell structure (hint numbers) plus confirmed placed
// shape overlays. It also exposes cellSize to the parent via a callback ref.

import React from "react";
import { View, Text, Dimensions } from "react-native";
import { Shape } from "../utils/generator";

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

      {/* Placed shape overlays are rendered by ShapeDrawer to avoid double-painting */}
    </View>
  );
}
