// Tesselo – SLICE 4 (fixed)
// ShapeDrawer: transparent overlay that captures pan gestures and renders
// the in-progress rectangle on the UI thread via Reanimated.
//
// Fixes applied:
//  - Bidirectional drag: rectangle expands in all 4 directions from hint cell
//  - Counter text uses useState (not useAnimatedProps) — compatible with Reanimated 4
//  - pointerEvents moved to style prop (not deprecated JSX prop)

import React, { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Shape } from "../utils/generator";

// ---------------------------------------------------------------------------
// Palette – must match tailwind.config.js
// ---------------------------------------------------------------------------

const SHAPE_COLORS = [
  "#4FD1C5", // teal_neon
  "#F6AD55", // orange_sun
  "#B794F4", // purple_lav
  "#FC8181", // coral_soft
] as const;

const COLOR_SUCCESS = "#68D391";
const COLOR_OVERLAP = "#FC8181";

function colorForIndex(index: number): string {
  return SHAPE_COLORS[index % SHAPE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShapeDrawerProps = {
  gridSize: number;
  cellSize: number;
  puzzleShapes: Shape[];
  placedShapes: Shape[];
  onShapeComplete: (shape: Shape) => void;
};

// ---------------------------------------------------------------------------
// Helpers (JS thread)
// ---------------------------------------------------------------------------

function findHintAt(shapes: Shape[], col: number, row: number): Shape | null {
  for (const s of shapes) {
    if (s.hintCol === col && s.hintRow === row) return s;
  }
  return null;
}

function isCellOccupied(shapes: Shape[], col: number, row: number): boolean {
  for (const s of shapes) {
    if (
      col >= s.col &&
      col < s.col + s.width &&
      row >= s.row &&
      row < s.row + s.height
    ) {
      return true;
    }
  }
  return false;
}

function rectangleHasOverlap(
  placed: Shape[],
  sCol: number,
  sRow: number,
  eCol: number,
  eRow: number
): boolean {
  for (let c = sCol; c <= eCol; c++) {
    for (let r = sRow; r <= eRow; r++) {
      if (isCellOccupied(placed, c, r)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShapeDrawer({
  gridSize,
  cellSize,
  puzzleShapes,
  placedShapes,
  onShapeComplete,
}: ShapeDrawerProps) {
  const totalPixels = cellSize * gridSize;

  // ---- Shared values (UI thread) ----
  const isDrawing   = useSharedValue(false);
  const startCol    = useSharedValue(0);
  const startRow    = useSharedValue(0);
  const endCol      = useSharedValue(0);
  const endRow      = useSharedValue(0);
  const requiredValue = useSharedValue(0);
  const colorIndex  = useSharedValue(0);
  const currentArea = useSharedValue(0);
  const requiredArea = useSharedValue(0);
  const hasOverlap  = useSharedValue(false);
  const counterX    = useSharedValue(0);
  const counterY    = useSharedValue(0);

  // ---- JS-thread refs ----
  const puzzleShapesRef = React.useRef(puzzleShapes);
  puzzleShapesRef.current = puzzleShapes;

  const placedShapesRef = React.useRef(placedShapes);
  placedShapesRef.current = placedShapes;

  const colorIndexRef = React.useRef(placedShapes.length);
  colorIndexRef.current = placedShapes.length;

  // Stores the hint cell position for the current drag (bidirectional anchor)
  const hintPosRef = React.useRef({ col: 0, row: 0 });

  // Counter text rendered as regular React state — no useAnimatedProps needed
  const [counterText, setCounterText] = useState("0/0");

  // ---- JS-thread callbacks (called via runOnJS) ----

  const beginDraw = useCallback((col: number, row: number) => {
    const hint = findHintAt(puzzleShapesRef.current, col, row);
    if (!hint) return;
    if (isCellOccupied(placedShapesRef.current, col, row)) return;

    // Anchor point: the hint cell stays inside the rectangle at all times
    hintPosRef.current = { col, row };

    isDrawing.value    = true;
    startCol.value     = col;
    startRow.value     = row;
    endCol.value       = col;
    endRow.value       = row;
    requiredValue.value = hint.value;
    currentArea.value  = 1;
    requiredArea.value = hint.value;
    hasOverlap.value   = false;
    colorIndex.value   = colorIndexRef.current;
    setCounterText(`1/${hint.value}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDraw = useCallback(
    (col: number, row: number, fingerX: number, fingerY: number) => {
      if (!isDrawing.value) return;

      const hintC = hintPosRef.current.col;
      const hintR = hintPosRef.current.row;

      // Clamp finger position inside the grid
      const cCol = Math.max(0, Math.min(col, gridSize - 1));
      const cRow = Math.max(0, Math.min(row, gridSize - 1));

      // Bidirectional snap: rectangle always includes the hint cell
      const sCol = Math.min(hintC, cCol);
      const sRow = Math.min(hintR, cRow);
      const eCol = Math.max(hintC, cCol);
      const eRow = Math.max(hintR, cRow);

      startCol.value = sCol;
      startRow.value = sRow;
      endCol.value   = eCol;
      endRow.value   = eRow;

      const area = (eCol - sCol + 1) * (eRow - sRow + 1);
      currentArea.value = area;
      counterX.value    = fingerX;
      counterY.value    = fingerY;

      hasOverlap.value = rectangleHasOverlap(
        placedShapesRef.current,
        sCol, sRow, eCol, eRow
      );

      // Update counter label directly on JS thread — no animated props needed
      setCounterText(`${area}/${requiredValue.value}`);
    },
    [gridSize] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const confirmDraw = useCallback(() => {
    if (!isDrawing.value) return;

    const sCol   = startCol.value;
    const sRow   = startRow.value;
    const eCol   = endCol.value;
    const eRow   = endRow.value;
    const width  = eCol - sCol + 1;
    const height = eRow - sRow + 1;
    const area   = width * height;

    isDrawing.value  = false;
    hasOverlap.value = false;

    if (area !== requiredValue.value) return;

    // Use the stored hint position (not sCol/sRow) to find the puzzle shape
    const hint = findHintAt(
      puzzleShapesRef.current,
      hintPosRef.current.col,
      hintPosRef.current.row
    );
    if (!hint) return;

    const newShape: Shape = {
      id:      `placed-${Date.now()}`,
      value:   area,
      col:     sCol,
      row:     sRow,
      width,
      height,
      hintCol: hint.hintCol,
      hintRow: hint.hintRow,
    };

    onShapeComplete(newShape);
  }, [onShapeComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelDraw = useCallback(() => {
    isDrawing.value  = false;
    hasOverlap.value = false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Pan gesture (worklet → runOnJS → JS thread) ----

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      "worklet";
      runOnJS(beginDraw)(
        Math.floor(e.x / cellSize),
        Math.floor(e.y / cellSize)
      );
    })
    .onUpdate((e) => {
      "worklet";
      runOnJS(updateDraw)(
        Math.floor(e.x / cellSize),
        Math.floor(e.y / cellSize),
        e.x,
        e.y
      );
    })
    .onEnd(() => {
      "worklet";
      runOnJS(confirmDraw)();
    })
    .onFinalize(() => {
      "worklet";
      runOnJS(cancelDraw)();
    });

  // ---- Animated style: in-progress rectangle ----

  const animatedRectStyle = useAnimatedStyle(() => {
    if (!isDrawing.value) {
      return { opacity: 0, width: 0, height: 0, left: 0, top: 0 };
    }

    const sCol = startCol.value;
    const sRow = startRow.value;
    const eCol = endCol.value;
    const eRow = endRow.value;

    let bgColor: string;
    let opacity: number;

    if (hasOverlap.value) {
      bgColor = COLOR_OVERLAP;
      opacity = 0.7;
    } else if (currentArea.value === requiredArea.value && requiredArea.value > 0) {
      bgColor = COLOR_SUCCESS;
      opacity = 0.9;
    } else {
      bgColor = SHAPE_COLORS[colorIndex.value % SHAPE_COLORS.length];
      opacity = 0.6;
    }

    return {
      left:            sCol * cellSize,
      top:             sRow * cellSize,
      width:           (eCol - sCol + 1) * cellSize,
      height:          (eRow - sRow + 1) * cellSize,
      opacity,
      backgroundColor: bgColor,
    };
  });

  // ---- Animated style: floating counter badge ----

  const counterContainerStyle = useAnimatedStyle(() => {
    if (!isDrawing.value) return { opacity: 0 };
    return {
      opacity: 1,
      left: counterX.value - 28,
      top:  counterY.value - 48,
    };
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { width: totalPixels, height: totalPixels },
        ]}
      >
        {/* Confirmed placed shapes as colored overlays */}
        {placedShapes.map((shape, idx) => (
          <Animated.View
            key={shape.id}
            style={{
              position:        "absolute",
              left:            shape.col * cellSize,
              top:             shape.row * cellSize,
              width:           shape.width * cellSize,
              height:          shape.height * cellSize,
              backgroundColor: colorForIndex(idx),
              opacity:         0.65,
              borderRadius:    3,
            }}
          />
        ))}

        {/* In-progress rectangle */}
        <Animated.View
          style={[
            {
              position:    "absolute",
              borderRadius: 3,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.6)",
            },
            animatedRectStyle,
          ]}
        />

        {/* Floating area counter — regular Text inside Animated.View */}
        <Animated.View
          style={[
            styles.counterBadge,
            counterContainerStyle,
            { pointerEvents: "none" },
          ]}
        >
          <Text style={styles.counterText}>{counterText}</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  counterBadge: {
    position:        "absolute",
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius:    8,
    paddingHorizontal: 10,
    paddingVertical:   4,
    minWidth:        44,
    alignItems:      "center",
    justifyContent:  "center",
  },
  counterText: {
    color:         "#FFFFFF",
    fontSize:      14,
    fontWeight:    "600",
    letterSpacing: 0.5,
  },
});
