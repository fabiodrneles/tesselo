// Tesselo – Sprint 4
// storage.ts: persists and loads player progress (difficulty + level) between sessions.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Difficulty } from "./generator";

const STORAGE_KEY = "@tesselo_progress_v1";

export type SavedProgress = {
  difficulty: Difficulty;
  level: number;
};

/** Persists current difficulty and level to AsyncStorage. */
export async function saveProgress(
  difficulty: Difficulty,
  level: number
): Promise<void> {
  try {
    const data: SavedProgress = { difficulty, level };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable — silent fail, game continues normally
  }
}

// ---------------------------------------------------------------------------
// Tutorial
// ---------------------------------------------------------------------------

const TUTORIAL_KEY = "@tesselo_tutorial_v1";

/** Returns true if the player has already seen the tutorial. */
export async function hasTutorialBeenSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TUTORIAL_KEY)) === "1";
  } catch {
    return false; // On error, show the tutorial — safe default
  }
}

/** Marks the tutorial as seen so it is not shown again. */
export async function markTutorialSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, "1");
  } catch {}
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/** Loads saved progress. Returns null if nothing saved or if data is invalid. */
export async function loadProgress(): Promise<SavedProgress | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return null;

    const data = JSON.parse(json) as Partial<SavedProgress>;

    // Validate before trusting stored data
    if (
      typeof data.difficulty !== "number" ||
      ![1, 2, 3, 4].includes(data.difficulty) ||
      typeof data.level !== "number" ||
      data.level < 1
    ) {
      return null;
    }

    return { difficulty: data.difficulty as Difficulty, level: data.level };
  } catch {
    return null;
  }
}
