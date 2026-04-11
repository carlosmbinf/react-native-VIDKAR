import MeteorBase from '@meteorrn/core';
import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { Button, Card, Chip, Divider, HelperText, Text } from 'react-native-paper';

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
	const headerAccent = accentColor || '#7c3aed';

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
	const showFloatingLabel = (selectedAdmin && selectedAdmin !== EMPTY_ADMIN_VALUE) || isFocus;

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
		<Card elevation={12} style={[styles.cards, ui.cardShell]} testID="admin-assignment-card">
			<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
			<Card.Content style={ui.content}>
				<Text style={ui.title}>Administración</Text>
				<Divider style={ui.divider} />

				<View style={ui.headerBlock}>
					<Text style={ui.label}>Administrado por</Text>
					<Chip compact icon="shield-account" style={ui.currentChip}>
						{buildAdminLabel(currentAdmin)}
					</Chip>
					<Text style={ui.helper}>
						Selecciona el administrador responsable de este usuario.
					</Text>
				</View>

				<Divider style={ui.dividerSection} />

				{loading ? (
					<Text style={ui.loadingCopy}>Cargando administradores del sistema...</Text>
				) : (
					<>
						{showFloatingLabel ? (
							<Text style={[styles.label, isFocus && { color: headerAccent }]}>Administrador del sistema</Text>
						) : null}
						<Dropdown
							style={[styles.dropdown, isFocus && { borderColor: headerAccent }]}
							placeholderStyle={styles.placeholderStyle}
							selectedTextStyle={styles.selectedTextStyle}
							inputSearchStyle={styles.inputSearchStyle}
							iconStyle={styles.iconStyle}
							data={adminOptions}
							search
							maxHeight={260}
							labelField="label"
							valueField="value"
							disable={!canEditAssignment || saving}
							placeholder={!isFocus ? 'Seleccione un administrador' : '...'}
							searchPlaceholder="Buscar administrador..."
							value={selectedAdmin}
							onFocus={() => setIsFocus(true)}
							onBlur={() => setIsFocus(false)}
							onChange={(option) => {
								setSelectedAdmin(option.value);
								setIsFocus(false);
								setFeedback({ message: '', type: 'info' });
							}}
						/>

						<HelperText type={feedback.type} visible={!!feedback.message} style={ui.feedback}>
							{feedback.message}
						</HelperText>
					</>
				)}

				<View style={ui.actions}>
					<Button
						mode="contained"
						icon="content-save-outline"
						onPress={handleSave}
						disabled={!canEditAssignment || !hasChanges || loading || saving}
						loading={saving}
						style={ui.actionButton}
					>
						Guardar administrador
					</Button>
				</View>

				{!canEditAssignment ? (
					<HelperText type="info" visible style={ui.feedback}>
						Solo los administradores del sistema o el propio usuario pueden modificar esta asignación.
					</HelperText>
				) : null}
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	cardShell: { overflow: 'hidden' },
	accentBar: { height: 4, width: '100%' },
	content: { paddingTop: 10 },
	title: {
		paddingTop: 6,
		textAlign: 'center',
		paddingBottom: 6,
		fontWeight: '800',
		opacity: 0.85,
	},
	divider: { marginVertical: 8, opacity: 0.2 },
	dividerSection: { marginVertical: 12, opacity: 0.12 },
	headerBlock: { gap: 8 },
	label: { fontSize: 12, fontWeight: '700', opacity: 0.65, textTransform: 'uppercase' },
	currentChip: { alignSelf: 'flex-start', backgroundColor: '#ede9fe' },
	helper: { fontSize: 12, lineHeight: 18, opacity: 0.72 },
	loadingCopy: { fontSize: 13, opacity: 0.72, textAlign: 'center', paddingVertical: 8 },
	feedback: { marginTop: 6, marginBottom: 0 },
	actions: { marginTop: 10 },
	actionButton: { borderRadius: 18 },
});

export default memo(AdminAssignmentCard);
