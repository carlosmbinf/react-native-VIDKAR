import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { useTheme } from "react-native-paper";

import { chartSkeletonStyles } from "./styles/dashboardStyles";

const ChartSkeleton = () => {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          duration: 920,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          duration: 920,
          toValue: 0.35,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulseAnim]);

  const lineColor = theme.dark
    ? "rgba(148, 163, 184, 0.42)"
    : "rgba(15, 23, 42, 0.14)";

  return (
    <Animated.View
      style={[
        chartSkeletonStyles.container,
        {
          backgroundColor: theme.dark
            ? "rgba(15, 23, 42, 0.92)"
            : "rgba(255, 255, 255, 0.88)",
          opacity: pulseAnim,
        },
      ]}
    >
      <View
        style={[chartSkeletonStyles.line, { backgroundColor: lineColor }]}
      />
      <View
        style={[
          chartSkeletonStyles.line,
          chartSkeletonStyles.lineShort,
          { backgroundColor: lineColor },
        ]}
      />
      <View
        style={[
          chartSkeletonStyles.line,
          chartSkeletonStyles.lineShorter,
          { backgroundColor: lineColor },
        ]}
      />
    </Animated.View>
  );
};

export default ChartSkeleton;
