import React from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  IconButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import AppHeader from "../Header/AppHeader";
import { megasToGB } from "./MegasConverter";

const formatPrice = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
};

const ProxyVPNPurchaseSummary = ({
  accentColor,
  backHref,
  calculatingPrice,
  onCancel,
  onConfirm,
  onMonthsChange,
  packageData,
  packageIcon,
  months = 1,
  price,
  serviceName,
  submitting,
}) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const compactActions = width < 390;
  const isUnlimited = !!packageData?.esPorTiempo;
  const description = packageData?.comentario || packageData?.detalles;
  const premiumColor = theme.dark ? "#FFD54F" : "#8A5A00";
  const activeColor = isUnlimited ? premiumColor : accentColor;
  const actionTextColor = theme.dark ? "#07140C" : "#FFFFFF";
  const cardColor = theme.colors.elevation?.level1 || theme.colors.surface;
  const mutedColor = theme.colors.onSurfaceVariant || theme.colors.onSurface;
  const borderColor = theme.colors.outlineVariant || theme.colors.outline;
  const infoBackground = theme.dark
    ? "rgba(255, 193, 7, 0.12)"
    : "rgba(255, 193, 7, 0.14)";
  const infoColor = theme.dark ? "#FFE082" : "#6D4C00";

  return (
    <Surface
      style={[styles.surface, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title={`Comprar ${serviceName}`}
        subtitle="Revisa tu selección antes de continuar"
        backHref={backHref}
        showBackButton
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card
          mode="contained"
          style={[
            styles.card,
            { backgroundColor: cardColor, borderColor },
          ]}
        >
          <Card.Content style={styles.cardContent}>
            <View
              style={[
                styles.serviceHeader,
                { backgroundColor: `${activeColor}18` },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${activeColor}22` },
                ]}
              >
                <IconButton
                  icon={isUnlimited ? "infinity" : packageIcon}
                  iconColor={activeColor}
                  size={28}
                  style={styles.icon}
                />
              </View>

              <View style={styles.serviceCopy}>
                <Text
                  variant="labelLarge"
                  style={[styles.eyebrow, { color: activeColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {serviceName.toUpperCase()} VIDKAR
                </Text>
                <Text
                  variant="headlineSmall"
                  style={[styles.packageTitle, { color: theme.colors.onSurface }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {isUnlimited
                    ? "Navegación ilimitada"
                    : megasToGB(packageData?.megas)}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: mutedColor }}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {isUnlimited ? `Vigencia de ${months * 30} días` : "Paquete por consumo"}
                </Text>
              </View>
            </View>

            {description ? (
              <Text
                variant="bodyMedium"
                style={[styles.description, { color: mutedColor }]}
                selectable
              >
                {description}
              </Text>
            ) : null}

            {isUnlimited ? (
              <View style={styles.monthsSection}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
                  Cantidad de meses
                </Text>
                <TextInput
                  accessibilityLabel="Cantidad de meses"
                  keyboardType="number-pad"
                  mode="outlined"
                  onChangeText={(value) => {
                    const parsed = Number(value);
                    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 120) {
                      onMonthsChange?.(parsed);
                    }
                  }}
                  value={String(months)}
                />
                <Text variant="bodySmall" style={{ color: mutedColor }}>
                  Cada mes equivale a 30 días de servicio ilimitado.
                </Text>
              </View>
            ) : null}

            <Divider style={[styles.divider, { backgroundColor: borderColor }]} />

            <View style={styles.priceHeading}>
              <View>
                <Text
                  variant="titleMedium"
                  style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
                >
                  Resumen de compra
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: mutedColor }}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  Precio final del paquete seleccionado
                </Text>
              </View>
              <IconButton
                icon="receipt-text-outline"
                iconColor={accentColor}
                size={22}
                style={styles.receiptIcon}
              />
            </View>

            {calculatingPrice ? (
              <View
                accessibilityLabel="Calculando precio del paquete"
                accessibilityRole="progressbar"
                style={styles.loaderContainer}
              >
                <ActivityIndicator color={accentColor} size="small" />
                <Text variant="bodyMedium" style={{ color: mutedColor }}>
                  Calculando precio…
                </Text>
              </View>
            ) : price == null ? (
              <View
                accessibilityLabel="Precio no disponible"
                style={styles.loaderContainer}
              >
                <IconButton
                  icon="alert-circle-outline"
                  iconColor={theme.colors.error}
                  size={26}
                  style={styles.icon}
                />
                <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                  No se pudo obtener el precio
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.errorHint, { color: mutedColor }]}
                >
                  Regresa al catálogo e inténtalo nuevamente.
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.totalContainer,
                  { backgroundColor: `${accentColor}14`, borderColor: `${accentColor}45` },
                ]}
              >
                <View style={styles.totalCopy}>
                  <Text
                    variant="labelLarge"
                    style={{ color: mutedColor }}
                    numberOfLines={2}
                  >
                    Total a pagar
                  </Text>
                  <Text
                    accessibilityLabel={`Total a pagar ${formatPrice(price)} CUP`}
                    variant="headlineMedium"
                    style={[styles.totalPrice, { color: accentColor }]}
                    numberOfLines={1}
                  >
                    ${formatPrice(price)}
                    <Text
                      variant="titleMedium"
                      style={[styles.currency, { color: accentColor }]}
                    >
                      {" "}CUP
                    </Text>
                  </Text>
                </View>
                <View
                  style={[
                    styles.readyBadge,
                    { backgroundColor: `${accentColor}1F` },
                  ]}
                >
                  <IconButton
                    icon="check-circle-outline"
                    iconColor={accentColor}
                    size={18}
                    style={styles.readyIcon}
                  />
                  <Text
                    variant="labelMedium"
                    style={[styles.readyText, { color: accentColor }]}
                    numberOfLines={1}
                  >
                    Listo
                  </Text>
                </View>
              </View>
            )}

            <View
              style={[
                styles.infoBox,
                { backgroundColor: infoBackground, borderColor: `${infoColor}55` },
              ]}
            >
              <IconButton
                icon="information-outline"
                iconColor={infoColor}
                size={21}
                style={styles.infoIcon}
              />
              <Text
                variant="bodySmall"
                style={[styles.infoText, { color: infoColor }]}
                numberOfLines={4}
              >
                Se agregará al carrito. En el siguiente paso podrás elegir el
                método de pago.
              </Text>
            </View>
          </Card.Content>

          <Card.Actions
            style={[styles.actions, compactActions && styles.compactActions]}
          >
            <Button
              accessibilityLabel={`Cancelar compra de ${serviceName}`}
              disabled={calculatingPrice || submitting}
              mode="outlined"
              onPress={onCancel}
              style={[
                styles.actionButton,
                compactActions && styles.compactActionButton,
              ]}
              textColor={theme.colors.onSurface}
            >
              Cancelar
            </Button>
            <Button
              accessibilityLabel={`Agregar paquete ${serviceName} al carrito`}
              buttonColor={accentColor}
              disabled={calculatingPrice || submitting || price == null}
              icon="cart-plus"
              loading={submitting}
              mode="contained"
              onPress={onConfirm}
              style={[
                styles.actionButton,
                styles.confirmButton,
                compactActions && styles.compactActionButton,
              ]}
              textColor={actionTextColor}
            >
              Agregar al carrito
            </Button>
          </Card.Actions>
        </Card>

        <Text
          variant="bodySmall"
          style={[styles.footerText, { color: mutedColor }]}
        >
          Compra protegida · Verifica los detalles antes de continuar
        </Text>
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actions: {
    gap: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 680,
    overflow: "hidden",
    width: "100%",
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  compactActionButton: {
    flex: 0,
    width: "100%",
  },
  compactActions: {
    alignItems: "stretch",
    flexDirection: "column-reverse",
  },
  confirmButton: {
    flex: 1.35,
  },
  currency: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  description: {
    lineHeight: 21,
    marginTop: 16,
    maxWidth: "100%",
  },
  divider: {
    marginVertical: 20,
  },
  eyebrow: {
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  errorHint: {
    textAlign: "center",
  },
  footerText: {
    marginTop: 16,
    textAlign: "center",
  },
  icon: {
    margin: 0,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  infoBox: {
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 16,
    padding: 12,
  },
  infoIcon: {
    margin: 0,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    lineHeight: 19,
    paddingTop: 2,
  },
  loaderContainer: {
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    minHeight: 108,
  },
  monthsSection: {
    gap: 8,
    marginTop: 18,
  },
  packageTitle: {
    fontWeight: "800",
    marginVertical: 2,
  },
  priceHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  readyBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  readyIcon: {
    margin: 0,
  },
  readyText: {
    fontWeight: "800",
    marginLeft: 2,
    marginRight: 5,
  },
  receiptIcon: {
    margin: 0,
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionTitle: {
    fontWeight: "800",
  },
  serviceCopy: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  serviceHeader: {
    alignItems: "flex-start",
    borderRadius: 18,
    flexDirection: "row",
    padding: 16,
  },
  surface: {
    flex: 1,
  },
  totalContainer: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    padding: 16,
  },
  totalCopy: {
    flex: 1,
    minWidth: 0,
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 28,
    marginTop: 2,
  },
});

export default ProxyVPNPurchaseSummary;