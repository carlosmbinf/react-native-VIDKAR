import { MaterialCommunityIcons } from '@expo/vector-icons';
import Meteor from '@meteorrn/core';
import { router } from 'expo-router';
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
							Meteor.logout(() => {
								router.replace('/(auth)/Loguin');
							});
						},
					},
				],
				{ cancelable: false },
			);
		});
	};

	const palette = {
		border: theme.dark ? 'rgba(248, 113, 113, 0.28)' : 'rgba(220, 38, 38, 0.18)',
		copy: theme.dark ? '#fecaca' : '#7f1d1d',
		muted: theme.dark ? '#fca5a5' : '#991b1b',
		panel: theme.dark ? 'rgba(127, 29, 29, 0.28)' : 'rgba(254, 242, 242, 0.96)',
		surface: theme.dark ? 'rgba(69, 10, 10, 0.76)' : '#ffffff',
		title: theme.dark ? '#fee2e2' : '#991b1b',
		warningPanel: theme.dark ? 'rgba(154, 52, 18, 0.26)' : 'rgba(255, 247, 237, 0.96)',
	};

	return (
		<Card style={[ui.card, { backgroundColor: palette.surface, borderColor: palette.border }]} elevation={4}>
			<View style={ui.accentBar} />
			<Card.Content style={ui.content}>
				<View style={ui.header}>
					<View style={ui.iconWrap}>
						<MaterialCommunityIcons name="account-remove" size={26} color="#EF4444" />
					</View>
					<View style={ui.headerCopy}>
						<Text style={ui.eyebrow}>Acción irreversible</Text>
						<Text style={[ui.title, { color: palette.title }]}>Zona peligrosa</Text>
					</View>
				</View>

				<View style={[ui.warningBox, { backgroundColor: palette.warningPanel, borderColor: palette.border }]}>
					<MaterialCommunityIcons name="alert-circle" size={20} color="#F57C00" />
					<Text style={[ui.warningText, { color: palette.muted }]}>Esta acción es <Text style={ui.bold}>irreversible</Text></Text>
				</View>

				<Paragraph style={[ui.description, { color: palette.copy }]}>Al eliminar su cuenta se borrarán <Text style={ui.bold}>permanentemente</Text> todos sus datos y configuraciones.</Paragraph>

				<View style={[ui.listContainer, { backgroundColor: palette.panel, borderColor: palette.border }]}>
					{['Todos sus datos personales', 'Historial de consumo y registros', 'Mensajes y conversaciones', 'Archivos y configuraciones'].map((text) => (
						<View style={ui.listItem} key={text}>
							<MaterialCommunityIcons name="check-circle" size={18} color="#EF4444" />
							<Text style={[ui.listText, { color: palette.copy }]}>{text}</Text>
						</View>
					))}
				</View>

				<Button mode="contained" onPress={showConfirmDialog} loading={loading} disabled={loading} buttonColor="#D32F2F" icon="delete-forever" style={ui.deleteButton} labelStyle={ui.deleteButtonLabel}>
					{loading ? 'Eliminando...' : 'Eliminar Mi Cuenta'}
				</Button>
			</Card.Content>

			<Portal>
				<Dialog visible={dialogVisible} onDismiss={hideDialog} style={[ui.dialog, keyboardHeight > 0 && { marginTop: -keyboardHeight }]}>
					<Dialog.Title style={ui.dialogTitle}>¿Está completamente seguro?</Dialog.Title>
					<ScrollView style={ui.scrollView} contentContainerStyle={ui.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
						<Dialog.Content>
							<View style={ui.dialogWarning}>
								<MaterialCommunityIcons name="alert-octagon" size={40} color="#D32F2F" />
								<Text style={ui.dialogWarningText}>Esta acción no se puede deshacer</Text>
							</View>
							<Paragraph style={ui.dialogDescription}>Su cuenta <Text style={ui.bold}>{username}</Text> y todos los datos asociados serán <Text style={ui.bold}>eliminados permanentemente</Text>.</Paragraph>
							<Paragraph style={ui.dialogDescription}>Para confirmar, escriba <Text style={ui.bold}>ELIMINAR</Text> en el campo:</Paragraph>
							<TextInput
								mode="outlined"
								placeholder="Escriba ELIMINAR aquí"
								value={confirmText}
								onChangeText={setConfirmText}
								autoCapitalize="characters"
								autoCorrect={false}
								style={ui.input}
								outlineColor="#D32F2F"
								activeOutlineColor="#D32F2F"
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
									<MaterialCommunityIcons name="close-circle" size={16} color="#D32F2F" />
									<Text style={ui.errorText}>Debe escribir exactamente ELIMINAR</Text>
								</View>
							) : null}
						</Dialog.Content>
					</ScrollView>
					<Dialog.Actions style={ui.dialogActions}>
						<Button mode="text" onPress={hideDialog} textColor="#666">Cancelar</Button>
						<Button mode="contained" onPress={handleDeleteAccount} buttonColor="#D32F2F" disabled={confirmText.trim().toUpperCase() !== 'ELIMINAR'}>Eliminar</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>
		</Card>
	);
};

const ui = StyleSheet.create({
	accentBar: { backgroundColor: '#EF4444', height: 4, width: '100%' },
	card: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
	content: { gap: 14, paddingBottom: 18, paddingTop: 16 },
	eyebrow: { color: '#EF4444', fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
	header: { alignItems: 'center', flexDirection: 'row', gap: 12 },
	headerCopy: { flex: 1, gap: 2 },
	iconWrap: { alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.14)', borderRadius: 18, height: 46, justifyContent: 'center', width: 46 },
	title: { fontSize: 20, fontWeight: '900' },
	warningBox: { alignItems: 'center', borderRadius: 16, borderWidth: 1, flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
	warningText: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
	description: { fontSize: 14, lineHeight: 20, marginBottom: 0 },
	listContainer: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 12 },
	listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
	listText: { fontSize: 13, fontWeight: '700', marginLeft: 8 },
	bold: { fontWeight: 'bold', color: '#D32F2F' },
	deleteButton: { borderRadius: 8, marginTop: 8, marginBottom: 24, marginLeft: 24, marginRight: 24 },
	deleteButtonLabel: { fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5 },
	dialog: { borderRadius: 16, maxWidth: 500, alignSelf: 'center' },
	scrollView: { maxHeight: 250 },
	scrollContent: { paddingBottom: 8 },
	dialogTitle: { fontSize: 18, fontWeight: 'bold', color: '#D32F2F', textAlign: 'center', paddingVertical: 10 },
	dialogWarning: { alignItems: 'center', marginBottom: 12 },
	dialogWarningText: { fontSize: 14, fontWeight: 'bold', color: '#D32F2F', marginTop: 6, textAlign: 'center' },
	dialogDescription: { fontSize: 13, color: '#333', marginBottom: 10, lineHeight: 18, textAlign: 'justify' },
	input: { marginTop: 12, marginBottom: 8 },
	errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 8, borderRadius: 6, marginTop: 8 },
	errorText: { fontSize: 12, color: '#D32F2F', marginLeft: 6 },
	dialogActions: { paddingHorizontal: 16, paddingBottom: 16, justifyContent: 'space-between' },
});

export default DeleteAccountCard;
