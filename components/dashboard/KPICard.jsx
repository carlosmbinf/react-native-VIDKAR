import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Chip, Text } from "react-native-paper";

import { kpiCardStyles } from "./styles/dashboardStyles";
import { formatLargeNumber, getDynamicFontSize } from "./utils/formatUtils";

const KPICard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  delay = 0,
  isLargeNumber = false,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        delay,
        duration: 520,
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

  const resolvedValue = isLargeNumber ? formatLargeNumber(value) : value;
  const fontSize = getDynamicFontSize(resolvedValue);

  return (
    <Animated.View
      style={[
        kpiCardStyles.card,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <LinearGradient
        colors={[`${color}E6`, `${color}99`]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={kpiCardStyles.gradient}
      >
        <View style={kpiCardStyles.header}>
          <View style={kpiCardStyles.iconContainer}>
            <MaterialCommunityIcons
              color="rgba(255,255,255,0.92)"
              name={icon}
              size={22}
            />
          </View>
          {typeof trend === "number" ? (
            <Chip
              icon={trend > 0 ? "arrow-up" : "arrow-down"}
              style={kpiCardStyles.trendChip}
              textStyle={kpiCardStyles.trendText}
            >
              {Math.abs(trend)}%
            </Chip>
          ) : null}
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
            <Text style={kpiCardStyles.subtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

export default KPICard;
