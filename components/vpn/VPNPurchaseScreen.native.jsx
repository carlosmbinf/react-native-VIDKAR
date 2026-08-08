import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useTheme } from "react-native-paper";

import useSafeBack from "../navigation/useSafeBack";
import ProxyVPNPurchaseSummary from "../shared/ProxyVPNPurchaseSummary.native";

const Meteor = MeteorBase;

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const VPNPurchaseScreen = () => {
  const theme = useTheme();
  const safeBack = useSafeBack("/(normal)/VPNPackages");
  const params = useLocalSearchParams();
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [precioCalculado, setPrecioCalculado] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const paquete = useMemo(() => {
    try {
      return typeof params.paquete === "string"
        ? JSON.parse(params.paquete)
        : null;
    } catch {
      return null;
    }
  }, [params.paquete]);

  useEffect(() => {
    if (!paquete) {
      Alert.alert("Error", "No se recibió información del paquete");
      safeBack();
      return;
    }

    const user = Meteor.user();
    if (!user) {
      Alert.alert("Error", "Debes iniciar sesión para continuar");
      safeBack();
      return;
    }

    setCalculatingPrice(true);
    Meteor.call(
      "ventas.calcularPrecioProxyVPN",
      {
        esPorTiempo: !!paquete.esPorTiempo,
        megas: paquete.megas,
        type: "VPN",
        userId: user._id,
      },
      (error, result) => {
        if (error) {
          Alert.alert("Error", "No se pudo calcular el precio del paquete");
          setCalculatingPrice(false);
          return;
        }

        setPrecioCalculado(result);
        setCalculatingPrice(false);
      },
    );
  }, [paquete, safeBack]);

  const handleConfirmarCompra = () => {
    if (!paquete || !precioCalculado) {
      Alert.alert("Error", "Calculando precio, por favor espera...");
      return;
    }

    setSubmitting(true);
    Meteor.call(
      "carrito.addProxyVPN",
      {
        comentario: paquete.comentario || paquete.detalles,
        descuentoAdmin: parseNumber(precioCalculado?.descuento),
        esPorTiempo: !!paquete.esPorTiempo,
        megas: paquete.megas,
        precioBaseProxyVPN: parseNumber(precioCalculado?.precioBase),
        producto: paquete,
        type: "VPN",
      },
      (error) => {
        setSubmitting(false);
        if (error) {
          Alert.alert(
            "Error",
            error.reason || "No se pudo agregar el paquete al carrito",
          );
          return;
        }

        Alert.alert(
          "Agregado al Carrito",
          "El paquete ha sido agregado al carrito. Abre el carrito para completar tu compra.",
          [
            {
              onPress: safeBack,
              style: "cancel",
              text: "Continuar comprando",
            },
          ],
        );
      },
    );
  };

  if (!paquete) {
    return null;
  }

  return (
    <ProxyVPNPurchaseSummary
      accentColor={theme.dark ? "#66BB6A" : "#388E3C"}
      backHref="/(normal)/VPNPackages"
      calculatingPrice={calculatingPrice}
      onCancel={safeBack}
      onConfirm={handleConfirmarCompra}
      packageData={paquete}
      packageIcon="shield-check"
      price={precioCalculado?.precioBase}
      serviceName="VPN"
      submitting={submitting}
    />
  );
};

export default VPNPurchaseScreen;
