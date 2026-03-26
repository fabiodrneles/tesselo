// Tesselo – SLICE 4 (fixed)
// ShapeDrawer: transparent overlay that captures pan gestures and renders
// the in-progress rectangle on the UI thread via Reanimated.
//
// Fixes applied:
//  - Bidirectional drag: rectangle expands in all 4 directions from hint cell
//  - Counter text uses useState (not useAnimatedProps) — compatible with Reanimated 4
//  - pointerEvents moved to style prop (not deprecated JSX prop)

import React, { useCallback, useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  runOnUI,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Gesture, GestureDetector, State } from "react-native-gesture-handler";
import { Shape } from "../utils/generator";

// ---------------------------------------------------------------------------
// Palette – must match tailwind.config.js
// ---------------------------------------------------------------------------

// Solid hex colors — used for the in-progress rect (opacity via animated style)
const SHAPE_COLORS = [
  "#4FD1C5", // teal_neon
  "#F6AD55", // orange_sun
  "#B794F4", // purple_lav
  "#FC8181", // coral_soft
] as const;

// Semi-transparent rgba variants — used for confirmed placed shapes so that
// text children (hint numbers) can have full opacity independently.
const SHAPE_COLORS_PLACED = [
  "rgba(79,209,197,0.72)",   // teal_neon
  "rgba(246,173,85,0.72)",   // orange_sun
  "rgba(183,148,244,0.72)",  // purple_lav
  "rgba(252,129,129,0.72)",  // coral_soft
] as const;

const COLOR_SUCCESS = "#68D391";
const COLOR_OVERLAP = "#FC8181";

function colorForIndex(index: number): string {
  return SHAPE_COLORS[index % SHAPE_COLORS.length];
}

function placedColorForIndex(index: number): string {
  return SHAPE_COLORS_PLACED[index % SHAPE_COLORS_PLACED.length];
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
  /** Called when the player releases with wrong area or overlap — use for haptic error */
  onShapeRejected?: () => void;
  /** Called once when a valid hint cell is first touched — use for click sound */
  onCellTouch?: () => void;
  /** Called once per drag when the area first equals the required value — use for match sound */
  onAreaMatch?: () => void;
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

/**
 * Builds a Set of "col,row" keys from all cells occupied by placed shapes.
 * O(total_placed_area) — runs once per shape placement, not per gesture frame.
 */
function buildOccupiedSet(shapes: Shape[]): Set<string> {
  const set = new Set<string>();
  for (const s of shapes) {
    for (let c = s.col; c < s.col + s.width; c++) {
      for (let r = s.row; r < s.row + s.height; r++) {
        set.add(`${c},${r}`);
      }
    }
  }
  return set;
}

/**
 * O(drag_area) overlap check using the pre-built occupied set.
 * Replaces the previous O(drag_area × n_shapes) nested loop.
 */
function rectangleHasOverlapFast(
  occupied: Set<string>,
  sCol: number,
  sRow: number,
  eCol: number,
  eRow: number
): boolean {
  for (let c = sCol; c <= eCol; c++) {
    for (let r = sRow; r <= eRow; r++) {
      if (occupied.has(`${c},${r}`)) return true;
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
  onShapeRejected,
  onCellTouch,
  onAreaMatch,
}: ShapeDrawerProps) {
  const totalPixels = cellSize * gridSize;

  // ---- Shared values (UI thread) ----
  const isDrawing    = useSharedValue(false);
  const startCol     = useSharedValue(0);
  const startRow     = useSharedValue(0);
  const endCol       = useSharedValue(0);
  const endRow       = useSharedValue(0);
  const colorIndex   = useSharedValue(0);
  const currentArea  = useSharedValue(0);
  const requiredArea = useSharedValue(0);
  const hasOverlap   = useSharedValue(false);
  const counterX     = useSharedValue(0);
  const counterY     = useSharedValue(0);

  // Rejection flash: brief red ghost rect shown when the player releases incorrectly
  const rejectOpacity = useSharedValue(0);
  const rejectLeft    = useSharedValue(0);
  const rejectTop     = useSharedValue(0);
  const rejectWidth   = useSharedValue(0);
  const rejectHeight  = useSharedValue(0);

  // ---- JS-thread refs ----
  const puzzleShapesRef = React.useRef(puzzleShapes);
  puzzleShapesRef.current = puzzleShapes;

  const placedShapesRef = React.useRef(placedShapes);
  placedShapesRef.current = placedShapes;

  const colorIndexRef = React.useRef(placedShapes.length);
  colorIndexRef.current = placedShapes.length;

  // Stores the hint cell position for the current drag (bidirectional anchor)
  const hintPosRef = React.useRef({ col: 0, row: 0 });

  // Mutex: prevents a second gesture from overwriting state before the first
  // confirmDraw/cancelDraw has resolved on the JS thread.
  const isProcessingRef = React.useRef(false);

  // Pre-built Set of occupied "col,row" keys — rebuilt once per shape placement,
  // gives O(1) cell lookup instead of O(n_shapes) per gesture frame.
  const occupiedCellsRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    occupiedCellsRef.current = buildOccupiedSet(placedShapes);
  }, [placedShapes]);

  // Prevents match sound from firing on every update frame when area is exact
  const matchSoundFiredRef = React.useRef(false);

  // Counter text rendered as regular React state — no useAnimatedProps needed
  const [counterText, setCounterText] = useState("0/0");

  // ---- JS-thread callbacks (called via runOnJS) ----

  const beginDraw = useCallback((col: number, row: number) => {
    // Guard: ignore if a previous gesture is still resolving on the JS thread
    if (isProcessingRef.current) return;

    // Rebuild the occupied set synchronously so it's never stale at gesture start
    occupiedCellsRef.current = buildOccupiedSet(placedShapesRef.current);

    const hint = findHintAt(puzzleShapesRef.current, col, row);
    if (!hint) return;
    if (occupiedCellsRef.current.has(`${col},${row}`)) return;

    isProcessingRef.current = true;

    // Anchor point: the hint cell stays inside the rectangle at all times
    hintPosRef.current = { col, row };

    isDrawing.value    = true;
    startCol.value     = col;
    startRow.value     = row;
    endCol.value       = col;
    endRow.value       = row;
    currentArea.value  = 1;
    requiredArea.value = hint.value;
    hasOverlap.value   = false;
    colorIndex.value   = colorIndexRef.current;
    matchSoundFiredRef.current = false;
    setCounterText(`1/${hint.value}`);
    onCellTouch?.();
  }, [onCellTouch]); // eslint-disable-line react-hooks/exhaustive-deps

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

      hasOverlap.value = rectangleHasOverlapFast(
        occupiedCellsRef.current,
        sCol, sRow, eCol, eRow
      );

      // Match sound — fires once per drag when area first equals required
      if (area === requiredArea.value) {
        if (!matchSoundFiredRef.current) {
          matchSoundFiredRef.current = true;
          onAreaMatch?.();
        }
      } else {
        // Reset so the sound re-fires if player changes size and comes back
        matchSoundFiredRef.current = false;
      }

      setCounterText(`${area}/${requiredArea.value}`);
    },
    [gridSize, onAreaMatch] // eslint-disable-line react-hooks/exhaustive-deps
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
    const hasOv  = hasOverlap.value;

    // Clear drawing state and release mutex before any early returns
    isDrawing.value  = false;
    hasOverlap.value = false;
    isProcessingRef.current = false;

    // Reject: wrong area OR overlap detected
    if (area !== requiredArea.value || hasOv) {
      // Trigger red flash on the UI thread at the last known rect position
      const fl = sCol * cellSize;
      const ft = sRow * cellSize;
      const fw = width * cellSize;
      const fh = height * cellSize;
      runOnUI(() => {
        "worklet";
        rejectLeft.value   = fl;
        rejectTop.value    = ft;
        rejectWidth.value  = fw;
        rejectHeight.value = fh;
        rejectOpacity.value = withSequence(
          withTiming(0.75, { duration: 30 }),
          withTiming(0,    { duration: 300 })
        );
      })();
      onShapeRejected?.();
      return;
    }

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
  }, [onShapeComplete, onShapeRejected, cellSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelDraw = useCallback(() => {
    isDrawing.value  = false;
    hasOverlap.value = false;
    isProcessingRef.current = false;
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
    .onFinalize((e) => {
      "worklet";
      // onFinalize fires after BOTH onEnd (success) and on cancel/fail.
      // Only call cancelDraw for true cancellations — on normal END, confirmDraw
      // already handled cleanup. Calling cancelDraw after confirmDraw would race.
      if (e.state !== State.END) {
        runOnJS(cancelDraw)();
      }
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

  // ---- Animated style: rejection flash rect ----

  const rejectFlashStyle = useAnimatedStyle(() => ({
    position:        "absolute",
    left:            rejectLeft.value,
    top:             rejectTop.value,
    width:           rejectWidth.value,
    height:          rejectHeight.value,
    opacity:         rejectOpacity.value,
    backgroundColor: "#FC8181",
    borderRadius:    4,
    borderWidth:     2,
    borderColor:     "#FF4444",
  }));

  // ---- Animated style: floating counter badge ----
  // Clamped so the badge never escapes the grid bounds near the edges.
  const BADGE_W = 60;
  const BADGE_H = 30;

  const counterContainerStyle = useAnimatedStyle(() => {
    if (!isDrawing.value) return { opacity: 0 };
    const rawLeft = counterX.value - BADGE_W / 2;
    const rawTop  = counterY.value - BADGE_H - 10;
    return {
      opacity: 1,
      left: Math.max(0, Math.min(rawLeft, totalPixels - BADGE_W)),
      top:  Math.max(4, Math.min(rawTop,  totalPixels - BADGE_H)),
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
        {/* Confirmed placed shapes — rgba background so the hint text has full opacity */}
        {placedShapes.map((shape, idx) => {
          // Pixel position of the hint cell relative to the shape's top-left corner
          const hintRelLeft = (shape.hintCol - shape.col) * cellSize;
          const hintRelTop  = (shape.hintRow - shape.row) * cellSize;
          return (
            <View
              key={shape.id}
              style={{
                position:        "absolute",
                left:            shape.col * cellSize,
                top:             shape.row * cellSize,
                width:           shape.width * cellSize,
                height:          shape.height * cellSize,
                backgroundColor: placedColorForIndex(idx),
                borderRadius:    3,
              }}
            >
              {/* Hint number — confirms which value this shape solved */}
              <Text
                style={{
                  position:   "absolute",
                  left:       hintRelLeft,
                  top:        hintRelTop,
                  width:      cellSize,
                  height:     cellSize,
                  textAlign:  "center",
                  lineHeight: cellSize,
                  fontSize:   cellSize * 0.34,
                  fontWeight: "bold",
                  color:      "rgba(255,255,255,0.75)",
                }}
                numberOfLines={1}
              >
                {shape.value}
              </Text>
            </View>
          );
        })}

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

        {/* Rejection flash — briefly shows a red ghost rect when the player releases incorrectly */}
        <Animated.View style={[styles.rejectFlash, rejectFlashStyle]} />

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
  rejectFlash: {
    // Base style only — geometry and opacity come from rejectFlashStyle
    pointerEvents: "none",
  },
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
