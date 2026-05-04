import Meteor from '@meteorrn/core';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
const formatCardNumber = (value) => onlyDigits(value).replace(/(.{4})/g, '$1 ').trim();
const normalizeCardWithSpaces = (value) => {
	const digits = onlyDigits(value);
	if (digits.length !== 16) {
		return null;
	}
	return digits.replace(/(.{4})/g, '$1 ').trim();
};

const TarjetaDebitoCard = ({ item, styles, accentColor }) => {
	const theme = useTheme();
	const [loading, setLoading] = useState(true);
	const [tarjeta, setTarjeta] = useState(null);
	const [input, setInput] = useState('');
	const [saving, setSaving] = useState(false);

	const userId = useMemo(() => item?._id, [item?._id]);
	const isAdmin = useMemo(() => Meteor.user()?.profile?.role === 'admin', []);

	useEffect(() => {
		let mounted = true;
		if (!userId) {
			return undefined;
		}

		Meteor.call('property.getValor', 'CONFIG', `TARJETA_CUP_${userId}`, (error, result) => {
			if (!mounted) {
				return;
			}
			setLoading(false);
			if (error) {
				console.warn('property.getValor TARJETA_CUP error:', error);
				setTarjeta(null);
				return;
			}

			const normalized = typeof result === 'string' ? normalizeCardWithSpaces(result.trim()) : normalizeCardWithSpaces(result);
			setTarjeta(normalized || null);
		});

		return () => {
			mounted = false;
		};
	}, [userId]);

	const fullName = useMemo(() => {
		const firstName = item?.profile?.firstName || '';
		const lastName = item?.profile?.lastName || '';
		const composed = `${firstName} ${lastName}`.trim();
		return composed || item?.username || 'Usuario';
	}, [item?.profile?.firstName, item?.profile?.lastName, item?.username]);

	const handleSave = () => {
		const raw = onlyDigits(input);
		if (raw.length !== 16) {
			Alert.alert('Validación', 'Ingrese un número de tarjeta válido con 16 dígitos.');
			return;
		}

		const formatted = formatCardNumber(raw);
		setSaving(true);
		Meteor.call('property.insert', { type: 'CONFIG', clave: `TARJETA_CUP_${userId}`, valor: formatted }, (error) => {
			setSaving(false);
			if (error) {
				Alert.alert('Error', error.error === 'Clave ya existe' ? 'Ya existe una tarjeta registrada para este usuario.' : error.reason || 'No se pudo guardar la tarjeta.');
				return;
			}

			setTarjeta(formatted);
			Alert.alert('Éxito', 'Tarjeta guardada correctamente.');
		});
	};

	const handleCopy = async () => {
		if (!tarjeta) {
			return;
		}
		try {
			await Clipboard.setStringAsync(tarjeta);
			Alert.alert('Copiado', 'La tarjeta de destino fue copiada al portapapeles.');
		} catch {
			Alert.alert('Error', 'No se pudo copiar la tarjeta.');
		}
	};

	if (loading) {
		return null;
	}
	if (!tarjeta && !isAdmin) {
		return null;
	}

	const headerAccent = accentColor || '#263238';
  const palette = {
    copy: theme.dark ? '#cbd5e1' : '#475569',
    input: theme.dark ? 'rgba(30, 41, 59, 0.78)' : 'rgba(248, 250, 252, 0.96)',
    title: theme.dark ? '#f8fafc' : '#0f172a',
  };

	return (
		<Card elevation={4} style={styles.cards} testID="tarjeta-debito-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Content style={ui.content}>
				<Text style={ui.eyebrow}>Datos de transferencia</Text>
				<Text style={[styles.title, ui.title, { color: palette.title }]}>Tarjeta de Débito (CUP)</Text>
				<Text style={[ui.subtitle, { color: palette.copy }]}>Destino usado para pagos y coordinación administrativa del usuario.</Text>
				{!tarjeta ? (
					<View style={ui.formBlock}>
						<TextInput
							mode="outlined"
							label="Número de tarjeta"
							value={formatCardNumber(input)}
							onChangeText={(value) => setInput(onlyDigits(value))}
							keyboardType="number-pad"
							maxLength={19}
							style={[ui.input, { backgroundColor: palette.input }]}
						/>
						<Button mode="contained" onPress={handleSave} loading={saving} disabled={saving || onlyDigits(input).length !== 16} style={ui.saveBtn}>
							Guardar tarjeta
						</Button>
					</View>
				) : (
					<>
						<View style={ui.visualCard}>
							<View style={ui.cardGlow} />
							<Text style={ui.brand}>CUP</Text>
							<Text style={ui.cardNumber}>{tarjeta}</Text>
							<View style={ui.cardFooter}>
								<View>
									<Text style={ui.cardLabel}>Titular</Text>
									<Text style={ui.cardValue}>{fullName}</Text>
								</View>
								<View>
									<Text style={ui.cardLabel}>Banco</Text>
									<Text style={ui.cardValue}>Transfermóvil</Text>
								</View>
							</View>
						</View>
						<Button icon="content-copy" mode="contained-tonal" onPress={handleCopy} style={ui.copyBtn} disabled={!tarjeta} compact>
							Copiar número
						</Button>
					</>
				)}
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	accentBar: { height: 4, width: '100%' },
	content: { gap: 12, paddingBottom: 18, paddingTop: 16 },
	eyebrow: { color: '#64748b', fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
	title: { marginTop: -6 },
	subtitle: { fontSize: 13, lineHeight: 18 },
	formBlock: { gap: 12, marginTop: 4 },
	input: { borderRadius: 16 },
	saveBtn: { borderRadius: 14 },
	visualCard: {
		marginTop: 2,
		padding: 18,
		borderRadius: 18,
		backgroundColor: '#0F172A',
		minHeight: 190,
		justifyContent: 'space-between',
		overflow: 'hidden',
	},
	cardGlow: { backgroundColor: 'rgba(59, 130, 246, 0.28)', borderRadius: 80, height: 140, position: 'absolute', right: -38, top: -48, width: 140 },
	brand: { color: '#93C5FD', fontWeight: '800', letterSpacing: 1.2, fontSize: 16 },
	cardNumber: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: 2.2, marginTop: 18 },
	cardFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginTop: 24 },
	cardLabel: { color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
	cardValue: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', marginTop: 4, maxWidth: 160 },
	copyBtn: { marginTop: 10, borderRadius: 12, alignSelf: 'center' },
});

export default TarjetaDebitoCard;
