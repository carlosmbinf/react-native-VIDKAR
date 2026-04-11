import { MaterialCommunityIcons } from '@expo/vector-icons';
import Meteor from '@meteorrn/core';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Avatar, Button, Card, Chip, Divider, HelperText, IconButton, Snackbar, Switch, Text, TextInput, Title } from 'react-native-paper';

const getInitials = (name = '') =>
	name
		.trim()
		.split(/\s+/)
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

const hashColor = (seed = '') => {
	let hash = 0;
	for (let index = 0; index < seed.length; index += 1) {
		hash = seed.charCodeAt(index) + ((hash << 5) - hash);
	}
	const color = (hash & 0x00ffffff).toString(16).toUpperCase();
	return `#${'00000'.substring(0, 6 - color.length)}${color}`;
};

const formatDate = (value) => {
	if (!value) {
		return '';
	}
	try {
		return new Date(value).toLocaleString('es-ES', { hour12: false });
	} catch {
		return '';
	}
};

const UserDataCard = ({ item, styles, edit, setEdit, accentColor }) => {
	const [form, setForm] = useState({ username: '', email: '' });
	const [password, setPassword] = useState('');
	const [repeatPassword, setRepeatPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showRepeatPassword, setShowRepeatPassword] = useState(false);
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState({ visible: false, message: '', type: 'info' });
	const [focus, setFocus] = useState(null);

	const headerAccent = accentColor || '#1976D2';

	useEffect(() => {
		if (edit && item) {
			setForm({ username: item?.username || '', email: item?.emails?.[0]?.address || '' });
			setPassword('');
			setRepeatPassword('');
			setErrors({});
		}
	}, [edit, item]);

	const validate = useCallback(() => {
		const nextErrors = {};
		if (form.username && form.username.trim().length < 3) {
			nextErrors.username = 'Mínimo 3 caracteres';
		}
		if (form.email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(form.email.trim())) {
				nextErrors.email = 'Formato de email inválido';
			}
		}
		if (password || repeatPassword) {
			if (password.length < 8) {
				nextErrors.password = 'Mínimo 8 caracteres';
			}
			const complexity = /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
			if (!complexity) {
				nextErrors.password = 'Debe incluir mayúscula, minúscula y número';
			}
			if (password !== repeatPassword) {
				nextErrors.repeatPassword = 'No coincide';
			}
		}
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}, [form, password, repeatPassword]);

	useEffect(() => {
		if (edit) {
			validate();
		}
	}, [form, password, repeatPassword, edit, validate]);

	const hasChanges = useCallback(() => {
		if (!item) {
			return false;
		}
		const changedUser = form.username && form.username !== item.username;
		const changedEmail = form.email && form.email !== (item?.emails?.[0]?.address || '');
		return changedUser || changedEmail;
	}, [form, item]);

	const onSaveUserInfo = async () => {
		if (!validate()) {
			setFeedback({ visible: true, message: 'Corrige los errores antes de guardar', type: 'error' });
			return;
		}
		if (!hasChanges()) {
			setFeedback({ visible: true, message: 'Sin cambios que guardar', type: 'info' });
			return;
		}

		try {
			setSaving(true);
			const setPayload = {};
			if (form.email && form.email !== item?.emails?.[0]?.address) {
				setPayload.emails = [{ address: form.email.trim() }];
			}
			if (form.username && form.username !== item?.username) {
				setPayload.username = form.username.trim();
			}
			if (Object.keys(setPayload).length) {
				Meteor.users.update(item._id, { $set: setPayload });
			}
			setFeedback({ visible: true, message: 'Datos actualizados', type: 'success' });
			if (item._id === Meteor.userId() && (setPayload.username || setPayload.emails)) {
				Meteor.logout(() => {
					router.replace('/(auth)/Loguin');
				});
			}
			setEdit(false);
		} catch {
			setFeedback({ visible: true, message: 'Error al guardar', type: 'error' });
		} finally {
			setSaving(false);
		}
	};

	const onToggleRole = () => {
		if (Meteor.user()?.username !== 'carlosmbinf') {
			return;
		}
		Alert.alert('Confirmar', `¿Cambiar rol a ${item?.profile?.role === 'admin' ? 'user' : 'admin'}?`, [
			{ text: 'Cancelar', style: 'cancel' },
			{
				text: 'Sí',
				onPress: () => Meteor.users.update(item._id, { $set: { 'profile.role': item?.profile?.role === 'admin' ? 'user' : 'admin' } }),
			},
		]);
	};

	const passwordStrength = (() => {
		if (!password) {
			return { label: '', color: undefined };
		}
		let score = 0;
		if (password.length >= 8) score += 1;
		if (/[A-Z]/.test(password)) score += 1;
		if (/[a-z]/.test(password)) score += 1;
		if (/\d/.test(password)) score += 1;
		if (/[^A-Za-z0-9]/.test(password)) score += 1;
		if (score <= 2) return { label: 'Débil', color: '#d9534f' };
		if (score === 3) return { label: 'Media', color: '#f0ad4e' };
		return { label: 'Fuerte', color: '#5cb85c' };
	})();

	const onChangePassword = () => {
		if (!password && !repeatPassword) {
			setFeedback({ visible: true, message: 'Ingresa la nueva contraseña', type: 'info' });
			return;
		}
		if (!validate()) {
			return;
		}
		Meteor.call('changePasswordServer', item._id, Meteor.userId(), password, (error) => {
			if (error) {
				setFeedback({ visible: true, message: error.message, type: 'error' });
				return;
			}
			setFeedback({ visible: true, message: 'Contraseña cambiada', type: 'success' });
			setPassword('');
			setRepeatPassword('');
		});
	};

	const changed = {
		username: !!item && form.username !== item?.username && form.username !== '',
		email: !!item && form.email !== (item?.emails?.[0]?.address || '') && form.email !== '',
	};

	const handleCancelEdit = () => {
		if (hasChanges()) {
			Alert.alert('Descartar cambios', 'Hay cambios sin guardar. ¿Deseas descartarlos?', [
				{ text: 'Seguir editando', style: 'cancel' },
				{ text: 'Descartar', style: 'destructive', onPress: () => { setEdit(false); setErrors({}); } },
			]);
			return;
		}
		setEdit(false);
	};

	return (
		<>
			<Card elevation={12} style={[styles.cards, ui.cardShell]} testID="user-data-card">
				<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
				<Card.Content style={ui.content}>
					<View style={styles.element}>
						<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
							<Avatar.Text size={48} label={getInitials(item?.username || item?.profile?.name || 'U')} style={{ backgroundColor: hashColor(item?.username || item?._id || 'U') }} />
							<View style={{ marginLeft: 12, flex: 1 }}>
								<Title style={[styles.title, { marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start' }]} numberOfLines={1}>
									{item?.username || 'Usuario'}
								</Title>
								<Chip compact icon={item?.profile?.role === 'admin' ? 'shield-crown' : 'account'}>
									{item?.profile?.role || 'N/R'}
								</Chip>
							</View>
							{!edit ? <IconButton icon="pencil" onPress={() => setEdit(true)} accessibilityLabel="Editar usuario" /> : null}
						</View>

						<Divider style={{ marginVertical: 6 }} />

						{edit ? (
							<>
								<Text style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>Identidad</Text>
								<TextInput
									mode="outlined"
									value={form.username}
									onFocus={() => setFocus('username')}
									onBlur={() => setFocus(null)}
									onChangeText={(value) => setForm((previous) => ({ ...previous, username: value }))}
									label="Usuario"
									autoCapitalize="none"
									error={!!errors.username}
									disabled={saving}
									outlineColor={changed.username ? '#1976D2' : undefined}
									right={changed.username ? <TextInput.Icon icon="circle-edit-outline" forceTextInputFocus={false} /> : undefined}
									style={{ height: 48, marginBottom: 2 }}
								/>
								<HelperText type={errors.username ? 'error' : 'info'} visible={focus === 'username' || !!errors.username} style={{ marginBottom: 4 }}>
									{errors.username || 'Mínimo 3 caracteres.'}
								</HelperText>

								<Text style={{ fontSize: 13, opacity: 0.6, marginTop: 4, marginBottom: 4 }}>Contacto</Text>
								{Meteor.user()?.profile?.role === 'admin' ? (
									<>
										<TextInput
											mode="outlined"
											value={form.email}
											onFocus={() => setFocus('email')}
											onBlur={() => setFocus(null)}
											onChangeText={(value) => setForm((previous) => ({ ...previous, email: value }))}
											label="Email"
											keyboardType="email-address"
											autoCapitalize="none"
											error={!!errors.email}
											disabled={saving}
											outlineColor={changed.email ? '#1976D2' : undefined}
											right={changed.email ? <TextInput.Icon icon="circle-edit-outline" forceTextInputFocus={false} /> : undefined}
											style={{ height: 48, marginBottom: 2 }}
										/>
										<HelperText type={errors.email ? 'error' : 'info'} visible={focus === 'email' || !!errors.email} style={{ marginBottom: 4 }}>
											{errors.email || 'Formato válido: usuario@dominio'}
										</HelperText>
									</>
								) : (
									<Text style={styles.data}>
										<MaterialCommunityIcons name="email" size={18} /> {item?.emails?.[0]?.address}
									</Text>
								)}

								<Text style={{ fontSize: 13, opacity: 0.6, marginTop: 8, marginBottom: 4 }}>Rol</Text>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={[styles.data, { flex: 1 }]}>
										<MaterialCommunityIcons name="shield-account" size={22} /> {item?.profile?.role}
									</Text>
									{Meteor.user()?.username === 'carlosmbinf' ? <Switch value={item?.profile?.role === 'admin'} onValueChange={onToggleRole} disabled={saving} /> : null}
								</View>

								<View style={{ justifyContent: 'space-around', flexDirection: 'row', marginTop: 14 }}>
									<Button mode="text" onPress={handleCancelEdit} disabled={saving} icon="close-circle-outline">Cancelar</Button>
									<Button mode="contained" onPress={onSaveUserInfo} loading={saving} icon="content-save-outline" disabled={saving || !hasChanges() || Object.keys(errors).length > 0}>Guardar</Button>
								</View>
							</>
						) : (
							<View style={{ marginTop: 4 }}>
								<Text style={styles.data}><MaterialCommunityIcons name="email" size={18} /> {item?.emails?.[0]?.address}</Text>
								{item?.createdAt ? <Text style={[styles.data, { opacity: 0.7 }]}><MaterialCommunityIcons name="calendar" size={16} /> Alta: {formatDate(item?.createdAt)}</Text> : null}
							</View>
						)}
					</View>
				</Card.Content>
			</Card>

			{edit ? (
				<Card style={[ui.passwordCard, ui.cardShell]}>
					<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
					<Card.Content>
						<Title style={styles.title}>Cambiar Contraseña:</Title>
						<TextInput
							mode="outlined"
							value={password}
							onChangeText={setPassword}
							label="Contraseña"
							secureTextEntry={!showPassword}
							right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword((current) => !current)} />}
							error={!!errors.password}
							disabled={saving}
							style={{ height: 48, marginBottom: 4 }}
						/>
						{passwordStrength.label ? <Text style={{ color: passwordStrength.color, marginBottom: 4 }}>Fortaleza: {passwordStrength.label}</Text> : null}
						{errors.password ? <Text style={{ color: '#d9534f', marginBottom: 6 }}>{errors.password}</Text> : null}
						<TextInput
							mode="outlined"
							value={repeatPassword}
							onChangeText={setRepeatPassword}
							label="Repite la Contraseña"
							secureTextEntry={!showRepeatPassword}
							right={<TextInput.Icon icon={showRepeatPassword ? 'eye-off' : 'eye'} onPress={() => setShowRepeatPassword((current) => !current)} />}
							error={!!errors.repeatPassword}
							disabled={saving}
							style={{ height: 48, marginBottom: 4 }}
						/>
						{errors.repeatPassword ? <Text style={{ color: '#d9534f', marginBottom: 6 }}>{errors.repeatPassword}</Text> : null}
					</Card.Content>
					<Card.Actions style={{ justifyContent: 'space-around' }}>
						<Button onPress={() => setEdit(false)} disabled={saving}><MaterialCommunityIcons name="cancel" size={30} /></Button>
						<Button onPress={onChangePassword} disabled={saving || !password || !repeatPassword || Object.keys(errors).some((key) => key.includes('password'))}><MaterialCommunityIcons name="content-save" size={30} /></Button>
					</Card.Actions>
				</Card>
			) : null}

			<Snackbar
				visible={feedback.visible}
				onDismiss={() => setFeedback((previous) => ({ ...previous, visible: false }))}
				duration={3000}
				style={feedback.type === 'error' ? { backgroundColor: '#d9534f' } : feedback.type === 'success' ? { backgroundColor: '#5cb85c' } : undefined}
			>
				{feedback.message}
			</Snackbar>
		</>
	);
};

const ui = {
	cardShell: { overflow: 'hidden' },
	accentBar: { height: 4, width: '100%' },
	content: { paddingTop: 10 },
	passwordCard: {
		width: '100%',
		padding: 10,
		elevation: 12,
		borderRadius: 20,
		marginBottom: 20,
	},
};

export default memo(UserDataCard);
