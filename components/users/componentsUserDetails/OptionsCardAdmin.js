import MeteorBase from "@meteorrn/core";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Divider, Switch, Text } from "react-native-paper";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const OptionsCardAdmin = ({ item, styles, accentColor }) => {
  const itemId = item?._id || null;

  const { userDoc } = Meteor.useTracker(() => {
    const id = itemId || Meteor.userId();
    if (!id) {
      return { userDoc: null };
    }
    Meteor.subscribe("userID", id);
    const doc = Meteor.users.findOne(id, {
      fields: {
        desconectarVPN: 1,
        permitirPagoEfectivoCUP: 1,
        permiteRemesas: 1,
        subscipcionPelis: 1,
        permitirAprobacionEfectivoCUP: 1,
        modoEmpresa: 1,
      },
    });
    return { userDoc: doc };
  }, [itemId]);

  if (!item) {
    return null;
  }

  const currentUser = userDoc || item || {};
  const isCarlos = Meteor.user()?.username === "carlosmbinf";
  const headerAccent = accentColor || "#263238";

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
    <View style={ui.row}>
      <View style={ui.rowText}>
        <Text style={ui.rowLabel}>{label}</Text>
        {description ? <Text style={ui.rowDesc}>{description}</Text> : null}
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
        <Text style={ui.title}>Opciones</Text>
        <Divider style={ui.divider} />

        <OptionRow
          label="Desconectar VPN"
          description="Ordena la desconexión del cliente hasta revertirlo."
          value={currentUser?.desconectarVPN}
          onToggle={() =>
            toggleFlag("desconectarVPN", currentUser?.desconectarVPN)
          }
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
  title: {
    paddingTop: 6,
    textAlign: "center",
    paddingBottom: 6,
    fontWeight: "800",
    opacity: 0.85,
  },
  divider: { marginVertical: 8, opacity: 0.2 },
  dividerSection: { marginVertical: 10, opacity: 0.12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    justifyContent: "space-between",
    gap: 12,
  },
  rowText: { flex: 1 },
  rowLabel: { fontWeight: "700" },
  rowDesc: { marginTop: 2, fontSize: 12, opacity: 0.7, lineHeight: 16 },
});

export default memo(OptionsCardAdmin);
