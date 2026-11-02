import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MeteorBase from '@meteorrn/core';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, Divider, Switch, Text, useTheme } from 'react-native-paper';

const Meteor =
	/** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
		MeteorBase
	);

const ADMIN_OPTIONS_FIELDS = {
	desconectarVPN: 1,
	empresaBloqueada: 1,
	empresaTerminosCondicionesAcepted: 1,
	fechaEmpresaTerminosCondicionesAcepted: 1,
	permitirAprobacionEfectivoCUP: 1,
	permitirPagoEfectivoCUP: 1,
	permiteEmpresa: 1,
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
		Meteor.subscribe('userID', id, { fields: ADMIN_OPTIONS_FIELDS });
		const doc = Meteor.users.findOne(id, {
			fields: ADMIN_OPTIONS_FIELDS,
		});
		return { userDoc: doc };
	}, [itemId]);

	if (!item) {
		return null;
	}

	const currentUser = userDoc || item || {};
	const isCarlos = Meteor.user()?.username === 'carlosmbinf';
	const headerAccent = accentColor || (theme.dark ? '#a78bfa' : '#7c3aed');
	const hasActiveConnectedVpn =
		currentUser?.vpn === true &&
		(currentUser?.vpnplusConnected === true ||
			currentUser?.vpn2mbConnected === true);

	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		iconBg: theme.dark ? 'rgba(124, 58, 237, 0.16)' : 'rgba(124, 58, 237, 0.08)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		rowBg: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		rowBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		termsAceptedBg: theme.dark ? 'rgba(34, 197, 94, 0.20)' : 'rgba(34, 197, 94, 0.12)',
		termsAceptedText: theme.dark ? '#4ade80' : '#15803d',
		termsPendingBg: theme.dark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(245, 158, 11, 0.12)',
		termsPendingText: theme.dark ? '#fbbf24' : '#b45309',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	const toggleFlag = (key, current) => {
		const targetId = userDoc?._id || item?._id;
		if (!targetId) {
			return;
		}

		Meteor.users.update(targetId, { $set: { [key]: !current } }, (error) => {
			if (error) {
				console.warn('Meteor.users.update error:', key, error);
			}
		});
	};

	const toggleEmpresaStatus = (key, current) => {
		const targetId = userDoc?._id || item?._id;
		if (!targetId) {
			return;
		}

		Meteor.call(
			'users.adminSetEmpresaStatus',
			targetId,
			{ [key]: !current },
			(error) => {
				if (error) {
					console.warn('users.adminSetEmpresaStatus error:', key, error);
				}
			},
		);
	};

	const OptionRow = ({ icon, label, description, value, onToggle, disabled }) => (
		<View
			style={[
				ui.row,
				{ backgroundColor: palette.rowBg, borderColor: palette.rowBorder, opacity: disabled ? 0.6 : 1 },
			]}
		>
			<View style={[ui.rowIconWrap, { backgroundColor: palette.iconBg }]}>
				<MaterialCommunityIcons name={icon} size={20} color={headerAccent} />
			</View>
			<View style={ui.rowText}>
				<Text style={[ui.rowLabel, { color: palette.title }]}>{label}</Text>
				{description ? (
					<Text style={[ui.rowDesc, { color: palette.copy }]}>{description}</Text>
				) : null}
			</View>
			<Switch value={!!value} onValueChange={onToggle} disabled={disabled} />
		</View>
	);

	const termsAcepted = !!currentUser?.empresaTerminosCondicionesAcepted;

	return (
		<Card
			elevation={0}
			style={[styles.cards, ui.card, { borderColor: palette.cardBorder }]}
			testID="options-admin-card"
		>
			<Card.Content style={ui.content}>
				{/* Header */}
				<View style={ui.header}>
					<View style={[ui.iconWrap, { backgroundColor: palette.iconBg }]}>
						<MaterialCommunityIcons name="tune-variant" size={24} color={headerAccent} />
					</View>
					<View style={ui.headerCopy}>
						<Text style={[ui.eyebrow, { color: palette.label }]}>Controles del perfil</Text>
						<Text style={[ui.title, { color: palette.title }]}>Opciones administrativas</Text>
					</View>
				</View>

				<Text style={[ui.subtitle, { color: palette.copy }]}>
					Ajustes operativos y permisos específicos disponibles para este usuario.
				</Text>

				<Divider style={ui.divider} />

				{/* VPN Option */}
				<OptionRow
					icon="vpn-off"
					label="Desconectar VPN"
					description="Ordena la desconexión del cliente hasta revertirlo."
					value={currentUser?.desconectarVPN}
					onToggle={() => toggleFlag('desconectarVPN', currentUser?.desconectarVPN)}
					disabled={!hasActiveConnectedVpn}
				/>

				{/* Carlos / Super Admin Options */}
				{isCarlos ? (
					<>
						<Divider style={ui.divider} />
						<Text style={[ui.groupTitle, { color: palette.label }]}>Operaciones y pagos</Text>

						<OptionRow
							icon="cash-check"
							label="Aprobación efectivo CUP"
							description="Permite aprobar evidencias o ventas en efectivo."
							value={currentUser?.permitirAprobacionEfectivoCUP}
							onToggle={() => toggleFlag('permitirAprobacionEfectivoCUP', currentUser?.permitirAprobacionEfectivoCUP)}
						/>

						<OptionRow
							icon="cash"
							label="Pago efectivo CUP"
							description="Habilita el método de pago en efectivo para este usuario."
							value={currentUser?.permitirPagoEfectivoCUP}
							onToggle={() => toggleFlag('permitirPagoEfectivoCUP', currentUser?.permitirPagoEfectivoCUP)}
						/>

						<OptionRow
							icon="bank-transfer"
							label="Remesas"
							description="Permite operar con remesas desde el cliente."
							value={currentUser?.permiteRemesas}
							onToggle={() => toggleFlag('permiteRemesas', currentUser?.permiteRemesas)}
						/>

						<OptionRow
							icon="movie-open-outline"
							label="Suscripción Pelis"
							description="Habilita acceso al catálogo y módulo de películas."
							value={currentUser?.subscipcionPelis}
							onToggle={() => toggleFlag('subscipcionPelis', currentUser?.subscipcionPelis)}
						/>

						<Divider style={ui.divider} />
						<Text style={[ui.groupTitle, { color: palette.label }]}>Modo Empresa</Text>

						<OptionRow
							icon="store-plus-outline"
							label="Permitir registro como empresa"
							description="Muestra la invitación para crear empresa y aceptar condiciones."
							value={currentUser?.permiteEmpresa}
							onToggle={() => toggleEmpresaStatus('permiteEmpresa', currentUser?.permiteEmpresa)}
						/>

						<OptionRow
							icon="store-remove-outline"
							label="Bloquear empresa"
							description="Impide acceder al modo empresa y desactiva el modo activo."
							value={currentUser?.empresaBloqueada}
							onToggle={() => toggleEmpresaStatus('empresaBloqueada', currentUser?.empresaBloqueada)}
						/>

						{/* Terms status */}
						<View style={[ui.termsBox, { backgroundColor: palette.rowBg, borderColor: palette.rowBorder }]}>
							<View style={ui.termsText}>
								<MaterialCommunityIcons
									name={termsAcepted ? 'file-document-check-outline' : 'file-document-alert-outline'}
									size={20}
									color={termsAcepted ? '#16a34a' : '#d97706'}
								/>
								<View>
									<Text style={[ui.termsLabel, { color: palette.label }]}>Términos y condiciones</Text>
									<Text style={[ui.termsDesc, { color: palette.copy }]}>Estado del acuerdo de empresa</Text>
								</View>
							</View>
							<Chip
								compact
								icon={termsAcepted ? 'check-circle' : 'alert-circle'}
								style={[
									ui.termsChip,
									{ backgroundColor: termsAcepted ? palette.termsAceptedBg : palette.termsPendingBg },
								]}
								textStyle={[
									ui.termsChipText,
									{ color: termsAcepted ? palette.termsAceptedText : palette.termsPendingText },
								]}
							>
								{termsAcepted ? 'Aceptados' : 'Pendientes'}
							</Chip>
						</View>
					</>
				) : null}
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	card: {
		borderWidth: 1,
		overflow: 'hidden',
	},
	content: {
		gap: 12,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},
	divider: {
		marginVertical: 4,
		opacity: 0.14,
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	groupTitle: {
		fontSize: 10.5,
		fontWeight: '800',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	header: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
	},
	headerCopy: {
		flex: 1,
		gap: 2,
	},
	iconWrap: {
		alignItems: 'center',
		borderRadius: 16,
		height: 46,
		justifyContent: 'center',
		width: 46,
	},
	row: {
		alignItems: 'center',
		borderRadius: 14,
		borderWidth: 1,
		flexDirection: 'row',
		gap: 12,
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		paddingVertical: 12,
	},
	rowDesc: {
		fontSize: 11.5,
		lineHeight: 16,
	},
	rowIconWrap: {
		alignItems: 'center',
		borderRadius: 12,
		height: 38,
		justifyContent: 'center',
		width: 38,
	},
	rowLabel: {
		fontSize: 13.5,
		fontWeight: '800',
	},
	rowText: {
		flex: 1,
		gap: 2,
	},
	subtitle: {
		fontSize: 12.5,
		lineHeight: 18,
	},
	termsBox: {
		alignItems: 'center',
		borderRadius: 14,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	termsChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	termsChipText: {
		fontSize: 10,
		fontWeight: '800',
	},
	termsDesc: {
		fontSize: 11,
	},
	termsLabel: {
		fontSize: 12,
		fontWeight: '800',
	},
	termsText: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 10,
	},
	title: {
		fontSize: 18,
		fontWeight: '900',
		letterSpacing: -0.2,
	},
});

export default memo(OptionsCardAdmin);
