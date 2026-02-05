import React, {memo} from 'react';
import {View, StyleSheet} from 'react-native';
import {Card, Title, Text, Chip, Button, Divider,Surface} from 'react-native-paper';

const ACCENT = '#1E88E5';
const WARN = '#F57C00';
const DANGER = '#D32F2F';
const OK = '#2E7D32';

const formatCUP = (n) => {
  const v = Number.isFinite(n) ? n : 0;
  try {
    // Si Intl está disponible
    return new Intl.NumberFormat('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(v) + ' CUP';
  } catch {
    // Fallback simple
    return `${(Math.round(v * 100) / 100).toFixed(2)} CUP`;
  }
};

const getDebtLevel = (debt) => {
  // Umbrales orientativos; ajustar si existe configuración
  if (debt <= 0) return {label: 'Sin deuda', color: OK};
  if (debt < 1000) return {label: 'Deuda baja', color: ACCENT};
  if (debt < 2000) return {label: 'Deuda media', color: WARN};
  return {label: 'Deuda alta', color: DANGER};
};

const VentasCard = ({visible, deuda, styles, onPressDetalles, accentColor}) => {
  // if (!visible) return null;

  let deudaValue = 0;
  try {
    deudaValue = Number(deuda?.() ?? 0);
    if (!Number.isFinite(deudaValue)) deudaValue = 0;
  } catch {
    deudaValue = 0;
  }

  const level = getDebtLevel(deudaValue);
  const headerAccent = accentColor || ACCENT;

  return (
    <Surface elevation={5} style={[styles.cards, s.cardShell]} testID="ventas-card">
      <View style={[s.accentBar, {backgroundColor: headerAccent}]} />
      <Card.Content style={s.content}>
        {/* Header */}
        <View style={s.headerRow}>
          <Title style={[s.title, {color: ACCENT}]}>Ventas</Title>
          <Chip style={[s.chip]} textStyle={s.chipText} selectedColor="#fff" compact>
            {level.label}
          </Chip>
        </View>

        <Divider style={s.divider} />

        {/* Body */}
        <View style={s.amountBlock}>
          <Text style={s.caption}>Deuda actual</Text>
          <Text style={[s.amount, {color: level.color}]}>{formatCUP(deudaValue)}</Text>
        </View>

        {/* Actions (opcionales) */}
        <View style={s.actionsRow}>
          <Button
            mode="contained-tonal"
            icon="history"
            onPress={onPressDetalles}
            disabled={!onPressDetalles}
            style={s.actionBtn}
          >
            Ver historial
          </Button>
          {/* <Button
            mode="contained"
            icon="refresh"
            buttonColor={ACCENT}
            onPress={onPressRefrescar}
            disabled={!onPressRefrescar}
            style={s.actionBtn}
          >
            Refrescar
          </Button> */}
        </View>
      </Card.Content>
    </Surface>
  );
};

const s = StyleSheet.create({
  cardShell: {overflow: 'hidden'},
  accentBar: {height: 4, width: '100%'},
  content: {paddingTop: 10},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {fontSize: 20, fontWeight: '700'},
  chip: {backgroundColor: '#263238'},
  chipText: {color: '#fff', fontWeight: '600'},
  divider: {marginVertical: 8, opacity: 0.2},
  amountBlock: {marginTop: 4},
  caption: {opacity: 0.7, fontSize: 13},
  amount: {fontSize: 28, fontWeight: '800', letterSpacing: 0.5, marginTop: 2},
  actionsRow: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12},
  actionBtn: {marginLeft: 8, borderRadius: 10},
});

export default memo(VentasCard);
