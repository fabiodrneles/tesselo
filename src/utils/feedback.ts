// Tesselo – SLICE 5B
// feedback.ts: haptic vibrations and sound effects.

import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

// ---------------------------------------------------------------------------
// Haptics
// ---------------------------------------------------------------------------

/** Short vibration when a shape is correctly placed. */
export async function vibrateShapeComplete(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Device may not support haptics
  }
}

/** Strong success notification when the level is won. */
export async function vibrateVictory(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Device may not support haptics
  }
}

// ---------------------------------------------------------------------------
// Sound
// ---------------------------------------------------------------------------

let popSound: Audio.Sound | null = null;

/** Plays a short satisfying "pop" sound. Lazy-loads on first call. */
export async function playPopSound(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    if (!popSound) {
      const { sound } = await Audio.Sound.createAsync(
        {
          uri: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
        },
        { shouldPlay: false, volume: 0.6 }
      );
      popSound = sound;
    }
    await popSound.setPositionAsync(0);
    await popSound.playAsync();
  } catch {
    // Audio unavailable (simulator, silent mode, network error, etc.)
  }
}

/** Call on component unmount to free audio resources. */
export async function unloadSounds(): Promise<void> {
  try {
    if (popSound) {
      await popSound.unloadAsync();
      popSound = null;
    }
  } catch {
    // ignore
  }
}
