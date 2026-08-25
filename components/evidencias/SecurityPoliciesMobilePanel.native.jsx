import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Chip, Surface, Text, useTheme } from "react-native-paper";
import { buildAntifraudPalette } from "./antifraudTheme";

export default function SecurityPoliciesMobilePanel({ summary = {}, isTablet = false }) {
  const theme = useTheme();
  const palette = useMemo(() => buildAntifraudPalette(theme), [theme]);
  const medidas = summary.medidasPreventivas || [];

  return (
    <View style={styles.container}>
      {/* Alert Recommendations */}
      {medidas.length ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]} variant="titleMedium">
            Diagnóstico Dinámico & Recomendaciones
          </Text>
          <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
            Hallazgos detectados automáticamente a partir del comportamiento reciente.
          </Text>

          <View style={[styles.grid, isTablet && styles.gridTablet]}>
            {medidas.map((medida) => (
              <Surface
                elevation={1}
                key={medida.id}
                style={[
                  styles.alertCard,
                  medida.tipo === "ALTA_PRIORIDAD" ? styles.alertHigh : styles.alertNormal,
                  { backgroundColor: medida.tipo === "ALTA_PRIORIDAD" ? palette.riskSoft : palette.infoSoft, borderColor: palette.border },
                  isTablet && styles.cardTablet,
                ]}
              >
                <View style={styles.alertHeader}>
                  <Text
                    style={[
                      styles.alertTitle,
                      { color: medida.tipo === "ALTA_PRIORIDAD" ? palette.riskText : palette.infoText },
                    ]}
                    variant="titleSmall"
                  >
                    {medida.titulo}
                  </Text>
                  <Chip
                    compact
                    style={[
                      medida.tipo === "ALTA_PRIORIDAD" ? styles.riskBadge : styles.safeBadge,
                      { backgroundColor: medida.tipo === "ALTA_PRIORIDAD" ? palette.riskSoft : palette.successSoft },
                    ]}
                    textStyle={{ color: medida.tipo === "ALTA_PRIORIDAD" ? palette.riskText : palette.successText }}
                  >
                    {medida.tipo}
                  </Chip>
                </View>
                <Text style={[styles.alertDesc, { color: palette.copy }]} variant="bodySmall">
                  {medida.descripcion}
                </Text>
              </Surface>
            ))}
          </View>
        </View>
      ) : null}

      {/* 4 Security Pillars */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]} variant="titleMedium">
          Políticas de Seguridad & Reglas Activas
        </Text>
        <Text style={[styles.muted, { color: palette.muted }]} variant="bodySmall">
          Análisis multicapa algorítmico, criptográfico y con Inteligencia Artificial.
        </Text>

        <View style={[styles.grid, isTablet && styles.gridTablet]}>
          {/* Policy 1 */}
            <Card mode="contained" style={[styles.policyCard, { backgroundColor: palette.surface, borderColor: palette.border }, isTablet && styles.cardTablet]}>
            <Card.Content>
              <View style={styles.policyHeader}>
                <View style={[styles.iconBox, { backgroundColor: palette.infoSoft }]}> 
                  <MaterialCommunityIcons color={palette.info} name="lock-check" size={24} />
                </View>
                <View style={styles.policyTitleWrap}>
                  <Text style={[styles.policyTitle, { color: palette.text }]} variant="titleSmall">
                    1. Unicidad de Referencia de Pago
                  </Text>
                  <Chip compact style={[styles.activeChip, { backgroundColor: palette.successSoft }]} textStyle={{ color: palette.successText }}>Regla Activa</Chip>
                </View>
              </View>
              <Text style={[styles.policyText, { color: palette.copy }]} variant="bodySmall">
                Cada referencia bancaria es única. Si una referencia ya fue aprobada en otra venta, cualquier nuevo intento se bloquea como <Text style={[styles.code, { color: palette.accentText }]}>REFERENCE_ALREADY_USED</Text>. Una evidencia rechazada no bloquea por sí sola a otros usuarios, pero repetirla genera una alerta.
              </Text>
            </Card.Content>
          </Card>

          {/* Policy 2 */}
            <Card mode="contained" style={[styles.policyCard, { backgroundColor: palette.surface, borderColor: palette.border }, isTablet && styles.cardTablet]}>
            <Card.Content>
              <View style={styles.policyHeader}>
                <View style={[styles.iconBox, { backgroundColor: palette.warningSoft }]}> 
                  <MaterialCommunityIcons color={palette.warning} name="clock-check-outline" size={24} />
                </View>
                <View style={styles.policyTitleWrap}>
                  <Text style={[styles.policyTitle, { color: palette.text }]} variant="titleSmall">
                    2. Tolerancia Temporal (±2h)
                  </Text>
                  <Chip compact style={[styles.activeChip, { backgroundColor: palette.successSoft }]} textStyle={{ color: palette.successText }}>Margen ±2h UTC/Local</Chip>
                </View>
              </View>
              <Text style={[styles.policyText, { color: palette.copy }]} variant="bodySmall">
                Permite una ventana de 2 horas antes de la venta y 2 horas después de la subida para compensar discrepancias entre la hora UTC del servidor y la zona local bancaria. Las fechas incompatibles disparan <Text style={[styles.code, { color: palette.accentText }]}>REFERENCE_DATE_CONFLICT</Text>.
              </Text>
            </Card.Content>
          </Card>

          {/* Policy 3 */}
            <Card mode="contained" style={[styles.policyCard, { backgroundColor: palette.surface, borderColor: palette.border }, isTablet && styles.cardTablet]}>
            <Card.Content>
              <View style={styles.policyHeader}>
                <View style={[styles.iconBox, { backgroundColor: palette.infoSoft }]}> 
                  <MaterialCommunityIcons color={palette.info} name="fingerprint" size={24} />
                </View>
                <View style={styles.policyTitleWrap}>
                  <Text style={[styles.policyTitle, { color: palette.text }]} variant="titleSmall">
                    3. Integridad Criptográfica (SHA-256)
                  </Text>
                  <Chip compact style={[styles.activeChip, { backgroundColor: palette.successSoft }]} textStyle={{ color: palette.successText }}>Firma SHA-256</Chip>
                </View>
              </View>
              <Text style={[styles.policyText, { color: palette.copy }]} variant="bodySmall">
                Se calcula un hash SHA-256 sobre los bytes de la imagen. Detecta si se reutiliza una captura alterando texto o metadatos y clasifica el caso como <Text style={[styles.code, { color: palette.accentText }]}>EVIDENCE_MODIFICATION_ATTEMPT</Text>.
              </Text>
            </Card.Content>
          </Card>

          {/* Policy 4 */}
            <Card mode="contained" style={[styles.policyCard, { backgroundColor: palette.surface, borderColor: palette.border }, isTablet && styles.cardTablet]}>
            <Card.Content>
              <View style={styles.policyHeader}>
                <View style={[styles.iconBox, { backgroundColor: palette.infoSoft }]}> 
                  <MaterialCommunityIcons color={palette.info} name="account-group" size={24} />
                </View>
                <View style={styles.policyTitleWrap}>
                  <Text style={[styles.policyTitle, { color: palette.text }]} variant="titleSmall">
                    4. Detección de Multicuentas
                  </Text>
                  <Chip compact style={[styles.activeChip, { backgroundColor: palette.successSoft }]} textStyle={{ color: palette.successText }}>Vigilancia Continua</Chip>
                </View>
              </View>
              <Text style={[styles.policyText, { color: palette.copy }]} variant="bodySmall">
                Monitoreo cruzado de usuarios que intentan reutilizar comprobantes de otros clientes. Las cuentas con múltiples intentos suben al ranking de riesgo y pueden marcarse para bloqueo preventivo.
              </Text>
            </Card.Content>
          </Card>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    marginBottom: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  grid: {
    gap: 10,
    marginTop: 4,
  },
  gridTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cardTablet: {
    flexBasis: "48.5%",
  },
  alertCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  alertHigh: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  alertNormal: {
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderColor: "rgba(59, 130, 246, 0.25)",
  },
  alertHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  alertTitle: {
    flex: 1,
    fontWeight: "800",
    marginRight: 8,
  },
  alertDesc: {
    color: "rgba(226, 232, 240, 0.85)",
    lineHeight: 18,
  },
  policyCard: {
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderColor: "rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    borderWidth: 1,
  },
  policyHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  iconBox: {
    alignItems: "center",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  policyTitleWrap: {
    flex: 1,
  },
  policyTitle: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  activeChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    marginTop: 2,
  },
  policyText: {
    color: "rgba(226, 232, 240, 0.8)",
    lineHeight: 18,
  },
  code: {
    color: "#93c5fd",
    fontFamily: "monospace",
    fontWeight: "700",
  },
  riskBadge: {
    backgroundColor: "rgba(248, 113, 113, 0.15)",
  },
  safeBadge: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
  },
  muted: {
    color: "rgba(226, 232, 240, 0.65)",
  },
});