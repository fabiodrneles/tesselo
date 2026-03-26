// Tesselo – SLICE 5A
// useGameState: central state manager for a puzzle session.

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  generateTesselo,
  getGridSizeForDifficulty,
  Difficulty,
  Shape,
  GeneratorResult,
} from "../utils/generator";
import { saveProgress, loadProgress } from "../utils/storage";

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
  // Incrementing this value forces the timer useEffect to cleanly restart
  const [timerEpoch, setTimerEpoch] = useState(0);
  // True while AsyncStorage is being read on first mount
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // Load saved progress once on mount
  useEffect(() => {
    loadProgress().then((saved) => {
      if (saved) {
        setDifficulty(saved.difficulty);
        setLevel(saved.level);
        setPuzzle(generateTesselo(saved.difficulty));
        setTimerEpoch((e) => e + 1);
      }
      setIsLoadingProgress(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist whenever difficulty or level changes (skip initial loading pass)
  useEffect(() => {
    if (!isLoadingProgress) {
      saveProgress(difficulty, level);
    }
  }, [difficulty, level, isLoadingProgress]);

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
   *  1. The hint (hintCol/hintRow) must exist in pendingHints.
   *  2. The drawn area must match the puzzle's required value for that hint.
   *  3. The shape must stay within grid bounds.
   *  4. The shape must not overlap with any already-placed shape.
   */
  const isValidShape = useCallback(
    (newShape: Shape): boolean => {
      const gridSize = puzzle.gridSize;

      // Hint must belong to a pending (not yet solved) puzzle hint
      const puzzleHint = pendingHints.find(
        (s) => s.hintCol === newShape.hintCol && s.hintRow === newShape.hintRow
      );
      if (!puzzleHint) return false;

      // Area drawn must match the puzzle's required value for that hint
      if (newShape.width * newShape.height !== puzzleHint.value) return false;

      // Bounds check
      if (
        newShape.col < 0 ||
        newShape.row < 0 ||
        newShape.col + newShape.width > gridSize ||
        newShape.row + newShape.height > gridSize
      ) {
        return false;
      }

      // No overlap with confirmed shapes
      for (const placed of placedShapes) {
        if (shapesOverlap(newShape, placed)) return false;
      }

      return true;
    },
    [puzzle.gridSize, placedShapes, pendingHints]
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

  /**
   * Deadlock detection:
   * After at least one shape is placed, compare the remaining uncovered area
   * against the sum of the remaining hint values. If they diverge, the player
   * placed shapes in positions that make it impossible to cover the full grid
   * — a restart is needed.
   */
  const isDeadlock = useMemo(() => {
    if (isVictory || placedShapes.length === 0) return false;

    const totalArea = puzzle.gridSize * puzzle.gridSize;
    const coveredArea = placedShapes.reduce(
      (sum, s) => sum + s.width * s.height,
      0
    );
    const remainingArea = totalArea - coveredArea;
    const pendingArea = pendingHints.reduce((sum, s) => sum + s.value, 0);

    return pendingArea !== remainingArea;
  }, [isVictory, placedShapes, pendingHints, puzzle.gridSize]);

  // Timer: ticks every second. Pauses on victory.
  // timerEpoch forces a clean restart when the level changes — no race conditions.
  useEffect(() => {
    if (isVictory) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerEpoch, isVictory]);

  /** Restarts the current level with a fresh puzzle (same difficulty). */
  const restartLevel = useCallback(() => {
    setPuzzle(generateTesselo(difficulty));
    setPlacedShapes([]);
    setElapsedSeconds(0);
    setTimerEpoch((e) => e + 1);
  }, [difficulty]);

  /** Advances to the next difficulty level and generates a new puzzle. */
  const nextLevel = useCallback(() => {
    const nextDifficulty: Difficulty =
      difficulty < 4 ? ((difficulty + 1) as Difficulty) : 4;
    setDifficulty(nextDifficulty);
    setPuzzle(generateTesselo(nextDifficulty));
    setPlacedShapes([]);
    setLevel((l) => l + 1);
    setElapsedSeconds(0);
    setTimerEpoch((e) => e + 1);
  }, [difficulty]);

  return {
    difficulty,
    level,
    isLoadingProgress,
    elapsedSeconds,
    puzzle,
    placedShapes,
    completedShapes: placedShapes.length,
    pendingHints,
    isValidShape,
    addShape,
    undoLastShape,
    isVictory,
    isDeadlock,
    restartLevel,
    nextLevel,
    gridSize: puzzle.gridSize,
    cellCount: getGridSizeForDifficulty(difficulty),
  };
}
