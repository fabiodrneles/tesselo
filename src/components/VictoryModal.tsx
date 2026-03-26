// Tesselo – SLICE 5A
// VictoryModal: shown when the player completes all shapes on a level.

import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";

type VictoryModalProps = {
  visible: boolean;
  level: number;
  timeSeconds: number;
  onNextLevel: () => void;
};

function formatTime(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function VictoryModal({
  visible,
  level,
  timeSeconds,
  onNextLevel,
}: VictoryModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Check icon */}
          <Text style={styles.icon}>✓</Text>

          {/* Title */}
          <Text style={styles.title}>Nível {level} Completo!</Text>

          {/* Time */}
          <Text style={styles.time}>Tempo: {formatTime(timeSeconds)}</Text>

          {/* Next level button */}
          <TouchableOpacity
            onPress={onNextLevel}
            style={styles.button}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Próximo Nível →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#2D3748",
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 36,
    width: width * 0.8,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  icon: {
    color: "#68D391",
    fontSize: 56,
    lineHeight: 64,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 4,
  },
  time: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 16,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#4FD1C5",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 36,
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#1A202C",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
