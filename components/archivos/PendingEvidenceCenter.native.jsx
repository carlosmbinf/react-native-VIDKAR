import MeteorBase from "@meteorrn/core";
import React, { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Chip, Surface, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { VentasRechargeCollection } from "../collections/collections";
import useSafeBack from "../navigation/useSafeBack";
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
  const safeBack = useSafeBack("/(normal)/Main");
  const insets = useSafeAreaInsets();
  const dataReady = useDeferredScreenData();

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

  const renderAppbar = useCallback(
    () => (
      <Appbar
        style={[
          styles.appbar,
          {
            height: insets.top + 50,
            paddingTop: insets.top,
          },
        ]}
      >
        <Appbar.BackAction
          color="#ffffff"
          onPress={safeBack}
        />
        <Appbar.Content color="#ffffff" title="Evidencias pendientes" />
      </Appbar>
    ),
    [insets.top, safeBack],
  );

  const listHeaderComponent = useCallback(
    () => (
      <Surface style={styles.heroCard} elevation={2}>
        <Text style={styles.heroEyebrow} variant="labelSmall">
          Centro de comprobantes
        </Text>
        <Text style={styles.heroTitle} variant="headlineSmall">
          Sube tus evidencias sin ir pantalla por pantalla
        </Text>
        <Text style={styles.heroCopy} variant="bodyMedium">
          Aquí tienes juntas las compras que todavía necesitan comprobante de pago para continuar su flujo operativo.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel} variant="labelSmall">
              Pendientes
            </Text>
            <Text style={styles.statValue} variant="headlineMedium">
              {aggregate.pendingEvidenceCount}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel} variant="labelSmall">
              Tipos activos
            </Text>
            <Text style={styles.statValue} variant="headlineMedium">
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
                style={styles.typeChip}
                textStyle={styles.typeChipText}
              >
                {type.label}: {type.count}
              </Chip>
            ))}
          </View>
        ) : null}
      </Surface>
    ),
    [aggregate.pendingEvidenceCount, aggregate.pendingEvidenceTypes],
  );

  if (!ready) {
    return (
      <Surface style={styles.surface}>
        {renderAppbar()}
        <View style={styles.centerState}>
          <ActivityIndicator color="#7c3aed" size="large" />
          <Text style={styles.centerStateTitle} variant="titleMedium">
            Cargando evidencias pendientes...
          </Text>
          <Text style={styles.centerStateCopy} variant="bodySmall">
            Estamos reuniendo las compras que todavía necesitan comprobante.
          </Text>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.surface}>
      {renderAppbar()}
      <FlatList
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Surface style={styles.emptyCard} elevation={1}>
            <Text style={styles.emptyTitle} variant="titleMedium">
              No tienes compras pendientes de evidencia
            </Text>
            <Text style={styles.emptyCopy} variant="bodySmall">
              Cuando generes una compra en efectivo y falte el comprobante, aparecerá aquí para subirlo rápidamente.
            </Text>
          </Surface>
        }
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={styles.listContent}
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