import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, Surface, Text, Title } from 'react-native-paper';

const ACCENT = '#1E88E5';
const WARN = '#F57C00';
const DANGER = '#D32F2F';
const OK = '#2E7D32';

const formatCUP = (value) => {
	const numeric = Number.isFinite(value) ? value : 0;
	try {
		return `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)} CUP`;
	} catch {
		return `${(Math.round(numeric * 100) / 100).toFixed(2)} CUP`;
	}
};

const getDebtLevel = (debt) => {
	if (debt <= 0) {
		return { label: 'Sin deuda', color: OK };
	}
	if (debt < 1000) {
		return { label: 'Deuda baja', color: ACCENT };
	}
	if (debt < 2000) {
		return { label: 'Deuda media', color: WARN };
	}
	return { label: 'Deuda alta', color: DANGER };
};

const VentasCard = ({ deuda, styles, onPressDetalles, accentColor }) => {
	let deudaValue = 0;
	try {
		deudaValue = Number(deuda?.() ?? 0);
		if (!Number.isFinite(deudaValue)) {
			deudaValue = 0;
		}
	} catch {
		deudaValue = 0;
	}

	const level = getDebtLevel(deudaValue);
	const headerAccent = accentColor || ACCENT;

	return (
		<Surface elevation={5} style={[styles.cards, ui.cardShell]} testID="ventas-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Content style={ui.content}>
				<View style={ui.headerRow}>
					<Title style={[ui.title, { color: ACCENT }]}>Ventas</Title>
					<Chip style={ui.chip} textStyle={ui.chipText} compact>
						{level.label}
					</Chip>
				</View>
				<Divider style={ui.divider} />
				<View style={ui.amountBlock}>
					<Text style={ui.caption}>Deuda actual</Text>
					<Text style={[ui.amount, { color: level.color }]}>{formatCUP(deudaValue)}</Text>
				</View>
				<View style={ui.actionsRow}>
					<Button mode="contained-tonal" icon="history" onPress={onPressDetalles} disabled={!onPressDetalles} style={ui.actionBtn}>
						Ver historial
					</Button>
				</View>
			</Card.Content>
		</Surface>
	);
};

const ui = StyleSheet.create({
	cardShell: { overflow: 'hidden' },
	accentBar: { height: 4, width: '100%' },
	content: { paddingTop: 10 },
	headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	title: { fontSize: 20, fontWeight: '700' },
	chip: { backgroundColor: '#263238' },
	chipText: { color: '#fff', fontWeight: '600' },
	divider: { marginVertical: 8, opacity: 0.2 },
	amountBlock: { marginTop: 4 },
	caption: { opacity: 0.7, fontSize: 13 },
	amount: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
	actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
	actionBtn: { marginLeft: 8, borderRadius: 10 },
});

export default memo(VentasCard);
