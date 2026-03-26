// Tesselo – SLICE 5
// App: full game loop with LevelHeader, VictoryModal, haptics and sound.

import "./global.css";
import React, { useState, useCallback, useEffect, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { StatusBar } from "expo-status-bar";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Grid from "./src/components/Grid";
import ShapeDrawer from "./src/components/ShapeDrawer";
import LevelHeader from "./src/components/LevelHeader";
import VictoryModal from "./src/components/VictoryModal";
import TutorialOverlay from "./src/components/TutorialOverlay";
import { IconUndo, IconRestart } from "./src/icons";
import { useGameState } from "./src/hooks/useGameState";
import { Shape } from "./src/utils/generator";
import {
  vibrateShapeComplete,
  vibrateShapeRejected,
  vibrateVictory,
} from "./src/utils/feedback";
import {
  hasTutorialBeenSeen,
  markTutorialSeen,
} from "./src/utils/storage";
import {
  initAudio,
  playClick,
  playMatch,
  playLevelUp,
  unloadAudio,
} from "./src/utils/audioManager";
// Audio (playPopSound / unloadSounds) pendente — será ativado quando
// os arquivos de som forem adicionados em /assets/

export default function App() {
  const {
    puzzle,
    placedShapes,
    completedShapes,
    pendingHints,
    isValidShape,
    addShape,
    undoLastShape,
    isVictory,
    isDeadlock,
    isLoadingProgress,
    restartLevel,
    nextLevel,
    level,
    elapsedSeconds,
  } = useGameState(1);

  const [cellSize, setCellSize] = useState(0);
  const victoryFiredRef = useRef(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Check tutorial + initialise audio — both fire-and-forget on mount
  useEffect(() => {
    hasTutorialBeenSeen().then((seen) => { if (!seen) setShowTutorial(true); });
    initAudio(); // pre-loads all WAV files into expo-av cache
    return () => { unloadAudio(); };
  }, []);

  // Grid fade animation — fades out then back in on level transitions
  const gridOpacity = useSharedValue(1);
  const gridAnimStyle = useAnimatedStyle(() => ({ opacity: gridOpacity.value }));

  const handleCellSize = useCallback((size: number) => {
    setCellSize(size);
  }, []);

  const handleShapeComplete = useCallback(
    (shape: Shape) => {
      if (isValidShape(shape)) {
        addShape(shape);
        vibrateShapeComplete();
        // playPopSound() — aguardando arquivo de som em /assets/
      } else {
        // isValidShape rejected it as a final guard (shouldn't reach here often,
        // but if it does, give error feedback)
        vibrateShapeRejected();
      }
    },
    [isValidShape, addShape]
  );

  const handleShapeRejected = useCallback(() => {
    vibrateShapeRejected();
  }, []);

  const handleCellTouch = useCallback(() => {
    playClick();
  }, []);

  const handleAreaMatch = useCallback(() => {
    playMatch();
  }, []);

  const handleTutorialDismiss = useCallback(() => {
    setShowTutorial(false);
    markTutorialSeen(); // fire-and-forget
  }, []);

  // Animated wrappers that fade the grid out, swap state, then fade back in
  const handleNextLevel = useCallback(() => {
    gridOpacity.value = withTiming(0, { duration: 180 }, (done) => {
      if (done) {
        runOnJS(nextLevel)();
        gridOpacity.value = withTiming(1, { duration: 220 });
      }
    });
  }, [nextLevel, gridOpacity]);

  const handleRestartLevel = useCallback(() => {
    gridOpacity.value = withTiming(0, { duration: 150 }, (done) => {
      if (done) {
        runOnJS(restartLevel)();
        gridOpacity.value = withTiming(1, { duration: 200 });
      }
    });
  }, [restartLevel, gridOpacity]);

  // Fire victory feedback exactly once when isVictory flips to true
  useEffect(() => {
    if (isVictory && !victoryFiredRef.current) {
      victoryFiredRef.current = true;
      vibrateVictory();
      playLevelUp();
    }
    if (!isVictory) {
      victoryFiredRef.current = false;
    }
  }, [isVictory]);

  // unloadSounds() — será chamado aqui quando o audio for ativado

  // Show plain background while AsyncStorage loads (usually < 50ms)
  if (isLoadingProgress) {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.screen}>

        {/* ── Header ── */}
        <LevelHeader
          level={level}
          totalShapes={puzzle.shapes.length}
          completedShapes={completedShapes}
          elapsedSeconds={elapsedSeconds}
        />

        {/* ── Deadlock warning ── */}
        {isDeadlock && (
          <View style={styles.deadlockBanner}>
            <Text style={styles.deadlockText}>
              Puzzle sem saída — formas mal posicionadas
            </Text>
            <TouchableOpacity
              onPress={handleRestartLevel}
              style={styles.restartButton}
              activeOpacity={0.8}
            >
              <IconRestart size={16} color="#1A202C" />
              <Text style={styles.restartText}>Reiniciar nível</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Grid (centered, fades on level transitions) ── */}
        <View style={styles.center}>
          <Animated.View style={gridAnimStyle}>
            <Grid
              size={puzzle.gridSize as 4 | 5 | 6 | 8}
              shapes={puzzle.shapes}
              onCellSize={handleCellSize}
            />
            {cellSize > 0 && (
              <View
                style={[StyleSheet.absoluteFillObject, { pointerEvents: "box-none" }]}
              >
                <ShapeDrawer
                  gridSize={puzzle.gridSize}
                  cellSize={cellSize}
                  puzzleShapes={pendingHints}
                  placedShapes={placedShapes}
                  onShapeComplete={handleShapeComplete}
                  onShapeRejected={handleShapeRejected}
                  onCellTouch={handleCellTouch}
                  onAreaMatch={handleAreaMatch}
                />
              </View>
            )}
          </Animated.View>
        </View>

        {/* ── Undo button ── */}
        <View style={styles.bottom}>
          <TouchableOpacity
            onPress={undoLastShape}
            disabled={placedShapes.length === 0}
            style={[
              styles.undoButton,
              placedShapes.length === 0 && styles.undoDisabled,
            ]}
            activeOpacity={0.7}
          >
            <IconUndo
              size={18}
              color={placedShapes.length === 0 ? "rgba(79,209,197,0.4)" : "#4FD1C5"}
            />
            <Text style={styles.undoText}>Desfazer</Text>
          </TouchableOpacity>
        </View>

        {/* ── Victory modal ── */}
        <VictoryModal
          visible={isVictory}
          level={level}
          timeSeconds={elapsedSeconds}
          onNextLevel={handleNextLevel}
        />

        {/* ── Tutorial (first launch only) ── */}
        {showTutorial && (
          <TutorialOverlay onDismiss={handleTutorialDismiss} />
        )}

        <StatusBar style="light" />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: "#1A202C",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: {
    alignItems: "center",
    paddingBottom: 28,
  },
  undoButton: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            8,
    paddingHorizontal: 24,
    paddingVertical:   10,
    borderRadius:   8,
    borderWidth:    1,
    borderColor:    "#4FD1C5",
  },
  undoDisabled: {
    opacity: 0.3,
  },
  undoText: {
    color: "#4FD1C5",
    fontSize: 16,
    fontWeight: "600",
  },
  deadlockBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "rgba(252, 129, 129, 0.15)",
    borderWidth: 1,
    borderColor: "#FC8181",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  deadlockText: {
    color: "#FC8181",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
  },
  restartButton: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            6,
    backgroundColor: "#FC8181",
    borderRadius:   8,
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  restartText: {
    color: "#1A202C",
    fontSize: 14,
    fontWeight: "700",
  },
});
