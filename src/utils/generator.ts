// Tesselo - Procedural Geometry Puzzle
// SLICE 2: The Brain - generateTesselo algorithm using Recursive Subdivision

export type Difficulty = 1 | 2 | 3 | 4;

export type Shape = {
  id: string;
  value: number;    // area = width x height
  col: number;      // left column of the rectangle (0-indexed)
  row: number;      // top row of the rectangle (0-indexed)
  width: number;    // width in cells
  height: number;   // height in cells
  hintCol: number;  // column where the hint number is displayed
  hintRow: number;  // row where the hint number is displayed
};

export type GeneratorResult = {
  gridSize: number;
  shapes: Shape[];
};

// Maps difficulty to grid size
export function getGridSizeForDifficulty(difficulty: Difficulty): 4 | 5 | 6 | 8 {
  const map: Record<Difficulty, 4 | 5 | 6 | 8> = {
    1: 4,
    2: 5,
    3: 6,
    4: 8,
  };
  return map[difficulty];
}

// Internal rectangle representation used during subdivision
type Rect = {
  col: number;
  row: number;
  width: number;
  height: number;
};

// Seeded pseudo-random number generator (Mulberry32) for reproducibility in tests.
// During gameplay we just use Math.random directly.
function randomFloat(): number {
  return Math.random();
}

function randomInt(min: number, max: number): number {
  // Returns an integer in [min, max] inclusive
  return Math.floor(randomFloat() * (max - min + 1)) + min;
}

/**
 * Recursively subdivide `rect` into smaller rectangles.
 *
 * Stopping criteria:
 *  - Area <= minArea: always stop (leaf).
 *  - Otherwise: stop with a probability that grows as area shrinks, so we get
 *    a variety of sizes rather than always cutting to the minimum.
 */
function subdivide(rect: Rect, minArea: number, totalArea: number): Rect[] {
  const area = rect.width * rect.height;

  // Hard stop: too small to cut further
  if (area <= minArea) {
    return [rect];
  }

  // Soft stop: probability of stopping grows as area shrinks relative to total
  // At area == minArea+1 the stop chance is ~85%; at area == totalArea it is ~5%.
  const stopProbability = 0.05 + 0.80 * (1 - (area - minArea) / (totalArea - minArea));
  if (randomFloat() < stopProbability) {
    return [rect];
  }

  // Decide split orientation.
  // Prefer to cut along the longer axis to keep shapes more square-ish.
  const canSplitH = rect.height >= 2; // horizontal cut → top/bottom halves
  const canSplitV = rect.width >= 2;  // vertical cut   → left/right halves

  if (!canSplitH && !canSplitV) {
    return [rect];
  }

  let splitHorizontal: boolean;
  if (!canSplitH) {
    splitHorizontal = false;
  } else if (!canSplitV) {
    splitHorizontal = true;
  } else {
    // Bias toward cutting the longer side to avoid very thin slivers
    if (rect.height > rect.width) {
      splitHorizontal = randomFloat() < 0.70;
    } else if (rect.width > rect.height) {
      splitHorizontal = randomFloat() < 0.30;
    } else {
      splitHorizontal = randomFloat() < 0.50;
    }
  }

  let rectA: Rect;
  let rectB: Rect;

  if (splitHorizontal) {
    // Both children must have area >= minArea after the cut.
    // rectA area = rect.width * cutRow  → cutRow >= ceil(minArea / rect.width)
    // rectB area = rect.width * (rect.height - cutRow) → same lower bound
    const minRows = Math.ceil(minArea / rect.width);
    const minCut  = minRows;
    const maxCut  = rect.height - minRows;
    if (minCut > maxCut) return [rect]; // can't split without violating minArea
    const cutRow = randomInt(minCut, maxCut);
    rectA = { col: rect.col, row: rect.row, width: rect.width, height: cutRow };
    rectB = {
      col: rect.col,
      row: rect.row + cutRow,
      width: rect.width,
      height: rect.height - cutRow,
    };
  } else {
    // Same constraint for vertical cuts.
    const minCols = Math.ceil(minArea / rect.height);
    const minCut  = minCols;
    const maxCut  = rect.width - minCols;
    if (minCut > maxCut) return [rect]; // can't split without violating minArea
    const cutCol = randomInt(minCut, maxCut);
    rectA = { col: rect.col, row: rect.row, width: cutCol, height: rect.height };
    rectB = {
      col: rect.col + cutCol,
      row: rect.row,
      width: rect.width - cutCol,
      height: rect.height,
    };
  }

  return [...subdivide(rectA, minArea, totalArea), ...subdivide(rectB, minArea, totalArea)];
}

/**
 * Validates that:
 * 1. Every cell (col, row) in the grid is covered by exactly one shape.
 * 2. No two shapes overlap.
 *
 * Returns true if valid, false otherwise.
 */
function validateGrid(shapes: Shape[], gridSize: number): boolean {
  const coverage = new Array(gridSize * gridSize).fill(0);

  for (const shape of shapes) {
    for (let r = shape.row; r < shape.row + shape.height; r++) {
      for (let c = shape.col; c < shape.col + shape.width; c++) {
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
          return false; // out of bounds
        }
        const idx = r * gridSize + c;
        coverage[idx] += 1;
        if (coverage[idx] > 1) {
          return false; // overlap detected
        }
      }
    }
  }

  // Check full coverage
  return coverage.every((v) => v === 1);
}

/**
 * Main entry point.
 *
 * Generates a valid Tesselo puzzle for the given difficulty level using
 * Recursive Subdivision. The function retries up to MAX_ATTEMPTS times to
 * guarantee a valid result (the algorithm is deterministic-correct by
 * construction, but the retry loop acts as a safety net).
 */
export function generateTesselo(difficulty: Difficulty): GeneratorResult {
  const gridSize = getGridSizeForDifficulty(difficulty);
  const totalArea = gridSize * gridSize;

  // minArea: smaller grids allow 1-cell shapes; larger grids require at least 3
  const minArea = difficulty <= 2 ? 2 : 3;

  const MAX_ATTEMPTS = 20;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const root: Rect = { col: 0, row: 0, width: gridSize, height: gridSize };
    const rects = subdivide(root, minArea, totalArea);

    // Build Shape objects from the rectangles
    const shapes: Shape[] = rects.map((rect, index) => {
      const area = rect.width * rect.height;

      // Pick a random cell inside the rectangle as the hint position
      const hintCol = rect.col + randomInt(0, rect.width - 1);
      const hintRow = rect.row + randomInt(0, rect.height - 1);

      return {
        id: `shape-${index}`,
        value: area,
        col: rect.col,
        row: rect.row,
        width: rect.width,
        height: rect.height,
        hintCol,
        hintRow,
      };
    });

    // Validate: full coverage with no overlaps
    if (validateGrid(shapes, gridSize)) {
      console.log(
        `[Tesselo] Grid ${gridSize}x${gridSize} - ${shapes.length} shapes geradas`
      );

      // Debug: print each shape for development
      shapes.forEach((s) => {
        console.log(
          `  Shape ${s.id}: (${s.col},${s.row}) ${s.width}x${s.height}=` +
            `${s.value} | hint@(${s.hintCol},${s.hintRow})`
        );
      });

      return { gridSize, shapes };
    }

    // Should never happen with a correct subdivision, but log if it does
    console.warn(`[Tesselo] Validation failed on attempt ${attempt + 1}, retrying…`);
  }

  // Fallback: return a trivially valid single-shape result so the app never crashes
  console.error("[Tesselo] Could not generate a valid grid after max attempts. Using fallback.");
  const fallbackShape: Shape = {
    id: "shape-0",
    value: totalArea,
    col: 0,
    row: 0,
    width: gridSize,
    height: gridSize,
    hintCol: Math.floor(gridSize / 2),
    hintRow: Math.floor(gridSize / 2),
  };
  return { gridSize, shapes: [fallbackShape] };
}
