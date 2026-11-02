import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Meteor from '@meteorrn/core';
import { router } from 'expo-router';
import { clearMCPConfiguration } from '../../../services/mcp/mcpClient';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, Paragraph, Portal, Text, TextInput, useTheme } from 'react-native-paper';

const DeleteAccountCard = ({ userId, username }) => {
	const theme = useTheme();
	const [loading, setLoading] = useState(false);
	const [dialogVisible, setDialogVisible] = useState(false);
	const [confirmText, setConfirmText] = useState('');
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	useEffect(() => {
		const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (event) => {
			setKeyboardHeight(event.endCoordinates.height);
		});
		const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
			setKeyboardHeight(0);
		});

		return () => {
			showSubscription.remove();
			hideSubscription.remove();
		};
	}, []);

	const showConfirmDialog = () => {
		setDialogVisible(true);
		setConfirmText('');
	};

	const hideDialog = () => {
		Keyboard.dismiss();
		setDialogVisible(false);
		setConfirmText('');
	};

	const handleDeleteAccount = () => {
		if (confirmText.trim().toUpperCase() !== 'ELIMINAR') {
			Alert.alert('Verificación incorrecta', 'Por favor escriba ELIMINAR exactamente como se indica para confirmar.', [{ text: 'Entendido', style: 'cancel' }]);
			return;
		}

		Keyboard.dismiss();
		hideDialog();
		setLoading(true);

		Meteor.call('admin.eliminarUsuario', userId, (error, result) => {
			setLoading(false);
			if (error) {
				Alert.alert('Error', error.reason || error.message || 'No se pudo eliminar la cuenta.');
				return;
			}

			const removed = result?.removed || {};
			const totalRemoved = (removed.logs || 0) + (removed.registerDataUsers || 0) + (removed.mensajes || 0);
			Alert.alert(
				'Cuenta eliminada',
				`Su cuenta ${username} ha sido eliminada permanentemente.\n\nLogs: ${removed.logs || 0}\nRegistros: ${removed.registerDataUsers || 0}\nMensajes: ${removed.mensajes || 0}\nTotal: ${totalRemoved}`,
				[
					{
						text: 'Entendido',
						onPress: () => {
							clearMCPConfiguration().finally(() => {
								Meteor.logout(() => router.replace('/(auth)/Loguin'));
							});
						},
					},
				],
				{ cancelable: false },
			);
		});
	};

	const palette = {
		border: theme.dark ? 'rgba(239, 68, 68, 0.28)' : 'rgba(239, 68, 68, 0.18)',
		copy: theme.dark ? '#fca5a5' : '#991b1b',
		danger: theme.dark ? '#f87171' : '#dc2626',
		iconBg: theme.dark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.10)',
		label: theme.dark ? '#fca5a5' : '#b91c1c',
		panel: theme.dark ? 'rgba(69, 10, 10, 0.35)' : 'rgba(254, 242, 242, 0.85)',
		surface: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(255, 255, 255, 0.98)',
		title: theme.dark ? '#fee2e2' : '#7f1d1d',
		warningBg: theme.dark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(254, 243, 199, 0.85)',
		warningBorder: theme.dark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.20)',
		warningText: theme.dark ? '#fbbf24' : '#b45309',
	};

	const itemsList = [
		'Todos sus datos personales y credenciales',
		'Historial de consumo de datos y registros',
		'Mensajes y conversaciones en el sistema',
		'Configuraciones y archivos asociados',
	];

	return (
		<Card elevation={0} style={[ui.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
			<Card.Content style={ui.content}>
				{/* Header */}
				<View style={ui.header}>
					<View style={[ui.iconWrap, { backgroundColor: palette.iconBg }]}>
						<MaterialCommunityIcons name="shield-alert-outline" size={24} color={palette.danger} />
					</View>
					<View style={ui.headerCopy}>
						<Text style={[ui.eyebrow, { color: palette.label }]}>Acción irreversible</Text>
						<Text style={[ui.title, { color: palette.title }]}>Zona de peligro</Text>
					</View>
				</View>

				{/* Warning Notice */}
				<View style={[ui.warningBox, { backgroundColor: palette.warningBg, borderColor: palette.warningBorder }]}>
					<MaterialCommunityIcons name="alert-triangle-outline" size={20} color={palette.warningText} />
					<Text style={[ui.warningText, { color: palette.warningText }]}>
						Esta acción es definitiva y no se puede recuperar.
					</Text>
				</View>

				<Paragraph style={[ui.description, { color: palette.copy }]}>
					Al eliminar esta cuenta se suprimirán permanentemente todos los datos, permisos y registros vinculados.
				</Paragraph>

				{/* Deletion Scope List */}
				<View style={[ui.listContainer, { backgroundColor: palette.panel, borderColor: palette.border }]}>
					{itemsList.map((text) => (
						<View style={ui.listItem} key={text}>
							<MaterialCommunityIcons name="close-circle-outline" size={17} color={palette.danger} />
							<Text style={[ui.listText, { color: palette.copy }]}>{text}</Text>
						</View>
					))}
				</View>

				{/* Delete Button */}
				<Button
					mode="contained"
					onPress={showConfirmDialog}
					loading={loading}
					disabled={loading}
					buttonColor={palette.danger}
					icon="delete-forever-outline"
					style={ui.deleteButton}
					contentStyle={ui.deleteButtonContent}
				>
					{loading ? 'Eliminando cuenta...' : 'Eliminar mi cuenta'}
				</Button>
			</Card.Content>

			{/* Safe Confirmation Dialog */}
			<Portal>
				<Dialog visible={dialogVisible} onDismiss={hideDialog} style={[ui.dialog, keyboardHeight > 0 && { marginTop: -keyboardHeight }]}>
					<Dialog.Title style={ui.dialogTitle}>¿Confirmas la eliminación?</Dialog.Title>
					<ScrollView style={ui.scrollView} contentContainerStyle={ui.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
						<Dialog.Content style={ui.dialogBody}>
							<View style={ui.dialogWarningIcon}>
								<MaterialCommunityIcons name="alert-octagon" size={42} color={palette.danger} />
								<Text style={[ui.dialogWarningText, { color: palette.danger }]}>Esta acción no se puede deshacer</Text>
							</View>
							<Paragraph style={ui.dialogDescription}>
								La cuenta <Text style={ui.bold}>@{username}</Text> y todos sus registros serán eliminados de manera permanente.
							</Paragraph>
							<Paragraph style={ui.dialogDescription}>
								Para confirmar, escribe <Text style={ui.bold}>ELIMINAR</Text> en el siguiente campo:
							</Paragraph>
							<TextInput
								mode="outlined"
								placeholder="Escribe ELIMINAR"
								value={confirmText}
								onChangeText={setConfirmText}
								autoCapitalize="characters"
								autoCorrect={false}
								style={ui.input}
								outlineColor={palette.border}
								activeOutlineColor={palette.danger}
								error={!!confirmText && confirmText.trim().toUpperCase() !== 'ELIMINAR'}
								returnKeyType="done"
								onSubmitEditing={() => {
									if (confirmText.trim().toUpperCase() === 'ELIMINAR') {
										handleDeleteAccount();
									}
								}}
							/>
							{confirmText && confirmText.trim().toUpperCase() !== 'ELIMINAR' ? (
								<View style={ui.errorBox}>
									<MaterialCommunityIcons name="close-circle" size={16} color={palette.danger} />
									<Text style={[ui.errorText, { color: palette.danger }]}>Debes escribir exactamente ELIMINAR</Text>
								</View>
							) : null}
						</Dialog.Content>
					</ScrollView>
					<Dialog.Actions style={ui.dialogActions}>
						<Button mode="text" onPress={hideDialog} textColor={palette.copy}>Cancelar</Button>
						<Button
							mode="contained"
							onPress={handleDeleteAccount}
							buttonColor={palette.danger}
							disabled={confirmText.trim().toUpperCase() !== 'ELIMINAR'}
						>
							Eliminar definitivamente
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>
		</Card>
	);
};

const ui = StyleSheet.create({
	bold: {
		fontWeight: '800',
	},
	card: {
		borderRadius: 22,
		borderWidth: 1,
		overflow: 'hidden',
	},
	content: {
		gap: 14,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},
	deleteButton: {
		borderRadius: 14,
		marginTop: 4,
	},
	deleteButtonContent: {
		minHeight: 44,
	},
	description: {
		fontSize: 12.5,
		lineHeight: 18,
	},
	dialog: {
		alignSelf: 'center',
		borderRadius: 20,
		maxWidth: 480,
		width: '92%',
	},
	dialogActions: {
		justifyContent: 'space-between',
		paddingBottom: 16,
		paddingHorizontal: 16,
	},
	dialogBody: {
		gap: 8,
		paddingHorizontal: 18,
	},
	dialogDescription: {
		fontSize: 13,
		lineHeight: 18,
	},
	dialogTitle: {
		fontSize: 18,
		fontWeight: '900',
		textAlign: 'center',
	},
	dialogWarningIcon: {
		alignItems: 'center',
		gap: 6,
		marginVertical: 4,
	},
	dialogWarningText: {
		fontSize: 13.5,
		fontWeight: '800',
		textAlign: 'center',
	},
	errorBox: {
		alignItems: 'center',
		borderRadius: 8,
		flexDirection: 'row',
		gap: 6,
		marginTop: 4,
		padding: 6,
	},
	errorText: {
		fontSize: 12,
		fontWeight: '700',
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.6,
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
	input: {
		borderRadius: 12,
		marginTop: 6,
	},
	listContainer: {
		borderRadius: 14,
		borderWidth: 1,
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	listItem: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
	},
	listText: {
		flex: 1,
		fontSize: 12.5,
		fontWeight: '600',
	},
	scrollContent: {
		paddingBottom: 8,
	},
	scrollView: {
		maxHeight: 280,
	},
	title: {
		fontSize: 18,
		fontWeight: '900',
		letterSpacing: -0.2,
	},
	warningBox: {
		alignItems: 'center',
		borderRadius: 12,
		borderWidth: 1,
		flexDirection: 'row',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	warningText: {
		flex: 1,
		fontSize: 12.5,
		fontWeight: '700',
		lineHeight: 17,
	},
});

export default DeleteAccountCard;
