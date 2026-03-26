// Tesselo – Sprint 5
// TutorialOverlay: shown only on the very first launch.
// Fades in on mount, fades out on tap, then calls onDismiss.

import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

type TutorialOverlayProps = {
  onDismiss: () => void;
};

export default function TutorialOverlay({ onDismiss }: TutorialOverlayProps) {
  const opacity = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Fade in on mount
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 220 }, (done) => {
      if (done) runOnJS(onDismiss)();
    });
  };

  return (
    <TouchableWithoutFeedback onPress={handleDismiss}>
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.overlay, animStyle]}>
        <View style={styles.card}>
          {/* Icon */}
          <Text style={styles.icon}>☝️</Text>

          {/* Title */}
          <Text style={styles.title}>Como jogar</Text>

          {/* Rules */}
          <View style={styles.ruleRow}>
            <Text style={styles.bullet}>①</Text>
            <Text style={styles.ruleText}>
              Toque num número do grid e arraste para formar um retângulo.
            </Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.bullet}>②</Text>
            <Text style={styles.ruleText}>
              A área do retângulo (largura × altura) deve ser igual ao número.
            </Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.bullet}>③</Text>
            <Text style={styles.ruleText}>
              Preencha todas as células do grid para vencer.
            </Text>
          </View>

          {/* Tip */}
          <Text style={styles.tip}>
            💡 A forma fica verde quando o tamanho está certo.
          </Text>

          {/* CTA */}
          <View style={styles.button}>
            <Text style={styles.buttonText}>Toque para começar</Text>
          </View>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          99,
  },
  card: {
    backgroundColor: "#2D3748",
    borderRadius:    20,
    paddingVertical: 32,
    paddingHorizontal: 28,
    width:           "85%",
    maxWidth:        340,
    gap:             14,
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.5,
    shadowRadius:    16,
    elevation:       12,
  },
  icon: {
    fontSize:   44,
    textAlign:  "center",
    marginBottom: 2,
  },
  title: {
    color:      "#FFFFFF",
    fontSize:   22,
    fontWeight: "bold",
    textAlign:  "center",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           10,
  },
  bullet: {
    color:      "#4FD1C5",
    fontSize:   16,
    fontWeight: "bold",
    marginTop:  1,
  },
  ruleText: {
    flex:       1,
    color:      "rgba(255,255,255,0.85)",
    fontSize:   14,
    lineHeight: 21,
  },
  tip: {
    color:         "rgba(255,255,255,0.5)",
    fontSize:      13,
    textAlign:     "center",
    fontStyle:     "italic",
    marginTop:     4,
  },
  button: {
    backgroundColor: "#4FD1C5",
    borderRadius:    12,
    paddingVertical: 13,
    alignItems:      "center",
    marginTop:       6,
  },
  buttonText: {
    color:      "#1A202C",
    fontSize:   16,
    fontWeight: "bold",
  },
});
