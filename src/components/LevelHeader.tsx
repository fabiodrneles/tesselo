// Tesselo – SLICE 5A
// LevelHeader: shows current level, elapsed time, and progress.

import React from "react";
import { View, Text, StyleSheet } from "react-native";

type LevelHeaderProps = {
  level: number;
  totalShapes: number;
  completedShapes: number;
  elapsedSeconds: number;
};

function formatTime(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function LevelHeader({
  level,
  totalShapes,
  completedShapes,
  elapsedSeconds,
}: LevelHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Left: game title + level */}
      <View>
        <Text style={styles.title}>TESSELO</Text>
        <Text style={styles.level}>Nível {level}</Text>
      </View>

      {/* Center: shape progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progress}>
          {completedShapes}/{totalShapes} formas
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${totalShapes > 0 ? (completedShapes / totalShapes) * 100 : 0}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Right: timer */}
      <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2D3748",
  },
  title: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
  },
  level: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  progressContainer: {
    alignItems: "center",
    gap: 4,
  },
  progress: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  progressBar: {
    width: 80,
    height: 4,
    backgroundColor: "#2D3748",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#68D391",
    borderRadius: 2,
  },
  timer: {
    color: "#4FD1C5",
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    minWidth: 56,
    textAlign: "right",
  },
});
