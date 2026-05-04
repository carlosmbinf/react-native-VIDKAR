import MeteorBase from "@meteorrn/core";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Divider, Switch, Text, useTheme } from "react-native-paper";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const ADMIN_OPTIONS_FIELDS = {
  desconectarVPN: 1,
  modoEmpresa: 1,
  permitirAprobacionEfectivoCUP: 1,
  permitirPagoEfectivoCUP: 1,
  permiteRemesas: 1,
  subscipcionPelis: 1,
  vpn: 1,
  vpn2mbConnected: 1,
  vpnplusConnected: 1,
};

const OptionsCardAdmin = ({ item, styles, accentColor }) => {
  const theme = useTheme();
  const itemId = item?._id || null;

  const { userDoc } = Meteor.useTracker(() => {
    const id = itemId || Meteor.userId();
    if (!id) {
      return { userDoc: null };
    }
    Meteor.subscribe("userID", id, { fields: ADMIN_OPTIONS_FIELDS });
    const doc = Meteor.users.findOne(id, {
      fields: ADMIN_OPTIONS_FIELDS,
    });
    return { userDoc: doc };
  }, [itemId]);

  if (!item) {
    return null;
  }

  const currentUser = userDoc || item || {};
  const isCarlos = Meteor.user()?.username === "carlosmbinf";
  const headerAccent = accentColor || "#263238";
  const hasActiveConnectedVpn =
    currentUser?.vpn === true &&
    (currentUser?.vpnplusConnected === true ||
      currentUser?.vpn2mbConnected === true);
  const palette = {
    copy: theme.dark ? "#cbd5e1" : "#475569",
    label: theme.dark ? "#f8fafc" : "#0f172a",
    muted: theme.dark ? "#94a3b8" : "#64748b",
    row: theme.dark ? "rgba(30, 41, 59, 0.7)" : "rgba(248, 250, 252, 0.96)",
    rowBorder: theme.dark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.08)",
  };

  const toggleFlag = (key, current) => {
    const targetId = userDoc?._id || item?._id;
    if (!targetId) {
      return;
    }

    Meteor.users.update(targetId, { $set: { [key]: !current } }, (error) => {
      if (error) {
        console.warn("Meteor.users.update error:", key, error);
      }
    });
  };

  const OptionRow = ({ label, description, value, onToggle, disabled }) => (
    <View style={[ui.row, { backgroundColor: palette.row, borderColor: palette.rowBorder }]}>
      <View style={ui.rowText}>
        <Text style={[ui.rowLabel, { color: palette.label }]}>{label}</Text>
        {description ? <Text style={[ui.rowDesc, { color: palette.muted }]}>{description}</Text> : null}
      </View>
      <Switch value={!!value} onValueChange={onToggle} disabled={disabled} />
    </View>
  );

  return (
    <Card
      elevation={12}
      style={[styles.cards, ui.cardShell]}
      testID="options-admin-card"
    >
      <View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
      <Card.Content style={ui.content}>
        <Text style={[ui.eyebrow, { color: palette.muted }]}>Controles del perfil</Text>
        <Text style={[ui.title, { color: palette.label }]}>Opciones administrativas</Text>
        <Text style={[ui.subtitle, { color: palette.copy }]}>Ajustes operativos disponibles para este usuario.</Text>
        <Divider style={ui.divider} />

        <OptionRow
          label="Desconectar VPN"
          description="Ordena la desconexión del cliente hasta revertirlo."
          value={currentUser?.desconectarVPN}
          onToggle={() =>
            toggleFlag("desconectarVPN", currentUser?.desconectarVPN)
          }
          disabled={!hasActiveConnectedVpn}
        />

        {isCarlos ? (
          <>
            <Divider style={ui.dividerSection} />
            <OptionRow
              label="Aprobación efectivo CUP"
              description="Permite aprobar evidencias o ventas en efectivo."
              value={currentUser?.permitirAprobacionEfectivoCUP}
              onToggle={() =>
                toggleFlag(
                  "permitirAprobacionEfectivoCUP",
                  currentUser?.permitirAprobacionEfectivoCUP,
                )
              }
            />
            <OptionRow
              label="Pago efectivo CUP"
              description="Habilita el método de pago en efectivo para este usuario."
              value={currentUser?.permitirPagoEfectivoCUP}
              onToggle={() =>
                toggleFlag(
                  "permitirPagoEfectivoCUP",
                  currentUser?.permitirPagoEfectivoCUP,
                )
              }
            />
            <OptionRow
              label="Remesas"
              description="Permite operar con remesas desde el cliente."
              value={currentUser?.permiteRemesas}
              onToggle={() =>
                toggleFlag("permiteRemesas", currentUser?.permiteRemesas)
              }
            />
            <OptionRow
              label="Suscripción Pelis"
              description="Habilita acceso al módulo de películas."
              value={currentUser?.subscipcionPelis}
              onToggle={() =>
                toggleFlag("subscipcionPelis", currentUser?.subscipcionPelis)
              }
            />
            <OptionRow
              label="Modo Empresa"
              description="Cambia el flujo de navegación al modo empresa."
              value={currentUser?.modoEmpresa}
              onToggle={() =>
                toggleFlag("modoEmpresa", currentUser?.modoEmpresa)
              }
            />
          </>
        ) : null}
      </Card.Content>
    </Card>
  );
};

const ui = StyleSheet.create({
  cardShell: { overflow: "hidden" },
  accentBar: { height: 4, width: "100%" },
  content: { paddingTop: 10 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 3,
  },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  divider: { marginVertical: 8, opacity: 0.2 },
  dividerSection: { marginVertical: 10, opacity: 0.12 },
  row: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
  },
  rowText: { flex: 1 },
  rowLabel: { fontWeight: "700" },
  rowDesc: { marginTop: 2, fontSize: 12, lineHeight: 16 },
});

export default memo(OptionsCardAdmin);
