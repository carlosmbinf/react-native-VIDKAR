import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, ActivityIndicator, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { getPaymentReturnUrl } from "../../services/navigation/universalLinks";
import { getVidkarBaseUrl } from "../../services/appUrls";

const browserSessions = new Map<string, Promise<WebBrowser.WebBrowserResult>>();

function openConfirmation(url: string) {
  const existing = browserSessions.get(url);
  if (existing) return existing;
  // Safari integrado carga la URL directamente; Linking.openURL volvería a activar el Universal Link.
  const session = WebBrowser.openBrowserAsync(url).then((result) => {
    if (result.type === WebBrowser.WebBrowserResultType.LOCKED) {
      throw new Error("El navegador de confirmación no pudo abrirse.");
    }
    return result;
  });
  browserSessions.set(url, session);
  return session;
}

export default function PaymentReturnScreen() {
  const { url } = useLocalSearchParams<{ url?: string | string[] }>();
  const router = useRouter();
  const theme = useTheme();
  const attempted = useRef<string | null>(null);
  const [opening, setOpening] = useState(true);
  const [failed, setFailed] = useState(false);
  const paymentUrl = typeof url === "string" ? getPaymentReturnUrl(url, getVidkarBaseUrl()) : null;

  useEffect(() => {
    if (!paymentUrl) {
      setOpening(false);
      setFailed(true);
      return;
    }
    if (attempted.current === paymentUrl) return;
    attempted.current = paymentUrl;
    setOpening(true);
    setFailed(false);
    openConfirmation(paymentUrl)
      .catch(() => {
        console.error("[PaymentReturn] No se pudo abrir la confirmación web.");
        setFailed(true);
      })
      .finally(() => setOpening(false));
  }, [paymentUrl]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {opening && <ActivityIndicator accessibilityLabel="Abriendo confirmación web" />}
        <Text variant="titleLarge">Confirmación de pago</Text>
        <Text>
          {opening
            ? "Abriendo la página web que confirma tu pedido."
            : failed
              ? "No se pudo abrir la confirmación. Revisa tus compras y contacta con soporte antes de volver a pagar."
              : "Consulta el resultado en la página web y revisa tus compras. No vuelvas a pagar si el resultado está pendiente."}
        </Text>
        <Button mode="contained" disabled={opening} onPress={() => router.replace("/(normal)/Main")}>
          Volver a VIDKAR
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: "center", padding: 24, gap: 20 },
});
