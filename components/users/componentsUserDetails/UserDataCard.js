import { MaterialCommunityIcons } from '@expo/vector-icons';
import Meteor from '@meteorrn/core';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Avatar, Button, Card, Chip, Divider, HelperText, Snackbar, Switch, Text, TextInput, Title, useTheme } from 'react-native-paper';

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

const UserDataCard = ({ item, styles, edit, setEdit }) => {
	const theme = useTheme();
	const [form, setForm] = useState({ username: '', email: '' });
	const [password, setPassword] = useState('');
	const [repeatPassword, setRepeatPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showRepeatPassword, setShowRepeatPassword] = useState(false);
	const [passwordExpanded, setPasswordExpanded] = useState(false);
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState({ visible: false, message: '', type: 'info' });
	const [focus, setFocus] = useState(null);

	const headerAccent = theme.dark ? '#60a5fa' : '#2563eb';
	const palette = {
		accent: theme.dark ? '#60a5fa' : '#2563eb',
		accentSoft: theme.dark ? 'rgba(59, 130, 246, 0.22)' : 'rgba(37, 99, 235, 0.10)',
		cardSoft: theme.dark ? 'rgba(15, 23, 42, 0.62)' : 'rgba(255, 255, 255, 0.72)',
		chip: theme.dark ? 'rgba(59, 130, 246, 0.24)' : 'rgba(219, 234, 254, 0.95)',
		chipText: theme.dark ? '#dbeafe' : '#1d4ed8',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		danger: theme.dark ? '#fca5a5' : '#dc2626',
		input: theme.dark ? 'rgba(15, 23, 42, 0.74)' : 'rgba(255, 255, 255, 0.96)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		panel: theme.dark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(248, 250, 252, 0.96)',
		panelBorder: theme.dark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.08)',
		success: theme.dark ? '#86efac' : '#16a34a',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

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
		if (edit || passwordExpanded) {
			validate();
		}
	}, [form, password, repeatPassword, edit, passwordExpanded, validate]);

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
			setPasswordExpanded(false);
		});
	};

	const changed = {
		username: !!item && form.username !== item?.username && form.username !== '',
		email: !!item && form.email !== (item?.emails?.[0]?.address || '') && form.email !== '',
	};
	const hasUserInfoErrors = Boolean(errors.username || errors.email);
	const hasPasswordErrors = Boolean(errors.password || errors.repeatPassword);

	const handleStartEdit = () => {
		setPasswordExpanded(false);
		setEdit(true);
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

	const handleCancelPassword = () => {
		setPassword('');
		setRepeatPassword('');
		setShowPassword(false);
		setShowRepeatPassword(false);
		setPasswordExpanded(false);
		setErrors((current) => {
			const nextErrors = { ...current };
			delete nextErrors.password;
			delete nextErrors.repeatPassword;
			return nextErrors;
		});
	};

	return (
		<>
			<Card elevation={4} style={styles.cards} testID="user-data-card">
				<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
				<Card.Content style={ui.content}>
					<View style={ui.cardBody}>
						<View style={ui.headerRow}>
							<Avatar.Text size={52} label={getInitials(item?.username || item?.profile?.name || 'U')} style={{ backgroundColor: hashColor(item?.username || item?._id || 'U') }} />
							<View style={ui.headerCopy}>
								<Text style={[ui.eyebrow, { color: palette.label }]}>Cuenta de acceso</Text>
								<Text style={[ui.accountTitle, { color: palette.title }]} numberOfLines={1}>
									{item?.username || 'Usuario'}
								</Text>
								<Chip compact icon={item?.profile?.role === 'admin' ? 'shield-crown' : 'account'} style={[ui.roleChip, { backgroundColor: palette.chip }]} textStyle={[ui.roleChipText, { color: palette.chipText }]}>
									{item?.profile?.role || 'N/R'}
								</Chip>
							</View>
						</View>

						<Divider style={ui.divider} />

						{edit ? (
							<>
								<Text style={[ui.sectionLabel, { color: palette.label }]}>Identidad</Text>
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
									style={[ui.input, { backgroundColor: palette.input }]}
								/>
								<HelperText type={errors.username ? 'error' : 'info'} visible={focus === 'username' || !!errors.username} style={{ marginBottom: 4 }}>
									{errors.username || 'Mínimo 3 caracteres.'}
								</HelperText>

								<Text style={[ui.sectionLabel, { color: palette.label, marginTop: 4 }]}>Contacto</Text>
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
											style={[ui.input, { backgroundColor: palette.input }]}
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

								<Text style={[ui.sectionLabel, { color: palette.label, marginTop: 8 }]}>Rol</Text>
								<View style={[ui.rolePanel, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}> 
									<Text style={[styles.data, { flex: 1 }]}>
										<MaterialCommunityIcons name="shield-account" size={22} /> {item?.profile?.role}
									</Text>
									{Meteor.user()?.username === 'carlosmbinf' ? <Switch value={item?.profile?.role === 'admin'} onValueChange={onToggleRole} disabled={saving} /> : null}
								</View>

								<View style={ui.formActions}>
									<Button mode="outlined" onPress={handleCancelEdit} disabled={saving} icon="close-circle-outline" style={ui.secondaryButton}>Cancelar</Button>
									<Button mode="contained" onPress={onSaveUserInfo} loading={saving} icon="content-save-outline" disabled={saving || !hasChanges() || hasUserInfoErrors} style={ui.primaryButton}>Guardar datos</Button>
								</View>
							</>
						) : (
							<View style={ui.readOnlyGrid}>
								<View style={[ui.readOnlyItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
									<Text style={[ui.infoLabel, { color: palette.label }]}>Correo</Text>
									<Text style={[ui.infoValue, { color: palette.title }]} numberOfLines={1}><MaterialCommunityIcons name="email" size={16} /> {item?.emails?.[0]?.address || '—'}</Text>
								</View>
								{item?.createdAt ? (
									<View style={[ui.readOnlyItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
										<Text style={[ui.infoLabel, { color: palette.label }]}>Alta</Text>
										<Text style={[ui.infoValue, { color: palette.title }]} numberOfLines={1}><MaterialCommunityIcons name="calendar" size={16} /> {formatDate(item?.createdAt)}</Text>
									</View>
								) : null}
							</View>
						)}

						{!edit ? (
							<View style={ui.quickActionsRow}>
								<Button
									mode="outlined"
									icon="account-edit-outline"
									onPress={handleStartEdit}
									style={ui.quickActionButton}
									contentStyle={ui.quickActionContent}
								>
									Editar datos
								</Button>
								<Button
									mode="contained-tonal"
									icon="lock-reset"
									onPress={() => setPasswordExpanded(true)}
									style={ui.quickActionButton}
									contentStyle={ui.quickActionContent}
								>
									Cambiar contraseña
								</Button>
							</View>
						) : null}
					</View>
				</Card.Content>
			</Card>

			{passwordExpanded ? (
				<Card elevation={4} style={[styles.cards, ui.passwordCard]} testID="password-change-card">
					<View style={[ui.accentBar, { backgroundColor: headerAccent }]} />
					<Card.Content style={ui.passwordContent}>
						<View style={ui.securityHeader}>
							<View style={[ui.securityIconWrap, { backgroundColor: palette.accentSoft }]}> 
								<MaterialCommunityIcons name="lock-reset" size={26} color={palette.accent} />
							</View>
							<View style={ui.headerCopy}>
								<Text style={[ui.eyebrow, { color: palette.label }]}>Seguridad</Text>
								<Title style={[ui.securityTitle, { color: palette.title }]}>Cambiar contraseña</Title>
								<Text style={[ui.securitySubtitle, { color: palette.copy }]}>Define una clave nueva para este usuario. La acción no modifica sus datos personales.</Text>
							</View>
						</View>
						<View style={[ui.passwordNotice, { backgroundColor: palette.cardSoft, borderColor: palette.panelBorder }]}> 
							<MaterialCommunityIcons name="information-outline" size={18} color={palette.accent} />
							<Text style={[ui.passwordNoticeText, { color: palette.copy }]}>Usa al menos 8 caracteres e incluye mayúscula, minúscula y número.</Text>
						</View>
						<TextInput
							mode="outlined"
							value={password}
							onChangeText={setPassword}
							label="Nueva contraseña"
							secureTextEntry={!showPassword}
							right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword((current) => !current)} />}
							error={!!errors.password}
							disabled={saving}
							style={[ui.input, { backgroundColor: palette.input }]}
						/>
						{passwordStrength.label ? <Text style={[ui.passwordHelper, { color: passwordStrength.color }]}>Fortaleza: {passwordStrength.label}</Text> : null}
						{errors.password ? <Text style={[ui.passwordError, { color: palette.danger }]}>{errors.password}</Text> : null}
						<TextInput
							mode="outlined"
							value={repeatPassword}
							onChangeText={setRepeatPassword}
							label="Confirmar nueva contraseña"
							secureTextEntry={!showRepeatPassword}
							right={<TextInput.Icon icon={showRepeatPassword ? 'eye-off' : 'eye'} onPress={() => setShowRepeatPassword((current) => !current)} />}
							error={!!errors.repeatPassword}
							disabled={saving}
							style={[ui.input, { backgroundColor: palette.input }]}
						/>
						{errors.repeatPassword ? <Text style={[ui.passwordError, { color: palette.danger }]}>{errors.repeatPassword}</Text> : null}
					</Card.Content>
					<Card.Actions style={ui.passwordActions}>
						<Button mode="outlined" icon="close-circle-outline" onPress={handleCancelPassword} disabled={saving} style={ui.secondaryButton}>Cancelar</Button>
						<Button mode="contained" icon="content-save-outline" onPress={onChangePassword} disabled={saving || !password || !repeatPassword || hasPasswordErrors} style={ui.primaryButton}>Guardar contraseña</Button>
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
	accentBar: { height: 4, width: '100%' },
	accountTitle: { fontSize: 20, fontWeight: '900', lineHeight: 25 },
	cardBody: { gap: 14 },
	content: { gap: 14, paddingBottom: 18, paddingTop: 16 },
	divider: { marginVertical: 4, opacity: 0.16 },
	eyebrow: {
		fontSize: 11,
		fontWeight: '900',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	formActions: {
		flexDirection: 'row',
		gap: 10,
		justifyContent: 'flex-end',
		marginTop: 14,
	},
	headerCopy: { flex: 1, gap: 4, minWidth: 0 },
	headerRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 2 },
	input: { height: 50, marginBottom: 2 },
	infoLabel: {
		fontSize: 10,
		fontWeight: '900',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	infoValue: { fontSize: 13, fontWeight: '800', marginTop: 5 },
	passwordActions: {
		alignItems: 'stretch',
		gap: 10,
		justifyContent: 'flex-end',
		paddingBottom: 18,
		paddingHorizontal: 16,
		paddingTop: 0,
	},
	passwordCard: {
		width: '100%',
		paddingBottom: 4,
		paddingTop: 0,
	},
	passwordContent: { gap: 12, paddingBottom: 10, paddingTop: 16 },
	passwordError: { fontSize: 12, fontWeight: '700', marginTop: -6 },
	passwordHelper: { fontSize: 12, fontWeight: '800', marginTop: -6 },
	passwordNotice: {
		alignItems: 'center',
		borderRadius: 16,
		borderWidth: 1,
		flexDirection: 'row',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	passwordNoticeText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 },
	primaryButton: { borderRadius: 14 },
	quickActionButton: { borderRadius: 14, flex: 1, minWidth: 150 },
	quickActionContent: { minHeight: 44 },
	quickActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
	readOnlyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
	readOnlyItem: {
		borderRadius: 16,
		borderWidth: 1,
		flexBasis: '47%',
		flexGrow: 1,
		minWidth: 160,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	roleChip: { alignSelf: 'flex-start', borderRadius: 999 },
	roleChipText: { fontSize: 11, fontWeight: '800' },
	rolePanel: {
		alignItems: 'center',
		borderRadius: 16,
		borderWidth: 1,
		flexDirection: 'row',
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	secondaryButton: { borderRadius: 14 },
	securityHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
	securityIconWrap: {
		alignItems: 'center',
		borderRadius: 18,
		height: 48,
		justifyContent: 'center',
		width: 48,
	},
	securitySubtitle: { fontSize: 13, lineHeight: 18 },
	securityTitle: { fontSize: 20, fontWeight: '900', lineHeight: 24, marginBottom: 0 },
	sectionLabel: {
		fontSize: 11,
		fontWeight: '900',
		letterSpacing: 0.5,
		marginBottom: 6,
		textTransform: 'uppercase',
	},
};

export default memo(UserDataCard);
