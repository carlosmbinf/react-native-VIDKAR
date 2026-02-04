import React, {memo, useMemo} from 'react';
import {Card, Text, Switch, Divider} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { StyleSheet, View } from 'react-native';

const OptionsCardAdmin = ({item, styles, accentColor}) => {
  if (!item) return null;

  // Suscripción y lectura reactiva del usuario por _id
  const { ready, userDoc } = useTracker(() => {
    const id = item?._id || Meteor.userId();
    if (!id) return { ready: false, userDoc: null };
    // Reemplazar 'users.byId' por el nombre real de la publicación disponible
    const sub = Meteor.subscribe('userID', id);
    const doc = Meteor.users.findOne(id, {
      fields: {
        desconectarVPN: 1,
        permitirPagoEfectivoCUP: 1,
        permiteRemesas: 1,
        subscipcionPelis: 1,
        permitirAprobacionEfectivoCUP:1,
        modoEmpresa:1,
      },
    });
    return { ready: sub.ready(), userDoc: doc };
  }, [item?._id]);

  const u = userDoc || item || {};
  const isCarlos = useMemo(() => Meteor.user()?.username === 'carlosmbinf', []);
  const headerAccent = accentColor || '#263238';

  // Helper genérico usando Meteor.users.update
  const toggleFlag = (key, current) => {
    const targetId = userDoc?._id || item?._id;
    if (!targetId) return;
    Meteor.users.update(
      targetId,
      { $set: { [key]: !current } },
      (err) => { if (err) console.warn('Meteor.users.update error:', key, err); }
    );
  };

  const OptionRow = ({label, description, value, onToggle, disabled}) => (
    <View style={ui.row}>
      <View style={ui.rowText}>
        <Text style={ui.rowLabel}>{label}</Text>
        {!!description && <Text style={ui.rowDesc}>{description}</Text>}
      </View>
      <Switch value={!!value} onValueChange={onToggle} disabled={disabled} />
    </View>
  );

  return (
    <Card elevation={12} style={[styles.cards, ui.cardShell]} testID="options-admin-card">
      <View style={[ui.accentBar, {backgroundColor: headerAccent}]} />
      <Card.Content style={ui.content}>
        <Text style={ui.title}>Opciones</Text>
        <Divider style={ui.divider} />

        <OptionRow
          label="Desconectar VPN"
          description="Ordena la desconexión del cliente (hasta revertirlo)."
          value={u?.desconectarVPN}
          onToggle={() => toggleFlag('desconectarVPN', u?.desconectarVPN)}
        />

        {isCarlos && (
          <>
            <Divider style={ui.dividerSection} />

            <OptionRow
              label="Aprobación efectivo (CUP)"
              description="Permite aprobar evidencias/ventas en efectivo."
              value={u?.permitirAprobacionEfectivoCUP}
              onToggle={() =>
                toggleFlag('permitirAprobacionEfectivoCUP', u?.permitirAprobacionEfectivoCUP)
              }
            />

            <OptionRow
              label="Pago efectivo (CUP)"
              description="Habilita el método de pago efectivo para este usuario."
              value={u?.permitirPagoEfectivoCUP}
              onToggle={() => toggleFlag('permitirPagoEfectivoCUP', u?.permitirPagoEfectivoCUP)}
            />

            <OptionRow
              label="Remesas"
              description="Permite operar con remesas desde el cliente."
              value={u?.permiteRemesas}
              onToggle={() => toggleFlag('permiteRemesas', u?.permiteRemesas)}
            />

            <OptionRow
              label="Suscripción Pelis"
              description="Habilita acceso a módulo de películas."
              value={u?.subscipcionPelis}
              onToggle={() => toggleFlag('subscipcionPelis', u?.subscipcionPelis)}
            />

            <OptionRow
              label="Modo Empresa"
              description="Cambia el flujo de navegación/funcionalidades a empresa."
              value={u?.modoEmpresa}
              onToggle={() => toggleFlag('modoEmpresa', u?.modoEmpresa)}
            />
          </>
        )}
      </Card.Content>
    </Card>
  );
};

const ui = StyleSheet.create({
  cardShell: { overflow: 'hidden' },
  accentBar: { height: 4, width: '100%' },
  content: { paddingTop: 10 },
  title: { paddingTop: 6, textAlign: 'center', paddingBottom: 6, fontWeight: '800', opacity: 0.85 },
  divider: { marginVertical: 8, opacity: 0.2 },
  dividerSection: { marginVertical: 10, opacity: 0.12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'space-between',
    gap: 12,
  },
  rowText: { flex: 1 },
  rowLabel: { fontWeight: '700' },
  rowDesc: { marginTop: 2, fontSize: 12, opacity: 0.7, lineHeight: 16 },
});

export default memo(OptionsCardAdmin);
