import MeteorBase from "@meteorrn/core";
import React, { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Chip, Surface, Text, useTheme } from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { VentasRechargeCollection } from "../collections/collections";
import AppHeader, { MENU_PRINCIPAL_HEADER_COLOR, useAppHeaderContentInset } from "../Header/AppHeader";
import PendingEvidenceSaleCardNative from "./PendingEvidenceSaleCard.native";
import {
    buildPendingEvidenceAggregate,
    buildPendingEvidenceQuery,
    PENDING_EVIDENCE_FIELDS,
} from "./evidencePendingUtils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

export default function PendingEvidenceCenterNative() {
  const theme = useTheme();
  const headerInset = useAppHeaderContentInset();
  const dataReady = useDeferredScreenData();
  const palette = useMemo(
    () => theme.dark
      ? {
        background: "#050b16",
        card: "#0d1538",
        empty: "rgba(15,23,42,0.64)",
        primaryText: "#f8fafc",
        secondaryText: "rgba(226,232,240,0.74)",
        mutedText: "rgba(191,219,254,0.78)",
        accent: "#93c5fd",
        stat: "rgba(15,23,42,0.58)",
        chip: "rgba(99,102,241,0.16)",
        chipText: "#e0e7ff",
        border: "rgba(148,163,184,0.16)",
      }
    : {
        background: "#f1f5f9",
        card: "#ffffff",
        empty: "#ffffff",
        primaryText: "#0f172a",
        secondaryText: "#475569",
        mutedText: "#64748b",
        accent: "#2563eb",
        stat: "#f8fafc",
        chip: "#eef2ff",
        chipText: "#3730a3",
        border: "rgba(15,23,42,0.10)",
        },
      [theme.dark],
    );

  const { ready, ventas } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { ready: false, ventas: [] };
    }

    const userId = Meteor.userId();
    if (!userId) {
      return { ready: true, ventas: [] };
    }

    const query = buildPendingEvidenceQuery(userId);
    const handle = Meteor.subscribe("ventasRecharge", query, {
      fields: PENDING_EVIDENCE_FIELDS,
    });

    return {
      ready: handle.ready(),
      ventas: VentasRechargeCollection.find(query, {
        fields: PENDING_EVIDENCE_FIELDS,
        sort: { createdAt: -1 },
      }).fetch(),
    };
  }, [dataReady]);

  const aggregate = useMemo(
    () => buildPendingEvidenceAggregate(ventas),
    [ventas],
  );

  const listHeaderComponent = useMemo(() => {
    const PendingEvidenceHeader = () => (
      <Surface style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={2}>
        <Text style={[styles.heroEyebrow, { color: palette.accent }]} variant="labelSmall">
          Centro de comprobantes
        </Text>
        <Text style={[styles.heroTitle, { color: palette.primaryText }]} variant="headlineSmall">
          Sube tus evidencias sin ir pantalla por pantalla
        </Text>
        <Text style={[styles.heroCopy, { color: palette.secondaryText }]} variant="bodyMedium">
          Aquí tienes juntas las compras que todavía necesitan comprobante de pago para continuar su flujo operativo.
        </Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: palette.stat, borderColor: palette.border }]}>
            <Text style={[styles.statLabel, { color: palette.mutedText }]} variant="labelSmall">
              Pendientes
            </Text>
            <Text style={[styles.statValue, { color: palette.primaryText }]} variant="headlineMedium">
              {aggregate.pendingEvidenceCount}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: palette.stat, borderColor: palette.border }]}>
            <Text style={[styles.statLabel, { color: palette.mutedText }]} variant="labelSmall">
              Tipos activos
            </Text>
            <Text style={[styles.statValue, { color: palette.primaryText }]} variant="headlineMedium">
              {aggregate.pendingEvidenceTypes.length}
            </Text>
          </View>
        </View>

        {aggregate.pendingEvidenceTypes.length > 0 ? (
          <View style={styles.typesRow}>
            {aggregate.pendingEvidenceTypes.map((type) => (
              <Chip
                key={type.key}
                compact
                icon={type.icon}
                style={[styles.typeChip, { backgroundColor: palette.chip }]}
                textStyle={[styles.typeChipText, { color: palette.chipText }]}
              >
                {type.label}: {type.count}
              </Chip>
            ))}
          </View>
        ) : null}
      </Surface>
    );

    return PendingEvidenceHeader;
  }, [aggregate.pendingEvidenceCount, aggregate.pendingEvidenceTypes, palette]);

  const header = (
    <AppHeader
      backgroundColor={MENU_PRINCIPAL_HEADER_COLOR}
      backHref="/(normal)/Main"
      overlapContent
      showBackButton
      title="Evidencias pendientes"
    />
  );

  if (!ready) {
    return (
      <Surface style={[styles.surface, { backgroundColor: palette.background }]}>
        {header}
        <View style={styles.centerState}>
          <ActivityIndicator color="#7c3aed" size="large" />
          <Text style={[styles.centerStateTitle, { color: palette.primaryText }]} variant="titleMedium">
            Cargando evidencias pendientes...
          </Text>
          <Text style={[styles.centerStateCopy, { color: palette.secondaryText }]} variant="bodySmall">
            Estamos reuniendo las compras que todavía necesitan comprobante.
          </Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.surface, { backgroundColor: palette.background }]}>
      {header}
      <FlatList
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Surface style={[styles.emptyCard, { backgroundColor: palette.empty, borderColor: palette.border }]} elevation={1}>
            <Text style={[styles.emptyTitle, { color: palette.primaryText }]} variant="titleMedium">
              No tienes compras pendientes de evidencia
            </Text>
            <Text style={[styles.emptyCopy, { color: palette.secondaryText }]} variant="bodySmall">
              Cuando generes una compra en efectivo y falte el comprobante, aparecerá aquí para subirlo rápidamente.
            </Text>
          </Surface>
        }
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={[styles.listContent, { paddingTop: headerInset + 16 }]}
        data={ventas}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <PendingEvidenceSaleCardNative venta={item} />}
        showsVerticalScrollIndicator={false}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  appbar: {
    backgroundColor: "#1e3a8a",
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerStateCopy: {
    color: "rgba(255,255,255,0.72)",
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  centerStateTitle: {
    color: "#ffffff",
    fontWeight: "800",
    marginTop: 16,
    textAlign: "center",
  },
  emptyCard: {
    backgroundColor: "rgba(15,23,42,0.64)",
    borderColor: "rgba(148,163,184,0.14)",
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 16,
    padding: 20,
  },
  emptyCopy: {
    color: "rgba(226,232,240,0.72)",
    lineHeight: 20,
    marginTop: 8,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  heroCard: {
    backgroundColor: "#111c44",
    borderRadius: 26,
    marginBottom: 14,
    marginHorizontal: 16,
    overflow: "hidden",
    padding: 20,
  },
  heroCopy: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 22,
    marginTop: 8,
  },
  heroEyebrow: {
    color: "#93c5fd",
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 28,
    paddingTop: 16,
  },
  separator: {
    height: 14,
  },
  statCard: {
    backgroundColor: "rgba(15,23,42,0.58)",
    borderColor: "rgba(148,163,184,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statLabel: {
    color: "rgba(191,219,254,0.82)",
    fontWeight: "700",
  },
  statValue: {
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  surface: {
    backgroundColor: "#0f172a",
    flex: 1,
  },
  typeChip: {
    backgroundColor: "rgba(99,102,241,0.16)",
  },
  typeChipText: {
    color: "#e0e7ff",
    fontWeight: "700",
  },
  typesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
});