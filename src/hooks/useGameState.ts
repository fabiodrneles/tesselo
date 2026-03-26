// Tesselo – SLICE 5A
// useGameState: central state manager for a puzzle session.

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  generateTesselo,
  getGridSizeForDifficulty,
  Difficulty,
  Shape,
  GeneratorResult,
} from "../utils/generator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when two shapes share at least one cell. */
function shapesOverlap(a: Shape, b: Shape): boolean {
  const aRight = a.col + a.width;
  const aBottom = a.row + a.height;
  const bRight = b.col + b.width;
  const bBottom = b.row + b.height;

  return a.col < bRight && aRight > b.col && a.row < bBottom && aBottom > b.row;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type GameState = ReturnType<typeof useGameState>;

export function useGameState(initialDifficulty: Difficulty) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [puzzle, setPuzzle] = useState<GeneratorResult>(() =>
    generateTesselo(initialDifficulty)
  );
  const [placedShapes, setPlacedShapes] = useState<Shape[]>([]);
  const [level, setLevel] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start/stop the timer based on victory state
  const isVictoryRef = useRef(false);

  // Set of hint positions that already have a confirmed placed shape
  const usedHints = useMemo(
    () =>
      new Set<string>(
        placedShapes.map((s) => `${s.hintCol},${s.hintRow}`)
      ),
    [placedShapes]
  );

  // Puzzle shapes that have not yet been drawn by the player
  const pendingHints = useMemo(
    () =>
      puzzle.shapes.filter(
        (s) => !usedHints.has(`${s.hintCol},${s.hintRow}`)
      ),
    [puzzle.shapes, usedHints]
  );

  /**
   * Validates a candidate shape:
   *  1. Its area must equal the value of the hint it covers.
   *  2. It must not overlap with any already-placed shape.
   *  3. It must stay within grid bounds.
   */
  const isValidShape = useCallback(
    (newShape: Shape): boolean => {
      const gridSize = puzzle.gridSize;

      // Bounds check
      if (
        newShape.col < 0 ||
        newShape.row < 0 ||
        newShape.col + newShape.width > gridSize ||
        newShape.row + newShape.height > gridSize
      ) {
        return false;
      }

      // Area must match the hint value
      if (newShape.width * newShape.height !== newShape.value) {
        return false;
      }

      // No overlap with confirmed shapes
      for (const placed of placedShapes) {
        if (shapesOverlap(newShape, placed)) {
          return false;
        }
      }

      return true;
    },
    [puzzle.gridSize, placedShapes]
  );

  /** Adds a validated shape to the board. */
  const addShape = useCallback((shape: Shape) => {
    setPlacedShapes((prev) => [...prev, shape]);
  }, []);

  /** Removes the most recently placed shape (Undo button). */
  const undoLastShape = useCallback(() => {
    setPlacedShapes((prev) => prev.slice(0, -1));
  }, []);

  /**
   * Victory condition:
   *   – Every puzzle hint has a corresponding placed shape.
   *   – The number of placed shapes matches the puzzle's total shapes.
   * (The area coverage invariant is guaranteed by isValidShape.)
   */
  const isVictory = useMemo(
    () =>
      pendingHints.length === 0 &&
      placedShapes.length === puzzle.shapes.length,
    [pendingHints.length, placedShapes.length, puzzle.shapes.length]
  );

  // Timer: tick every second while not victorious
  useEffect(() => {
    isVictoryRef.current = isVictory;
    if (isVictory) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        if (!isVictoryRef.current) {
          setElapsedSeconds((s) => s + 1);
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isVictory]);

  /** Advances to the next difficulty level and generates a new puzzle. */
  const nextLevel = useCallback(() => {
    const nextDifficulty: Difficulty =
      difficulty < 4 ? ((difficulty + 1) as Difficulty) : 4;
    setDifficulty(nextDifficulty);
    setPuzzle(generateTesselo(nextDifficulty));
    setPlacedShapes([]);
    setLevel((l) => l + 1);
    setElapsedSeconds(0);
    isVictoryRef.current = false;
  }, [difficulty]);

  return {
    difficulty,
    level,
    elapsedSeconds,
    puzzle,
    placedShapes,
    completedShapes: placedShapes.length,
    pendingHints,
    isValidShape,
    addShape,
    undoLastShape,
    isVictory,
    nextLevel,
    gridSize: puzzle.gridSize,
    cellCount: getGridSizeForDifficulty(difficulty),
  };
}
