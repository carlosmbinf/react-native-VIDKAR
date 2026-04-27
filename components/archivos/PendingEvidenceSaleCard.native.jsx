import MeteorBase from "@meteorrn/core";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Chip, Surface, Text } from "react-native-paper";

import {
  EvidenciasVentasEfectivoCollection,
  VentasRechargeCollection,
} from "../collections/collections";
import SubidaArchivos from "./SubidaArchivos.native";
import {
  formatPendingEvidenceMoney,
  getPendingEvidenceSummary,
} from "./evidencePendingUtils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const EVIDENCE_COUNT_FIELDS = {
  _id: 1,
  ventaId: 1,
};

const CARD_VENTA_FIELDS = {
  _id: 1,
  cobrado: 1,
  createdAt: 1,
  isCancelada: 1,
  isCobrado: 1,
  metodoPago: 1,
  monedaCobrado: 1,
  "producto.carritos": 1,
  "producto.comisiones": 1,
};

export default function PendingEvidenceSaleCardNative({ venta }) {
  const [expanded, setExpanded] = useState(false);
  const [comisionesInfo, setComisionesInfo] = useState({
    data: null,
    error: null,
    loading: false,
  });
  const ventaId = venta?._id;
  const ventaDetalle = Meteor.useTracker(() => {
    if (!ventaId) {
      return venta;
    }

    const ready = Meteor.subscribe(
      "ventasRecharge",
      { _id: ventaId },
      { fields: CARD_VENTA_FIELDS },
    ).ready();

    if (!ready) {
      return venta;
    }

    return (
      VentasRechargeCollection.findOne(
        { _id: ventaId },
        { fields: CARD_VENTA_FIELDS },
      ) || venta
    );
  }, [venta, ventaId]);

  const summary = getPendingEvidenceSummary(ventaDetalle);

  const tiendaIdParaComisiones = useMemo(() => {
    const carritos = ventaDetalle?.producto?.carritos || [];
    const itemComercio = carritos.find((item) => item?.type === "COMERCIO");
    return itemComercio?.idTienda || itemComercio?.producto?.idTienda || null;
  }, [ventaDetalle]);

  const monedaFinalParaComisiones = useMemo(
    () => ventaDetalle?.monedaCobrado || "CUP",
    [ventaDetalle],
  );
  const subtotalVenta = useMemo(
    () => parseFloat(ventaDetalle?.cobrado) || 0,
    [ventaDetalle],
  );
  const montoComisiones = useMemo(
    () => parseFloat(comisionesInfo?.data?.montoTotal) || 0,
    [comisionesInfo],
  );
  const totalConComisiones = useMemo(
    () => subtotalVenta + montoComisiones,
    [montoComisiones, subtotalVenta],
  );
  const isCalculandoTotal = Boolean(
    ventaId && tiendaIdParaComisiones && comisionesInfo.loading,
  );
  const amountLabel = useMemo(
    () => {
      if (isCalculandoTotal) {
        return "Calculando...";
      }

      return formatPendingEvidenceMoney(
        totalConComisiones,
        ventaDetalle?.monedaCobrado,
      );
    },
    [isCalculandoTotal, totalConComisiones, ventaDetalle?.monedaCobrado],
  );

  const evidenceCount = Meteor.useTracker(() => {
    if (!ventaId) {
      return 0;
    }

    Meteor.subscribe(
      "evidenciasVentasEfectivoRecharge",
      { ventaId },
      { fields: EVIDENCE_COUNT_FIELDS },
    );

    return EvidenciasVentasEfectivoCollection.find(
      { ventaId },
      { fields: EVIDENCE_COUNT_FIELDS },
    ).count();
  }, [ventaId]);

  const hasEvidence = evidenceCount > 0;
  const evidenceStatusLabel = hasEvidence
    ? `${evidenceCount} evidencia${evidenceCount === 1 ? "" : "s"}`
    : "Pendiente";

  useEffect(() => {
    let cancelled = false;
    const debeCalcular =
      !!ventaId && !!tiendaIdParaComisiones && !!monedaFinalParaComisiones;

    if (!debeCalcular) {
      setComisionesInfo({ data: null, error: null, loading: false });
      return () => {
        cancelled = true;
      };
    }

    setComisionesInfo((prev) => ({ ...prev, error: null, loading: true }));
    Meteor.call(
      "calculoDeComisionesPorTiendaFinanl",
      ventaId,
      tiendaIdParaComisiones,
      monedaFinalParaComisiones,
      (err, res) => {
        if (cancelled) {
          return;
        }

        if (err) {
          setComisionesInfo({
            data: null,
            error: err?.reason || err?.message || "Error obteniendo comisiones",
            loading: false,
          });
          return;
        }

        if (!res?.success) {
          setComisionesInfo({
            data: null,
            error: res?.message || "No se pudo calcular comisiones",
            loading: false,
          });
          return;
        }

        setComisionesInfo({ data: res, error: null, loading: false });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [monedaFinalParaComisiones, tiendaIdParaComisiones, ventaId]);

  return (
    <Surface elevation={3} style={styles.card}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.headerButton,
          pressed ? styles.headerButtonPressed : null,
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow} variant="labelSmall">
              Compra pendiente de evidencia
            </Text>
            <Text style={styles.title} variant="titleMedium">
              {summary.title}
            </Text>
            <Text style={styles.meta} variant="bodySmall">
              Pedido #{String(ventaId || "").slice(-6).toUpperCase()} • {summary.createdAtLabel}
            </Text>

            <View style={styles.typeRow}>
              {summary.types.map((type) => (
                <Chip
                  key={type.key}
                  compact
                  icon={type.icon}
                  style={styles.typeChip}
                  textStyle={styles.typeChipText}
                >
                  {type.label}
                </Chip>
              ))}
              <Chip compact style={styles.countChip} textStyle={styles.countChipText}>
                {summary.itemCount} item{summary.itemCount === 1 ? "" : "s"}
              </Chip>
              <Chip
                compact
                style={hasEvidence ? styles.evidenceReadyChip : styles.evidencePendingChip}
                textStyle={hasEvidence ? styles.evidenceReadyChipText : styles.evidencePendingChipText}
              >
                {evidenceStatusLabel}
              </Chip>
            </View>

            <Text style={styles.copy} variant="bodySmall">
              {hasEvidence
                ? `Esta compra ya tiene ${evidenceCount} evidencia${evidenceCount === 1 ? "" : "s"} subida${evidenceCount === 1 ? "" : "s"}. ${expanded ? "Oculta" : "Abre"} el card para revisar o cargar otra.`
                : `${expanded ? "Oculta" : "Abre"} el card para revisar el monto, confirmar la operación y subir el comprobante.`}
            </Text>
          </View>

          <View style={styles.headerAside}>
            <Chip compact style={styles.amountChip} textStyle={styles.amountChipText}>
              {amountLabel}
            </Chip>
            <View style={expanded ? styles.expandIndicatorOpen : styles.expandIndicator}>
              <Text style={styles.expandIndicatorText} variant="labelLarge">
                {expanded ? "Ocultar" : "Abrir"}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {expanded ? <SubidaArchivos venta={ventaDetalle} /> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  amountChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(34,197,94,0.18)",
    borderColor: "rgba(134,239,172,0.22)",
    borderWidth: 1,
  },
  amountChipText: {
    color: "#dcfce7",
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#0d1538",
    borderColor: "rgba(148,163,184,0.16)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  copy: {
    color: "rgba(226,232,240,0.74)",
    lineHeight: 20,
    marginTop: 2,
  },
  countChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  countChipText: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  evidencePendingChip: {
    backgroundColor: "rgba(248,113,113,0.14)",
  },
  evidencePendingChipText: {
    color: "#fecaca",
    fontWeight: "800",
  },
  evidenceReadyChip: {
    backgroundColor: "rgba(34,197,94,0.16)",
  },
  evidenceReadyChipText: {
    color: "#dcfce7",
    fontWeight: "800",
  },
  eyebrow: {
    color: "#93c5fd",
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  expandIndicator: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(148,163,184,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  expandIndicatorOpen: {
    alignItems: "center",
    backgroundColor: "rgba(125,211,252,0.14)",
    borderColor: "rgba(125,211,252,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  expandIndicatorText: {
    color: "#e0f2fe",
    fontWeight: "800",
  },
  headerAside: {
    alignItems: "flex-end",
    gap: 10,
  },
  headerButton: {
    padding: 18,
  },
  headerButtonPressed: {
    opacity: 0.96,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  meta: {
    color: "rgba(191,219,254,0.78)",
  },
  title: {
    color: "#f8fafc",
    fontWeight: "800",
  },
  typeChip: {
    backgroundColor: "rgba(99,102,241,0.16)",
  },
  typeChipText: {
    color: "#e0e7ff",
    fontWeight: "700",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});