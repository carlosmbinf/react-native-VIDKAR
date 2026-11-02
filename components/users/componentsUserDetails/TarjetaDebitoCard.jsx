import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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

	const headerAccent = accentColor || (theme.dark ? '#60a5fa' : '#2563eb');
	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		iconBg: theme.dark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(37, 99, 235, 0.08)',
		input: theme.dark ? 'rgba(30, 41, 59, 0.78)' : 'rgba(248, 250, 252, 0.96)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	return (
		<Card elevation={0} style={[styles.cards, ui.card, { borderColor: palette.cardBorder }]} testID="tarjeta-debito-card">
			<Card.Content style={ui.content}>
				{/* Header */}
				<View style={ui.headerRow}>
					<View style={[ui.iconWrap, { backgroundColor: palette.iconBg }]}>
						<MaterialCommunityIcons name="credit-card-outline" size={24} color={headerAccent} />
					</View>
					<View style={ui.headerCopy}>
						<Text style={[ui.eyebrow, { color: palette.label }]}>Datos de transferencia</Text>
						<Text style={[ui.title, { color: palette.title }]}>Tarjeta de Débito (CUP)</Text>
						<Text style={[ui.subtitle, { color: palette.copy }]}>
							Destino usado para pagos y cobros administrativos en CUP.
						</Text>
					</View>
				</View>

				{!tarjeta ? (
					<View style={ui.formBlock}>
						<TextInput
							mode="outlined"
							label="Número de tarjeta (16 dígitos)"
							value={formatCardNumber(input)}
							onChangeText={(value) => setInput(onlyDigits(value))}
							keyboardType="number-pad"
							maxLength={19}
							outlineColor={palette.cardBorder}
							activeOutlineColor={headerAccent}
							style={[ui.input, { backgroundColor: palette.input }]}
						/>
						<Button
							mode="contained"
							onPress={handleSave}
							loading={saving}
							disabled={saving || onlyDigits(input).length !== 16}
							icon="content-save-outline"
							style={ui.saveBtn}
						>
							Guardar tarjeta
						</Button>
					</View>
				) : (
					<View style={ui.cardContainer}>
						{/* Virtual Bank Card */}
						<View style={ui.visualCard}>
							<View style={ui.cardSheen} />
							<View style={ui.cardTop}>
								<View style={ui.chipRow}>
									{/* EMV Chip Representation */}
									<View style={ui.emvChip}>
										<View style={ui.emvInner} />
									</View>
									<MaterialCommunityIcons name="contactless-payment" size={24} color="rgba(255,255,255,0.75)" />
								</View>
								<View style={ui.brandPill}>
									<Text style={ui.brandText}>CUP • Transfermóvil</Text>
								</View>
							</View>

							<Text style={ui.cardNumber}>{tarjeta}</Text>

							<View style={ui.cardFooter}>
								<View style={ui.cardMetaCol}>
									<Text style={ui.cardLabel}>Titular</Text>
									<Text style={ui.cardValue} numberOfLines={1}>{fullName}</Text>
								</View>
								<View style={[ui.cardMetaCol, { alignItems: 'flex-end' }]}>
									<Text style={ui.cardLabel}>Banco</Text>
									<Text style={ui.cardValue}>Transfermóvil</Text>
								</View>
							</View>
						</View>

						<Button
							icon="content-copy"
							mode="contained-tonal"
							onPress={handleCopy}
							style={ui.copyBtn}
							contentStyle={ui.copyBtnContent}
							disabled={!tarjeta}
						>
							Copiar número de tarjeta
						</Button>
					</View>
				)}
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	brandPill: {
		backgroundColor: 'rgba(255, 255, 255, 0.12)',
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	brandText: {
		color: '#e2e8f0',
		fontSize: 10.5,
		fontWeight: '800',
		letterSpacing: 0.5,
	},
	card: {
		borderWidth: 1,
		overflow: 'hidden',
	},
	cardContainer: {
		gap: 12,
	},
	cardFooter: {
		alignItems: 'flex-end',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 16,
	},
	cardLabel: {
		color: '#94a3b8',
		fontSize: 9.5,
		fontWeight: '800',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	cardMetaCol: {
		flex: 1,
		gap: 2,
	},
	cardNumber: {
		color: '#ffffff',
		fontFamily: 'monospace',
		fontSize: 21,
		fontWeight: '700',
		letterSpacing: 2,
		marginTop: 16,
		textShadowColor: 'rgba(0, 0, 0, 0.4)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	cardSheen: {
		backgroundColor: 'rgba(59, 130, 246, 0.18)',
		borderRadius: 120,
		height: 200,
		position: 'absolute',
		right: -60,
		top: -60,
		width: 200,
	},
	cardTop: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	cardValue: {
		color: '#f8fafc',
		fontSize: 13,
		fontWeight: '700',
	},
	chipRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 10,
	},
	content: {
		gap: 14,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},
	copyBtn: {
		borderRadius: 14,
	},
	copyBtnContent: {
		minHeight: 42,
	},
	emvChip: {
		backgroundColor: '#eab308',
		borderRadius: 5,
		height: 24,
		justifyContent: 'center',
		padding: 3,
		width: 32,
	},
	emvInner: {
		borderColor: 'rgba(0, 0, 0, 0.25)',
		borderRadius: 2,
		borderWidth: 1,
		flex: 1,
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	formBlock: {
		gap: 12,
	},
	headerCopy: {
		flex: 1,
		gap: 2,
	},
	headerRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
	},
	iconWrap: {
		alignItems: 'center',
		borderRadius: 16,
		height: 46,
		justifyContent: 'center',
		width: 46,
	},
	input: {
		borderRadius: 12,
	},
	saveBtn: {
		borderRadius: 14,
	},
	subtitle: {
		fontSize: 12,
		lineHeight: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: '900',
		letterSpacing: -0.2,
	},
	visualCard: {
		backgroundColor: '#0f172a',
		borderRadius: 18,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.1)',
		minHeight: 180,
		overflow: 'hidden',
		padding: 18,
	},
});

export default TarjetaDebitoCard;
