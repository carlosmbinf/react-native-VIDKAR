import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, View } from "react-native";
import { Button, Divider, ProgressBar, Surface, Text } from "react-native-paper";

import { getWebsiteProgress, WEBSITE_ACTIONS } from "../../../services/commerceProvisioning";

export const WebsiteNotice = ({ children, palette, severity = "info" }) => {
  const colors = { info: "#60a5fa", success: "#22c55e", warning: "#f59e0b", error: "#ef4444" };
  const icons = { info: "information-outline", success: "check-circle-outline", warning: "alert-outline", error: "alert-circle-outline" };
  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: palette.cardSoft, borderColor: colors[severity] }]}>
      <MaterialCommunityIcons color={colors[severity]} name={icons[severity]} size={20} />
      <Text style={[styles.flexCopy, { color: palette.copy }]} variant="bodyMedium">{children}</Text>
    </View>
  );
};

const WebsiteSteps = ({ closeReviewRequired, palette, steps = [], title, closing = false }) => (
  <View style={styles.steps}>
    {title ? <Text style={[styles.title, { color: palette.title }]} variant="titleSmall">{title}</Text> : null}
    {steps.map((step) => (
      <View key={step.id} style={styles.step}>
        <MaterialCommunityIcons
          color={step.status === "COMPLETADO" ? "#60a5fa" : step.status === "FALLIDO" ? "#ef4444" : palette.muted}
          name="check-circle-outline"
          size={18}
        />
        <Text style={[styles.flexCopy, { color: palette.copy }]} variant="bodyMedium">
          {step.label}{step.status === "EN_PROGRESO" ? " · En curso" : step.status === "FALLIDO"
            ? closing
              ? closeReviewRequired ? " · Revisión de seguridad o propiedad" : " · Reintento automático en curso"
              : " · Requiere revisión"
            : ""}
          {closing && step.message ? ` · ${step.message}` : ""}
        </Text>
      </View>
    ))}
  </View>
);

const formatEventTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })} · `;
};

export default function WebsiteRequestCard({ busy, busyRequestId, disabled, onAction, onOpen, palette, request }) {
  const progress = getWebsiteProgress(request);
  const actionButton = (action) => {
    const definition = WEBSITE_ACTIONS[action];
    const pending = busy === action && busyRequestId === request._id;
    return (
      <Button
        accessibilityLabel={`${definition.label}: ${request.hostname}`}
        disabled={disabled}
        icon={action === "retryClose" ? "refresh" : "delete-outline"}
        loading={pending}
        mode="outlined"
        onPress={() => onAction(action, request)}
        style={styles.action}
        textColor={action === "retryClose" ? palette.brandStrong : "#ef4444"}
      >
        {pending ? definition.busyLabel : definition.label}
      </Button>
    );
  };
  return (
    <Surface elevation={0} style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.heading}>
        <View style={styles.flexCopy}>
          <Text style={[styles.title, { color: palette.title }]} variant="titleLarge">{request.displayName || "Página web"}</Text>
          <Text style={{ color: palette.muted }} variant="bodyMedium">{request.hostname} · {progress.label}</Text>
        </View>
        <Text style={{ color: "#60a5fa" }} variant="labelLarge">
          {progress.cancelled ? "Cancelada" : request.status === "COMPLETADA" ? "Lista" : `${progress.completedCount} de ${progress.total} tareas`}
        </Text>
      </View>

      {request.status === "PENDIENTE_DNS" ? <WebsiteNotice palette={palette}>
        Tu solicitud quedó registrada. Estamos esperando que administración cree el registro DNS en Squarespace; el sistema lo comprobará automáticamente cada minuto y el aprovisionamiento no empezará antes de verificarlo.
      </WebsiteNotice> : null}
      {request.status === "DNS_VERIFICADO" ? <WebsiteNotice palette={palette} severity="success">
        El DNS ya apunta al servidor. Tu sitio comenzará a prepararse.
      </WebsiteNotice> : null}
      {request.status === "FALLIDA" ? <WebsiteNotice palette={palette} severity="error">
        {request.lastError || "No se pudo completar la instalación. Se revirtieron los cambios de esta solicitud."}
      </WebsiteNotice> : null}
      {request.status === "FALLIDA" ? <Text style={{ color: palette.muted }} variant="bodySmall">
        El reintento de instalación debe solicitarlo administración, igual que en la web.
      </Text> : null}
      {request.status === "ROLLBACK_FALLIDO" ? <WebsiteNotice palette={palette} severity="error">
        La instalación requiere revisión manual antes de volver a intentarla.
      </WebsiteNotice> : null}
      {request.status === "CERRANDO" ? <WebsiteNotice palette={palette} severity="warning">
        {request.currentStep === "close:auto_retry_wait"
          ? "El sistema reintentará automáticamente un paso que encontró un fallo operativo. Si lo prefieres, puedes adelantar el reintento ahora."
          : progress.manualRetryQueued
            ? "El reintento manual quedó encolado. El worker retomará el cierre sin repetir los pasos completados."
            : "Se están retirando los recursos exclusivos de tu página web. Tus productos, imágenes, ventas, pedidos y cuenta de empresa se conservan."}
      </WebsiteNotice> : null}
      {request.status === "CERRADA" ? <WebsiteNotice palette={palette} severity="success">
        La web fue retirada del servidor. El registro A de Squarespace debe eliminarse manualmente; los productos, imágenes, ventas, pedidos y la cuenta de empresa permanecen intactos.
      </WebsiteNotice> : null}
      {request.status === "CIERRE_FALLIDO" ? <WebsiteNotice palette={palette} severity={progress.closeReviewRequired ? "error" : "info"}>
        {progress.closeReviewRequired
          ? "El sistema detectó un bloqueo de seguridad o propiedad y conserva los recursos dudosos. Para continuar, administración debe revisar que sea seguro retirarlos."
          : "El sistema volverá a comprobar la propiedad de los recursos y reintentará automáticamente el cierre sin intervención del propietario ni de administración."}
      </WebsiteNotice> : null}
      {progress.cancelled ? <WebsiteNotice palette={palette}>
        La solicitud se canceló antes de validar el DNS y no se desplegaron recursos. El subdominio queda disponible; si ya habías creado el registro en Squarespace, no se elimina automáticamente.
      </WebsiteNotice> : <>
        <ProgressBar accessibilityLabel={`Progreso de ${request.hostname}`} color="#60a5fa" progress={progress.percent / 100} style={styles.progress} />
        <WebsiteSteps palette={palette} steps={request.steps} />
      </>}
      {progress.showRollback && request.rollbackSteps?.length ? (
        <WebsiteSteps palette={palette} steps={request.rollbackSteps} title="Revirtiendo los cambios" />
      ) : null}
      {request.events?.length ? <View style={styles.steps}>
        {request.events.slice(-5).map((event, index) => (
          <Text key={`${event.type}-${index}`} style={{ color: palette.muted }} variant="bodySmall">
            {formatEventTime(event.createdAt)}{event.message}
          </Text>
        ))}
      </View> : null}
      {progress.closeActive && request.closeSteps?.length ? (
        <WebsiteSteps closing closeReviewRequired={progress.closeReviewRequired} palette={palette} steps={request.closeSteps} title="Retirada de la página web" />
      ) : null}
      <Divider style={styles.divider} />
      <Text style={{ color: palette.muted }} variant="bodyMedium">Subdominio solicitado</Text>
      {request.status === "COMPLETADA" ? (
        <Button accessibilityLabel={`Abrir ${request.hostname}`} icon="open-in-new" onPress={() => onOpen(request)} style={styles.action} textColor="#60a5fa">
          {request.publicUrl || request.hostname}
        </Button>
      ) : <Text style={[styles.title, { color: palette.title }]} variant="titleMedium">{request.hostname}</Text>}
      {progress.canCancel ? actionButton("cancel") : null}
      {progress.canClose ? <>
        <WebsiteNotice palette={palette} severity="warning">
          Cerrar retira la aplicación, PM2, Nginx y los recursos exclusivos verificables de esta web. No borra información comercial ni elimina el DNS de Squarespace.
        </WebsiteNotice>
        {actionButton("close")}
      </> : null}
      {progress.canRetryClose ? actionButton("retryClose") : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, gap: 12, padding: 20 },
  heading: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 12 },
  flexCopy: { flex: 1, minWidth: 0 },
  title: { fontWeight: "800" },
  notice: { alignItems: "flex-start", borderLeftWidth: 3, borderRadius: 12, flexDirection: "row", gap: 10, padding: 12 },
  steps: { gap: 10 },
  step: { alignItems: "flex-start", flexDirection: "row", gap: 8, minHeight: 30 },
  progress: { borderRadius: 8, height: 8, marginTop: 6 },
  divider: { marginVertical: 6 },
  action: { alignSelf: "flex-start", maxWidth: "100%", marginTop: 4 },
});
