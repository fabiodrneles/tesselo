// Tesselo – SLICE 5
// App: full game loop with LevelHeader, VictoryModal, haptics and sound.

import "./global.css";
import React, { useState, useCallback, useEffect, useRef } from "react";

import { StatusBar } from "expo-status-bar";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Grid from "./src/components/Grid";
import ShapeDrawer from "./src/components/ShapeDrawer";
import LevelHeader from "./src/components/LevelHeader";
import VictoryModal from "./src/components/VictoryModal";
import { useGameState } from "./src/hooks/useGameState";
import { Shape } from "./src/utils/generator";
import {
  vibrateShapeComplete,
  vibrateVictory,
} from "./src/utils/feedback";
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
    nextLevel,
    level,
    elapsedSeconds,
  } = useGameState(1);

  const [cellSize, setCellSize] = useState(0);
  const victoryFiredRef = useRef(false);

  const handleCellSize = useCallback((size: number) => {
    setCellSize(size);
  }, []);

  const handleShapeComplete = useCallback(
    (shape: Shape) => {
      if (isValidShape(shape)) {
        addShape(shape);
        vibrateShapeComplete();
        // playPopSound() — aguardando arquivo de som em /assets/
      }
    },
    [isValidShape, addShape]
  );

  // Fire victory feedback exactly once when isVictory flips to true
  useEffect(() => {
    if (isVictory && !victoryFiredRef.current) {
      victoryFiredRef.current = true;
      vibrateVictory();
    }
    if (!isVictory) {
      victoryFiredRef.current = false;
    }
  }, [isVictory]);

  // unloadSounds() — será chamado aqui quando o audio for ativado

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

        {/* ── Grid (centered) ── */}
        <View style={styles.center}>
          <View>
            <Grid
              size={puzzle.gridSize as 4 | 5 | 6 | 8}
              shapes={puzzle.shapes}
              placedShapes={placedShapes}
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
                />
              </View>
            )}
          </View>
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
            <Text style={styles.undoText}>↩ Desfazer</Text>
          </TouchableOpacity>
        </View>

        {/* ── Victory modal ── */}
        <VictoryModal
          visible={isVictory}
          level={level}
          timeSeconds={elapsedSeconds}
          onNextLevel={nextLevel}
        />

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
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4FD1C5",
  },
  undoDisabled: {
    opacity: 0.3,
  },
  undoText: {
    color: "#4FD1C5",
    fontSize: 16,
    fontWeight: "600",
  },
});
