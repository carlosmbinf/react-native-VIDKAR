import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";

const getPalette = (isDarkMode) => ({
  actionBackground: isDarkMode ? "rgba(34, 211, 238, 0.16)" : "rgba(37, 99, 235, 0.1)",
  actionText: isDarkMode ? "#cffafe" : "#1d4ed8",
  border: isDarkMode ? "rgba(125, 211, 252, 0.22)" : "rgba(37, 99, 235, 0.16)",
  copy: isDarkMode ? "#cbd5e1" : "#475569",
  icon: isDarkMode ? "#67e8f9" : "#2563eb",
  iconBackground: isDarkMode ? "rgba(34, 211, 238, 0.14)" : "rgba(37, 99, 235, 0.1)",
  surface: isDarkMode ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.96)",
  title: isDarkMode ? "#f8fafc" : "#0f172a",
});

const CommerceLocationAccessCard = ({
  blocked = false,
  compact = false,
  loading = false,
  onOpenSettings,
  onRequestLocation,
  style,
}) => {
  const theme = useTheme();
  const palette = getPalette(theme.dark);
  const primaryLabel = blocked ? "Abrir ajustes" : "Activar ubicación";
  const title = blocked ? "Ubicación bloqueada" : "Ubicación apagada";
  const copy = blocked
    ? "Vidkar no puede encontrar tiendas cercanas porque el permiso de ubicación está bloqueado. Actívalo manualmente desde los ajustes de la app."
    : "Activa la ubicación para que podamos mostrar comercios disponibles cerca de ti y ordenar las tiendas por distancia real.";

  const handlePrimaryAction = blocked ? onOpenSettings : onRequestLocation;

  return (
    <Surface
      elevation={compact ? 0 : 1}
      style={[
        styles.card,
        compact ? styles.compactCard : null,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        <View
          style={[
            styles.iconBadge,
            compact ? styles.compactIconBadge : null,
            { backgroundColor: palette.iconBackground },
          ]}
        >
          <MaterialCommunityIcons
            color={palette.icon}
            name={blocked ? "map-marker-off-outline" : "map-marker-question-outline"}
            size={compact ? 22 : 28}
          />
        </View>

        <View style={styles.copyWrap}>
          <Text
            numberOfLines={compact ? 1 : 2}
            style={[styles.title, compact ? styles.compactTitle : null, { color: palette.title }]}
            variant={compact ? "titleSmall" : "titleMedium"}
          >
            {title}
          </Text>
          <Text
            numberOfLines={compact ? 2 : 4}
            style={[styles.copy, compact ? styles.compactCopy : null, { color: palette.copy }]}
            variant="bodySmall"
          >
            {copy}
          </Text>
        </View>
      </View>

      <View style={[styles.actionsRow, compact ? styles.compactActionsRow : null]}>
        <Button
          compact={compact}
          icon={blocked ? "cog-outline" : "crosshairs-gps"}
          loading={loading}
          mode="contained-tonal"
          onPress={handlePrimaryAction}
          style={[styles.primaryButton, { backgroundColor: palette.actionBackground }]}
          textColor={palette.actionText}
        >
          {primaryLabel}
        </Button>

        {blocked && onRequestLocation ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRequestLocation}
            style={({ pressed }) => [styles.secondaryAction, pressed ? styles.secondaryActionPressed : null]}
          >
            <Text style={[styles.secondaryActionText, { color: palette.actionText }]} variant="labelMedium">
              Reintentar
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
  },
  compactActionsRow: {
    marginTop: 12,
  },
  compactCard: {
    borderRadius: 18,
    padding: 14,
  },
  compactCopy: {
    lineHeight: 17,
  },
  compactIconBadge: {
    height: 42,
    width: 42,
  },
  compactTitle: {
    fontWeight: "900",
  },
  contentRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  copy: {
    lineHeight: 19,
    marginTop: 4,
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
  },
  iconBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  primaryButton: {
    borderRadius: 999,
  },
  secondaryAction: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  secondaryActionPressed: {
    opacity: 0.68,
  },
  secondaryActionText: {
    fontWeight: "800",
  },
  title: {
    fontWeight: "900",
    letterSpacing: 0,
  },
});

export default CommerceLocationAccessCard;
