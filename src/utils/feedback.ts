// Tesselo – Sprint 5 (audio pendente)
// feedback.ts: haptic vibrations and sound effects.
//
// Audio (playPopSound / unloadSounds) está pronto para ativar.
// Para ativar: adicionar um arquivo .mp3 em /assets/pop.mp3 e
// substituir a URI abaixo por require("../../assets/pop.mp3").
// O import de expo-av fica lazy (dentro da função) para evitar o
// warning de deprecação enquanto o áudio está desativado.

import * as Haptics from "expo-haptics";

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

/** Short error notification when a shape is rejected (wrong area or overlap). */
export async function vibrateShapeRejected(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
// Sound  (desativado até os arquivos de áudio estarem disponíveis)
// ---------------------------------------------------------------------------

// Import lazy para não disparar o warning de deprecação do expo-av no boot
// enquanto o áudio não está em uso.
type AudioModule = typeof import("expo-av");
let _audioModule: AudioModule | null = null;
async function getAudio(): Promise<AudioModule> {
  if (!_audioModule) {
    _audioModule = await import("expo-av");
  }
  return _audioModule;
}

let popSoundObj: import("expo-av").Audio.Sound | null = null;

/**
 * Plays a short "pop" sound.
 * ATIVAR: substituir URI por require("../../assets/pop.mp3") após
 * adicionar o arquivo de áudio em /assets/.
 */
export async function playPopSound(): Promise<void> {
  try {
    const { Audio } = await getAudio();
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    if (!popSoundObj) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: "PENDENTE_substituir_por_require_do_arquivo_local" },
        { shouldPlay: false, volume: 0.6 }
      );
      popSoundObj = sound;
    }
    await popSoundObj.setPositionAsync(0);
    await popSoundObj.playAsync();
  } catch {
    // Audio unavailable — silent fail
  }
}

/** Releases audio resources. Call on app unmount after activating audio. */
export async function unloadSounds(): Promise<void> {
  try {
    if (popSoundObj) {
      await popSoundObj.unloadAsync();
      popSoundObj = null;
    }
  } catch {
    // ignore
  }
}
