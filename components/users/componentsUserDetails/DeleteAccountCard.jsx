import { MaterialCommunityIcons } from '@expo/vector-icons';
import Meteor from '@meteorrn/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, Paragraph, Portal, Text, TextInput } from 'react-native-paper';

const DeleteAccountCard = ({ userId, username }) => {
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

	return (
		<Card style={ui.card} elevation={3}>
			<Card.Content>
				<View style={ui.header}>
					<MaterialCommunityIcons name="account-remove" size={28} color="#D32F2F" />
					<Text style={ui.title}>Zona Peligrosa</Text>
				</View>

				<View style={ui.warningBox}>
					<MaterialCommunityIcons name="alert-circle" size={20} color="#F57C00" />
					<Text style={ui.warningText}>Esta acción es <Text style={ui.bold}>irreversible</Text></Text>
				</View>

				<Paragraph style={ui.description}>Al eliminar su cuenta se borrarán <Text style={ui.bold}>permanentemente</Text> todos sus datos y configuraciones.</Paragraph>

				<View style={ui.listContainer}>
					{['Todos sus datos personales', 'Historial de consumo y registros', 'Mensajes y conversaciones', 'Archivos y configuraciones'].map((text) => (
						<View style={ui.listItem} key={text}>
							<MaterialCommunityIcons name="check-circle" size={18} color="#666" />
							<Text style={ui.listText}>{text}</Text>
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
	card: { borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#D32F2F' },
	header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
	title: { fontSize: 18, fontWeight: 'bold', color: '#D32F2F', marginLeft: 12 },
	warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#F57C00' },
	warningText: { fontSize: 14, color: '#E65100', marginLeft: 8 },
	description: { fontSize: 14, color: '#777', marginBottom: 12, lineHeight: 20 },
	listContainer: { marginBottom: 20 },
	listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
	listText: { fontSize: 13, color: '#666', marginLeft: 8 },
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
