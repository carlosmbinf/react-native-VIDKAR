import React, {memo} from 'react';
import {Card, Text, Button} from 'react-native-paper';
import Meteor, { useTracker } from '@meteorrn/core';
import { StyleSheet } from 'react-native';

const OptionsCardAdmin = ({item, styles}) => {
  if (!item) return null;

  // Suscripción y lectura reactiva del usuario por _id
  const { ready, userDoc } = useTracker(() => {
    const id = item?._id || Meteor.userId();
    if (!id) return { ready: false, userDoc: null };
    // Reemplazar 'users.byId' por el nombre real de la publicación disponible
    const sub = Meteor.subscribe('users.byId', id);
    const doc = Meteor.users.findOne(id, {
      fields: {
        desconectarVPN: 1,
        permitirPagoEfectivoCUP: 1,
        permiteRemesas: 1,
        subscipcionPelis: 1,
        permitirAprobacionEfectivoCUP:1
      },
    });
    return { ready: sub.ready(), userDoc: doc };
  }, [item?._id]);

  const u = userDoc || item || {};

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

  return (
    <Card elevation={12} style={styles.cards}>
      <Card.Content>
        <Text
          style={{
            paddingTop: 10,
            textAlign: 'center',
            paddingBottom: 10,
          }}>
          OPCIONES:
        </Text>

        {/* Botón desconectar VPN */}
        <Button
          color={u?.desconectarVPN && 'red'}
          mode="contained"
          onPress={() => toggleFlag('desconectarVPN', u?.desconectarVPN)}
          style={btnStyles.action}>
          {u?.desconectarVPN
            ? 'Cancelar Desconexion de VPN'
            : 'Desconectar VPN'}
        </Button>
            
        {/* Botón permitir Aprobación Efectivo CUP */}
        <Button
          mode="contained"
          color={u?.permitirAprobacionEfectivoCUP ? 'red' : undefined}
          onPress={() => toggleFlag('permitirAprobacionEfectivoCUP', u?.permitirAprobacionEfectivoCUP)}
          style={btnStyles.action}>
          {u?.permitirAprobacionEfectivoCUP
            ? 'Desactivar Aprobación Efectivo (CUP)'
            : 'Permitir Aprobación Efectivo (CUP)'}
        </Button>

        {/* Botón permitir Pago Efectivo CUP */}
        <Button
          mode="contained"
          color={u?.permitirPagoEfectivoCUP ? 'red' : undefined}
          onPress={() => toggleFlag('permitirPagoEfectivoCUP', u?.permitirPagoEfectivoCUP)}
          style={btnStyles.action}>
          {u?.permitirPagoEfectivoCUP
            ? 'Desactivar Pago Efectivo (CUP)'
            : 'Permitir Pago Efectivo (CUP)'}
        </Button>

        {/* Botón Remesas */}
        <Button
          mode="contained"
          color={u?.permiteRemesas ? 'red' : undefined}
          onPress={() => toggleFlag('permiteRemesas', u?.permiteRemesas)}
          style={btnStyles.action}>
          {u?.permiteRemesas ? 'Desactivar Remesas' : 'Permitir Remesas'}
        </Button>

        {/* Botón Suscripción Pelis */}
        <Button
          mode="contained"
          color={u?.subscipcionPelis ? 'red' : undefined}
          onPress={() => toggleFlag('subscipcionPelis', u?.subscipcionPelis)}
          style={btnStyles.action}>
          {u?.subscipcionPelis
            ? 'Desactivar Suscripción Pelis'
            : 'Activar Suscripción Pelis'}
        </Button>
      </Card.Content>
    </Card>
  );
};
const btnStyles = StyleSheet.create({
  action: { marginTop: 8, borderRadius: 20, margin: 15 },
});

export default memo(OptionsCardAdmin);
