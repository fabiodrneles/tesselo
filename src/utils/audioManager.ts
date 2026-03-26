// Tesselo — audioManager.ts
// Sintetiza sons retro 16-bit diretamente em código — sem ficheiros externos.
//
// Pipeline:
//   1. Gera amostras PCM (Int16) de onda quadrada para cada segmento de nota.
//   2. Encapsula num cabeçalho WAV de 44 bytes (RIFF/PCM padrão).
//   3. Codifica em Base64 e escreve em cache (expo-file-system).
//   4. Carrega via expo-av a partir do URI de ficheiro local.
//
// Sons disponíveis:
//   click   — toque rápido ao iniciar o arraste numa célula de hint.
//   match   — tom GameBoy agudo ao atingir a área exacta do rectângulo.
//   levelUp — arpejo ascendente ao completar um nível.

// SDK 55: a API clássica (cacheDirectory, writeAsStringAsync) está em /legacy
import * as FileSystem from "expo-file-system/legacy";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type Segment = {
  /** Frequência em Hz. Ignorado se silent=true. */
  freq: number;
  /** Duração em milissegundos. */
  durationMs: number;
  /** Silêncio entre notas. */
  silent?: boolean;
};

type SoundName = "click" | "match" | "levelUp";

// ---------------------------------------------------------------------------
// Definição dos sons — parâmetros fáceis de ajustar
// ---------------------------------------------------------------------------

const SAMPLE_RATE = 22050; // Hz — trade-off qualidade/tamanho
const AMPLITUDE   = 0x2800; // ~31% do max 16-bit, evita clipping

const SOUND_DEFINITIONS: Record<SoundName, Segment[]> = {
  // Click: onda quadrada curta — feedback tátil ao tocar numa célula
  click: [
    { freq: 480, durationMs: 28 },
  ],

  // Match: estilo GameBoy — dois tons agudos ascendentes, onda quadrada limpa.
  // A5 (880 Hz) → pausa → C6 (1047 Hz, nota mais aguda e cristalina)
  match: [
    { freq: 880,  durationMs: 55 },  // A5 — note de arranque
    { freq: 0,    durationMs: 8, silent: true },
    { freq: 1047, durationMs: 70 },  // C6 — pico agudo estilo GameBoy
  ],

  // LevelUp: arpejo C4 → E4 → G4 → C5, tom de conquista
  levelUp: [
    { freq: 262, durationMs: 75 },   // C4
    { freq: 330, durationMs: 75 },   // E4
    { freq: 392, durationMs: 75 },   // G4
    { freq: 523, durationMs: 115 },  // C5 — nota final mais longa
  ],
};

// ---------------------------------------------------------------------------
// Gerador WAV
// ---------------------------------------------------------------------------

function writeAscii(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Gera amostras PCM 16-bit para uma lista de segmentos de notas.
 * Cada segmento tem envelope (attack 5ms + decay nos últimos 20%)
 * para evitar cliques digitais nas transições.
 */
function generateSamples(segments: Segment[]): Int16Array {
  const totalSamples = segments.reduce(
    (acc, s) => acc + Math.floor(SAMPLE_RATE * s.durationMs / 1000),
    0
  );
  const out = new Int16Array(totalSamples);
  let offset = 0;

  for (const seg of segments) {
    const n = Math.floor(SAMPLE_RATE * seg.durationMs / 1000);
    if (seg.silent) {
      // Silêncio — amostras já são zero por padrão
      offset += n;
      continue;
    }

    const attackEnd  = Math.floor(SAMPLE_RATE * 0.005);   // 5ms
    const decayStart = Math.floor(n * 0.80);               // últimos 20%

    for (let i = 0; i < n; i++) {
      const t     = i / SAMPLE_RATE;
      const phase = (t * seg.freq) % 1.0;

      // Onda quadrada pura — característica do som GameBoy
      const raw = phase < 0.5 ? AMPLITUDE : -AMPLITUDE;

      // Envelope linear simples
      let env = 1.0;
      if (i < attackEnd) {
        env = i / attackEnd;
      } else if (i >= decayStart) {
        env = 1.0 - (i - decayStart) / (n - decayStart);
        env = Math.max(0, env);
      }

      out[offset + i] = Math.round(raw * env);
    }
    offset += n;
  }

  return out;
}

/**
 * Empacota amostras PCM no formato RIFF/WAV e retorna Base64.
 * O cabeçalho WAV tem exactamente 44 bytes (formato padrão).
 */
function samplesToWavBase64(samples: Int16Array): string {
  const dataBytes = samples.length * 2; // 16-bit = 2 bytes/amostra
  const buf       = new ArrayBuffer(44 + dataBytes);
  const view      = new DataView(buf);

  // ---- Cabeçalho RIFF ----
  writeAscii(view,  0, "RIFF");
  view.setUint32(   4, 36 + dataBytes,         true); // tamanho total - 8
  writeAscii(view,  8, "WAVE");

  // ---- Sub-chunk fmt ----
  writeAscii(view, 12, "fmt ");
  view.setUint32(  16, 16,                     true); // tamanho do chunk fmt
  view.setUint16(  20, 1,                      true); // formato PCM
  view.setUint16(  22, 1,                      true); // mono
  view.setUint32(  24, SAMPLE_RATE,            true); // sample rate
  view.setUint32(  28, SAMPLE_RATE * 2,        true); // byte rate
  view.setUint16(  32, 2,                      true); // block align
  view.setUint16(  34, 16,                     true); // bits por amostra

  // ---- Sub-chunk data ----
  writeAscii(view, 36, "data");
  view.setUint32(  40, dataBytes,              true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }

  // Converte ArrayBuffer → Base64 em chunks para não rebentar a call stack
  const bytes   = new Uint8Array(buf);
  const CHUNK   = 4096;
  let   binary  = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    binary += String.fromCharCode(...(slice as unknown as number[]));
  }
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// Cache em disco — expo-file-system escreve o WAV uma vez, expo-av carrega
// ---------------------------------------------------------------------------

async function ensureWavFile(name: SoundName): Promise<string> {
  const path = `${FileSystem.cacheDirectory}tesselo_${name}.wav`;

  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    const samples = generateSamples(SOUND_DEFINITIONS[name]);
    const b64     = samplesToWavBase64(samples);
    await FileSystem.writeAsStringAsync(path, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  return path;
}

// ---------------------------------------------------------------------------
// Gestor de sons público
// ---------------------------------------------------------------------------

type SoundCache = Partial<Record<SoundName, import("expo-av").Audio.Sound>>;

let cache: SoundCache = {};
let initialising = false;
let initialised  = false;

// Per-sound flag: prevents concurrent play() calls from interleaving
// setPositionAsync/playAsync on the same Sound object and causing audio glitches.
const playing: Partial<Record<SoundName, boolean>> = {};

/**
 * Pré-carrega todos os sons em cache.
 * Chama no arranque da app (não bloqueia o render — fire-and-forget).
 */
export async function initAudio(): Promise<void> {
  if (initialised || initialising) return;
  initialising = true;

  try {
    // Import lazy para não disparar o aviso de deprecação do expo-av
    const { Audio } = await import("expo-av");
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

    const names: SoundName[] = ["click", "match", "levelUp"];
    await Promise.all(
      names.map(async (name) => {
        const uri          = await ensureWavFile(name);
        const { sound }    = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
        cache[name]        = sound;
      })
    );

    initialised  = true;
  } catch (e) {
    // Áudio indisponível — jogo continua sem som
    console.warn("[audioManager] init failed:", e);
  } finally {
    initialising = false;
  }
}

/** Reproduz um som pelo nome. Seguro chamar antes de initAudio terminar. */
async function play(name: SoundName): Promise<void> {
  // Skip if already playing — prevents interleaved setPositionAsync/playAsync
  // calls on the same Sound object that would cause audio glitches.
  if (playing[name]) return;
  try {
    const sound = cache[name];
    if (!sound) return;
    playing[name] = true;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Silent fail
  } finally {
    playing[name] = false;
  }
}

/** Som de toque ao iniciar o arraste numa célula de hint. */
export function playClick(): void  { play("click");   }

/** Som de sucesso ao atingir a área exacta — estilo GameBoy. */
export function playMatch(): void  { play("match");   }

/** Som de conquista ao completar um nível. */
export function playLevelUp(): void { play("levelUp"); }

/** Liberta todos os recursos de áudio (chamar no unmount da app). */
export async function unloadAudio(): Promise<void> {
  try {
    await Promise.all(Object.values(cache).map((s) => s?.unloadAsync()));
    cache       = {};
    initialised = false;
  } catch {
    // Silent fail
  }
}
