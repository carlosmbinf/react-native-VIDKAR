import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, View } from "react-native";
import { Chip, Text } from "react-native-paper";

import { kpiCardStyles } from "./styles/dashboardStyles";
import { formatLargeNumber, getDynamicFontSize } from "./utils/formatUtils";

const safeHaptic = () => {
  try {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  } catch (_) {}
};

const KPICard = ({
  color,
  delay = 0,
  icon,
  isLargeNumber = false,
  onPress,
  subtitle,
  title,
  trend,
  value,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const pressScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        delay,
        duration: 480,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        delay,
        friction: 8,
        tension: 46,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, fadeAnim, scaleAnim]);

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(pressScaleAnim, {
        friction: 8,
        tension: 100,
        toValue: 0.96,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(pressScaleAnim, {
        friction: 8,
        tension: 100,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePress = () => {
    if (onPress) {
      safeHaptic();
      onPress();
    }
  };

  const resolvedValue = isLargeNumber ? formatLargeNumber(value) : value;
  const fontSize = getDynamicFontSize(resolvedValue);

  const renderTrendChip = () => {
    if (trend === undefined || trend === null) return null;

    if (typeof trend === "number") {
      return (
        <Chip
          icon={trend >= 0 ? "arrow-up" : "arrow-down"}
          style={kpiCardStyles.trendChip}
          textStyle={kpiCardStyles.trendText}
        >
          {Math.abs(trend)}%
        </Chip>
      );
    }

    if (typeof trend === "string" && trend.trim().length > 0) {
      return (
        <Chip
          icon="trending-up"
          style={kpiCardStyles.trendChip}
          textStyle={kpiCardStyles.trendText}
        >
          {trend}
        </Chip>
      );
    }

    return null;
  };

  const cardContent = (
    <LinearGradient
      colors={[`${color}F2`, `${color}B8`]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={kpiCardStyles.gradient}
    >
      <View style={kpiCardStyles.header}>
        <View
          style={[
            kpiCardStyles.iconContainer,
            { backgroundColor: "rgba(255,255,255,0.22)" },
          ]}
        >
          <MaterialCommunityIcons
            color="rgba(255,255,255,0.95)"
            name={icon}
            size={22}
          />
        </View>
        {renderTrendChip()}
      </View>

      <View>
        <Text style={kpiCardStyles.title}>{title}</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={1}
          style={[kpiCardStyles.value, { fontSize }]}
        >
          {resolvedValue}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={kpiCardStyles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );

  return (
    <Animated.View
      style={[
        kpiCardStyles.card,
        {
          borderColor: "rgba(255, 255, 255, 0.22)",
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { scale: pressScaleAnim },
          ],
        },
      ]}
    >
      {onPress ? (
        <Pressable
          android_ripple={{ color: "rgba(255,255,255,0.18)" }}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={{ flex: 1 }}
        >
          {cardContent}
        </Pressable>
      ) : (
        cardContent
      )}
    </Animated.View>
  );
};

export default KPICard;
