import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MeteorBase from '@meteorrn/core';
import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Button, Card, Chip, HelperText, Text, useTheme } from 'react-native-paper';

const Meteor =
	/** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
		MeteorBase
	);

const EMPTY_ADMIN_VALUE = '__none__';

const buildAdminLabel = (admin) => {
	if (!admin) {
		return 'Sin administrador asignado';
	}

	const fullName = [admin?.profile?.firstName, admin?.profile?.lastName].filter(Boolean).join(' ').trim();
	if (fullName && admin?.username) {
		return `${fullName} • @${admin.username}`;
	}
	return fullName || admin?.username || admin?._id || 'Administrador';
};

const AdminAssignmentCard = ({ item, styles, accentColor }) => {
	const theme = useTheme();
	const itemId = item?._id || null;
	const initialAdminValue = item?.bloqueadoDesbloqueadoPor || EMPTY_ADMIN_VALUE;
	const currentUserId = Meteor.userId();
	const currentUsername = Meteor.user()?.username;
	const isSystemAdmin = Meteor.user()?.profile?.role === 'admin' || currentUsername === 'carlosmbinf';
	const canEditAssignment = Boolean(itemId) && (itemId === currentUserId || isSystemAdmin);
	const [selectedAdmin, setSelectedAdmin] = useState(initialAdminValue);
	const [isFocus, setIsFocus] = useState(false);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState({ message: '', type: 'info' });
	const headerAccent = accentColor || (theme.dark ? '#a78bfa' : '#7c3aed');

	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		chip: theme.dark ? 'rgba(124, 58, 237, 0.22)' : 'rgba(124, 58, 237, 0.10)',
		chipText: theme.dark ? '#ddd6fe' : '#6d28d9',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		dropdownBg: theme.dark ? 'rgba(15, 23, 42, 0.90)' : '#ffffff',
		dropdownBorder: theme.dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.12)',
		iconBg: theme.dark ? 'rgba(124, 58, 237, 0.18)' : 'rgba(124, 58, 237, 0.08)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		tileBg: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		tileBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	const { loading, userDoc, admins } = Meteor.useTracker(() => {
		if (!itemId) {
			return {
				loading: false,
				userDoc: null,
				admins: [],
			};
		}

		const userFields = {
			_id: 1,
			username: 1,
			profile: 1,
			bloqueadoDesbloqueadoPor: 1,
		};
		const userHandle = Meteor.subscribe('user', { _id: itemId }, { fields: userFields });
		const currentDoc = Meteor.users.findOne(itemId, { fields: userFields }) || null;
		const adminSelector = {
			$or: [
				{ 'profile.role': 'admin' },
				{ username: 'carlosmbinf' },
			],
		};
		const adminFields = {
			_id: 1,
			username: 1,
			profile: 1,
		};
		const adminHandle = Meteor.subscribe('user', adminSelector, { fields: adminFields });
		const adminDocs = Meteor.users
			.find(adminSelector, {
				fields: adminFields,
				sort: {
					'profile.firstName': 1,
					'profile.lastName': 1,
					username: 1,
				},
			})
			.fetch()
			.filter((adminDoc) => adminDoc?._id);

		return {
			loading: !userHandle.ready() || !adminHandle.ready(),
			userDoc: currentDoc,
			admins: adminDocs,
		};
	}, [itemId]);

	const currentAdminId = userDoc?.bloqueadoDesbloqueadoPor || null;

	useEffect(() => {
		setSelectedAdmin(currentAdminId || EMPTY_ADMIN_VALUE);
	}, [currentAdminId]);

	useEffect(() => {
		setFeedback({ message: '', type: 'info' });
	}, [itemId]);

	const adminOptions = useMemo(
		() => [
			{ label: 'Sin administrador asignado', value: EMPTY_ADMIN_VALUE },
			...admins.map((admin) => ({
				label: buildAdminLabel(admin),
				value: admin._id,
			})),
		],
		[admins],
	);

	const currentAdmin = useMemo(
		() => admins.find((admin) => admin._id === currentAdminId) || null,
		[admins, currentAdminId],
	);

	const hasChanges = selectedAdmin !== (currentAdminId || EMPTY_ADMIN_VALUE);

	const handleSave = () => {
		if (!itemId || !canEditAssignment || !hasChanges) {
			return;
		}

		setSaving(true);
		setFeedback({ message: '', type: 'info' });
		const nextAdminId = selectedAdmin === EMPTY_ADMIN_VALUE ? '' : selectedAdmin;

		Meteor.users.update(itemId, { $set: { bloqueadoDesbloqueadoPor: nextAdminId } }, (error) => {
			setSaving(false);
			if (error) {
				setFeedback({
					message: error.message || 'No se pudo actualizar el administrador.',
					type: 'error',
				});
				return;
			}

			setFeedback({
				message: 'Administrador actualizado correctamente.',
				type: 'info',
			});
		});
	};

	if (!item) {
		return null;
	}

	return (
		<Card elevation={0} style={[styles.cards, ui.card, { borderColor: palette.cardBorder }]} testID="admin-assignment-card">
			<Card.Content style={ui.content}>
				{/* Header */}
				<View style={ui.header}>
					<View style={[ui.iconWrap, { backgroundColor: palette.iconBg }]}>
						<MaterialCommunityIcons name="shield-account-outline" size={24} color={headerAccent} />
					</View>
					<View style={ui.headerCopy}>
						<Text style={[ui.eyebrow, { color: palette.label }]}>Asignación operativa</Text>
						<Text style={[ui.title, { color: palette.title }]}>Responsable de cuenta</Text>
					</View>
				</View>

				{/* Current Admin Tile */}
				<View style={[ui.currentTile, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
					<View style={ui.currentTop}>
						<Text style={[ui.currentLabel, { color: palette.label }]}>Asignado actualmente</Text>
						<Chip compact icon="account-check" style={[ui.currentChip, { backgroundColor: palette.chip }]} textStyle={[ui.currentChipText, { color: palette.chipText }]}>
							Activo
						</Chip>
					</View>
					<Text style={[ui.currentAdminName, { color: palette.title }]}>
						{buildAdminLabel(currentAdmin)}
					</Text>
					<Text style={[ui.helper, { color: palette.copy }]}>
						Define quién dará seguimiento y soporte a este usuario en el sistema.
					</Text>
				</View>

				{/* Selection Dropdown */}
				{loading ? (
					<Text style={[ui.loadingCopy, { color: palette.copy }]}>Cargando administradores...</Text>
				) : (
					<View style={ui.dropdownSection}>
						<Text style={[ui.inputLabel, { color: palette.label }]}>Seleccionar responsable</Text>
						<Dropdown
							style={[
								ui.dropdown,
								{ backgroundColor: palette.dropdownBg, borderColor: isFocus ? headerAccent : palette.dropdownBorder },
							]}
							placeholderStyle={[ui.dropdownPlaceholder, { color: palette.label }]}
							selectedTextStyle={[ui.dropdownSelectedText, { color: palette.title }]}
							inputSearchStyle={[ui.inputSearchStyle, { color: palette.title, backgroundColor: palette.dropdownBg }]}
							iconStyle={ui.iconStyle}
							data={adminOptions}
							search
							maxHeight={260}
							labelField="label"
							valueField="value"
							disable={!canEditAssignment || saving}
							placeholder={!isFocus ? 'Seleccionar responsable...' : '...'}
							searchPlaceholder="Buscar por nombre o usuario..."
							value={selectedAdmin}
							onFocus={() => setIsFocus(true)}
							onBlur={() => setIsFocus(false)}
							onChange={(option) => {
								setSelectedAdmin(option.value);
								setIsFocus(false);
								setFeedback({ message: '', type: 'info' });
							}}
						/>

						{feedback.message ? (
							<HelperText type={feedback.type} visible style={ui.feedback}>
								{feedback.message}
							</HelperText>
						) : null}
					</View>
				)}

				<Button
					mode="contained"
					icon="content-save-outline"
					onPress={handleSave}
					disabled={!canEditAssignment || !hasChanges || loading || saving}
					loading={saving}
					style={ui.actionButton}
					contentStyle={ui.actionButtonContent}
				>
					Guardar asignación
				</Button>

				{!canEditAssignment ? (
					<HelperText type="info" visible style={ui.permissionNotice}>
						Solo los administradores del sistema o el propio usuario pueden modificar esta asignación.
					</HelperText>
				) : null}
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	actionButton: {
		borderRadius: 14,
	},
	actionButtonContent: {
		minHeight: 44,
	},
	card: {
		borderWidth: 1,
		overflow: 'hidden',
	},
	content: {
		gap: 14,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},
	currentAdminName: {
		fontSize: 15,
		fontWeight: '800',
	},
	currentChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	currentChipText: {
		fontSize: 10,
		fontWeight: '900',
	},
	currentLabel: {
		fontSize: 10.5,
		fontWeight: '800',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	currentTile: {
		borderRadius: 14,
		borderWidth: 1,
		gap: 6,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	currentTop: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	dropdown: {
		borderRadius: 14,
		borderWidth: 1,
		height: 48,
		paddingHorizontal: 14,
	},
	dropdownPlaceholder: {
		fontSize: 13.5,
	},
	dropdownSection: {
		gap: 6,
	},
	dropdownSelectedText: {
		fontSize: 13.5,
		fontWeight: '700',
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	feedback: {
		marginBottom: 0,
		marginTop: 2,
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
	helper: {
		fontSize: 12,
		lineHeight: 16,
	},
	iconStyle: {
		height: 20,
		width: 20,
	},
	iconWrap: {
		alignItems: 'center',
		borderRadius: 16,
		height: 46,
		justifyContent: 'center',
		width: 46,
	},
	inputLabel: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	inputSearchStyle: {
		borderRadius: 12,
		fontSize: 13,
		height: 42,
	},
	loadingCopy: {
		fontSize: 13,
		paddingVertical: 10,
		textAlign: 'center',
	},
	permissionNotice: {
		fontSize: 11,
		margin: 0,
		padding: 0,
	},
	title: {
		fontSize: 18,
		fontWeight: '900',
		letterSpacing: -0.2,
	},
});

export default memo(AdminAssignmentCard);
