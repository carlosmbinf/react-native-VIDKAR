import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Meteor from '@meteorrn/core';
import { router } from 'expo-router';
import { clearMCPConfiguration } from '../../../services/mcp/mcpClient';
import { memo, useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Chip, Divider, HelperText, Snackbar, Switch, Text, TextInput, useTheme } from 'react-native-paper';

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

const getUserEmail = (user) => {
	const primaryEmail = user?.emails?.find?.((email) => typeof email?.address === 'string' && email.address.trim())?.address;
	const googleEmail = user?.services?.google?.email;

	return String(primaryEmail || googleEmail || '').trim();
};

const UserDataCard = ({ item, styles, edit, setEdit, accentColor: customAccent }) => {
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

	const roleIsAdmin = item?.profile?.role === 'admin';
	const baseAccent = customAccent || (theme.dark ? '#60a5fa' : '#2563eb');

	const palette = {
		accent: baseAccent,
		accentSoft: theme.dark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(37, 99, 235, 0.08)',
		badgeBg: roleIsAdmin
			? (theme.dark ? 'rgba(168, 85, 247, 0.22)' : 'rgba(126, 34, 206, 0.12)')
			: (theme.dark ? 'rgba(59, 130, 246, 0.20)' : 'rgba(37, 99, 235, 0.10)'),
		badgeText: roleIsAdmin ? (theme.dark ? '#c084fc' : '#7e22ce') : (theme.dark ? '#93c5fd' : '#1d4ed8'),
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		danger: theme.dark ? '#f87171' : '#dc2626',
		dangerBg: theme.dark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.08)',
		input: theme.dark ? 'rgba(15, 23, 42, 0.74)' : 'rgba(255, 255, 255, 0.96)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		tileBg: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		tileBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	useEffect(() => {
		if (edit && item) {
			setForm({ username: item?.username || '', email: getUserEmail(item) });
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
		const changedEmail = form.email && form.email !== getUserEmail(item);
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
			if (form.email && form.email !== getUserEmail(item)) {
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
				clearMCPConfiguration().finally(() => {
					Meteor.logout(() => router.replace('/(auth)/Loguin'));
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
			return { label: '', color: undefined, score: 0 };
		}
		let score = 0;
		if (password.length >= 8) score += 1;
		if (/[A-Z]/.test(password)) score += 1;
		if (/[a-z]/.test(password)) score += 1;
		if (/\d/.test(password)) score += 1;
		if (/[^A-Za-z0-9]/.test(password)) score += 1;
		if (score <= 2) return { label: 'Débil', color: '#ef4444', score: 1 };
		if (score <= 4) return { label: 'Media', color: '#f59e0b', score: 2 };
		return { label: 'Fuerte', color: '#22c55e', score: 3 };
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

	const resolvedEmail = getUserEmail(item);
	const changed = {
		username: !!item && form.username !== item?.username && form.username !== '',
		email: !!item && form.email !== resolvedEmail && form.email !== '',
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
			<Card elevation={0} style={[styles.cards, ui.card, { borderColor: palette.cardBorder }]} testID="user-data-card">
				<Card.Content style={ui.content}>
					{/* Header Row */}
					<View style={ui.headerRow}>
						<Avatar.Text
							size={56}
							label={getInitials(item?.username || item?.profile?.firstName || 'U')}
							style={{ backgroundColor: hashColor(item?.username || item?._id || 'U') }}
							labelStyle={ui.avatarText}
						/>
						<View style={ui.headerCopy}>
							<View style={ui.eyebrowRow}>
								<Text style={[ui.eyebrow, { color: palette.label }]}>Cuenta de acceso</Text>
								<Chip
									compact
									icon={roleIsAdmin ? 'shield-crown' : 'account-check'}
									style={[ui.roleChip, { backgroundColor: palette.badgeBg }]}
									textStyle={[ui.roleChipText, { color: palette.badgeText }]}
								>
									{item?.profile?.role || 'N/R'}
								</Chip>
							</View>
							<Text style={[ui.accountTitle, { color: palette.title }]} numberOfLines={1}>
								{item?.username || 'Usuario'}
							</Text>
						</View>
					</View>

					<Divider style={ui.divider} />

					{edit ? (
						<View style={ui.editContainer}>
							<Text style={[ui.sectionLabel, { color: palette.label }]}>Identidad de usuario</Text>
							<TextInput
								mode="outlined"
								value={form.username}
								onFocus={() => setFocus('username')}
								onBlur={() => setFocus(null)}
								onChangeText={(value) => setForm((previous) => ({ ...previous, username: value }))}
								label="Nombre de usuario"
								autoCapitalize="none"
								error={!!errors.username}
								disabled={saving}
								outlineColor={changed.username ? palette.accent : undefined}
								activeOutlineColor={palette.accent}
								right={changed.username ? <TextInput.Icon icon="circle-edit-outline" forceTextInputFocus={false} /> : undefined}
								style={[ui.input, { backgroundColor: palette.input }]}
							/>
							<HelperText type={errors.username ? 'error' : 'info'} visible={focus === 'username' || !!errors.username} style={ui.helper}>
								{errors.username || 'Mínimo 3 caracteres alfanuméricos.'}
							</HelperText>

							<Text style={[ui.sectionLabel, { color: palette.label, marginTop: 8 }]}>Correo de contacto</Text>
							{Meteor.user()?.profile?.role === 'admin' ? (
								<>
									<TextInput
										mode="outlined"
										value={form.email}
										onFocus={() => setFocus('email')}
										onBlur={() => setFocus(null)}
										onChangeText={(value) => setForm((previous) => ({ ...previous, email: value }))}
										label="Correo electrónico"
										keyboardType="email-address"
										autoCapitalize="none"
										error={!!errors.email}
										disabled={saving}
										outlineColor={changed.email ? palette.accent : undefined}
										activeOutlineColor={palette.accent}
										right={changed.email ? <TextInput.Icon icon="circle-edit-outline" forceTextInputFocus={false} /> : undefined}
										style={[ui.input, { backgroundColor: palette.input }]}
									/>
									<HelperText type={errors.email ? 'error' : 'info'} visible={focus === 'email' || !!errors.email} style={ui.helper}>
										{errors.email || 'Ejemplo: usuario@vidkar.com'}
									</HelperText>
								</>
							) : (
								<View style={[ui.readOnlyItem, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
									<MaterialCommunityIcons name="email-outline" size={18} color={palette.label} />
									<Text style={[ui.infoValue, { color: palette.title, flex: 1 }]}>
										{resolvedEmail || '—'}
									</Text>
								</View>
							)}

							<Text style={[ui.sectionLabel, { color: palette.label, marginTop: 10 }]}>Rol en el sistema</Text>
							<View style={[ui.rolePanel, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
								<View style={ui.roleInfo}>
									<MaterialCommunityIcons name={roleIsAdmin ? 'shield-crown' : 'shield-account'} size={22} color={palette.badgeText} />
									<View>
										<Text style={[ui.roleTitle, { color: palette.title }]}>
											{roleIsAdmin ? 'Administrador' : 'Usuario estándar'}
										</Text>
										<Text style={[ui.roleSubtitle, { color: palette.copy }]}>
											{roleIsAdmin ? 'Acceso a paneles y control' : 'Acceso general al sistema'}
										</Text>
									</View>
								</View>
								{Meteor.user()?.username === 'carlosmbinf' ? (
									<Switch value={item?.profile?.role === 'admin'} onValueChange={onToggleRole} disabled={saving} />
								) : null}
							</View>

							<View style={ui.formActions}>
								<Button mode="outlined" onPress={handleCancelEdit} disabled={saving} icon="close-circle-outline" style={ui.secondaryButton}>
									Cancelar
								</Button>
								<Button mode="contained" onPress={onSaveUserInfo} loading={saving} icon="content-save-outline" disabled={saving || !hasChanges() || hasUserInfoErrors} style={ui.primaryButton}>
									Guardar datos
								</Button>
							</View>
						</View>
					) : (
						<View style={ui.readOnlyGrid}>
							<View style={[ui.readOnlyItem, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
								<View style={ui.tileHeader}>
									<MaterialCommunityIcons name="email-outline" size={16} color={palette.label} />
									<Text style={[ui.infoLabel, { color: palette.label }]}>Correo</Text>
								</View>
								<Text style={[ui.infoValue, { color: palette.title }]} numberOfLines={1}>
									{resolvedEmail || '—'}
								</Text>
							</View>
							{item?.createdAt ? (
								<View style={[ui.readOnlyItem, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
									<View style={ui.tileHeader}>
										<MaterialCommunityIcons name="calendar-clock-outline" size={16} color={palette.label} />
										<Text style={[ui.infoLabel, { color: palette.label }]}>Fecha de alta</Text>
									</View>
									<Text style={[ui.infoValue, { color: palette.title }]} numberOfLines={1}>
										{formatDate(item?.createdAt)}
									</Text>
								</View>
							) : null}
							{Meteor.user()?.username === 'carlosmbinf' ? (
								<View style={[ui.readOnlyItem, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
									<View style={ui.tileHeader}>
										<MaterialCommunityIcons name="key-variant" size={16} color={palette.label} />
										<Text style={[ui.infoLabel, { color: palette.label }]}>Clave VPN</Text>
									</View>
									<Text style={[ui.infoValue, { color: palette.title }]} numberOfLines={1}>
										{item?.passvpn || '—'}
									</Text>
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
				</Card.Content>
			</Card>

			{passwordExpanded ? (
				<Card elevation={0} style={[styles.cards, ui.card, ui.passwordCard, { borderColor: palette.cardBorder }]} testID="password-change-card">
					<Card.Content style={ui.passwordContent}>
						<View style={ui.securityHeader}>
							<View style={[ui.securityIconWrap, { backgroundColor: palette.accentSoft }]}>
								<MaterialCommunityIcons name="lock-reset" size={24} color={palette.accent} />
							</View>
							<View style={ui.headerCopy}>
								<Text style={[ui.eyebrow, { color: palette.label }]}>Seguridad</Text>
								<Text style={[ui.securityTitle, { color: palette.title }]}>Cambiar contraseña</Text>
								<Text style={[ui.securitySubtitle, { color: palette.copy }]}>
									Define una nueva clave de acceso sin alterar los demás datos.
								</Text>
							</View>
						</View>

						<View style={[ui.passwordNotice, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}>
							<MaterialCommunityIcons name="shield-check-outline" size={18} color={palette.accent} />
							<Text style={[ui.passwordNoticeText, { color: palette.copy }]}>
								Mínimo 8 caracteres, con mayúscula, minúscula y número.
							</Text>
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
							outlineColor={palette.tileBorder}
							activeOutlineColor={palette.accent}
							style={[ui.input, { backgroundColor: palette.input }]}
						/>

						{passwordStrength.label ? (
							<View style={ui.strengthMeter}>
								<View style={ui.strengthBars}>
									<View style={[ui.strengthBar, { backgroundColor: passwordStrength.score >= 1 ? passwordStrength.color : palette.tileBorder }]} />
									<View style={[ui.strengthBar, { backgroundColor: passwordStrength.score >= 2 ? passwordStrength.color : palette.tileBorder }]} />
									<View style={[ui.strengthBar, { backgroundColor: passwordStrength.score >= 3 ? passwordStrength.color : palette.tileBorder }]} />
								</View>
								<Text style={[ui.passwordHelper, { color: passwordStrength.color }]}>
									Seguridad: {passwordStrength.label}
								</Text>
							</View>
						) : null}

						{errors.password ? <Text style={[ui.passwordError, { color: palette.danger }]}>{errors.password}</Text> : null}

						<TextInput
							mode="outlined"
							value={repeatPassword}
							onChangeText={setRepeatPassword}
							label="Confirmar contraseña"
							secureTextEntry={!showRepeatPassword}
							right={<TextInput.Icon icon={showRepeatPassword ? 'eye-off' : 'eye'} onPress={() => setShowRepeatPassword((current) => !current)} />}
							error={!!errors.repeatPassword}
							disabled={saving}
							outlineColor={palette.tileBorder}
							activeOutlineColor={palette.accent}
							style={[ui.input, { backgroundColor: palette.input }]}
						/>
						{errors.repeatPassword ? <Text style={[ui.passwordError, { color: palette.danger }]}>{errors.repeatPassword}</Text> : null}

						<View style={ui.passwordActions}>
							<Button mode="outlined" icon="close-circle-outline" onPress={handleCancelPassword} disabled={saving} style={ui.secondaryButton}>
								Cancelar
							</Button>
							<Button
								mode="contained"
								icon="content-save-outline"
								onPress={onChangePassword}
								disabled={saving || !password || !repeatPassword || hasPasswordErrors}
								style={ui.primaryButton}
							>
								Guardar clave
							</Button>
						</View>
					</Card.Content>
				</Card>
			) : null}

			<Snackbar
				visible={feedback.visible}
				onDismiss={() => setFeedback((previous) => ({ ...previous, visible: false }))}
				duration={3000}
				style={feedback.type === 'error' ? { backgroundColor: '#dc2626' } : feedback.type === 'success' ? { backgroundColor: '#16a34a' } : undefined}
			>
				{feedback.message}
			</Snackbar>
		</>
	);
};

const ui = StyleSheet.create({
	accountTitle: {
		fontSize: 20,
		fontWeight: '900',
		letterSpacing: -0.3,
		lineHeight: 25,
	},
	avatarText: {
		fontSize: 20,
		fontWeight: '800',
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
	divider: {
		marginVertical: 2,
		opacity: 0.14,
	},
	editContainer: {
		gap: 10,
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	eyebrowRow: {
		alignItems: 'center',
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 4,
		justifyContent: 'space-between',
		width: '100%',
	},
	formActions: {
		flexDirection: 'row',
		gap: 10,
		justifyContent: 'flex-end',
		marginTop: 8,
	},
	headerCopy: {
		flex: 1,
		gap: 3,
		minWidth: 0,
	},
	headerRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 14,
	},
	helper: {
		fontSize: 11.5,
		marginTop: -4,
		paddingHorizontal: 2,
	},
	infoLabel: {
		fontSize: 10.5,
		fontWeight: '800',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	infoValue: {
		fontSize: 14,
		fontWeight: '700',
	},
	input: {
		borderRadius: 12,
		height: 48,
	},
	passwordActions: {
		flexDirection: 'row',
		gap: 10,
		justifyContent: 'flex-end',
		marginTop: 6,
	},
	passwordCard: {
		marginTop: 12,
	},
	passwordContent: {
		gap: 12,
		paddingHorizontal: 16,
		paddingVertical: 18,
	},
	passwordError: {
		fontSize: 12,
		fontWeight: '700',
		marginTop: -4,
	},
	passwordHelper: {
		fontSize: 11.5,
		fontWeight: '800',
	},
	passwordNotice: {
		alignItems: 'center',
		borderRadius: 14,
		borderWidth: 1,
		flexDirection: 'row',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	passwordNoticeText: {
		flex: 1,
		fontSize: 12,
		fontWeight: '600',
		lineHeight: 17,
	},
	primaryButton: {
		borderRadius: 14,
	},
	quickActionButton: {
		borderRadius: 14,
		flex: 1,
		minWidth: 140,
	},
	quickActionContent: {
		minHeight: 44,
	},
	quickActionsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginTop: 4,
	},
	readOnlyGrid: {
		gap: 8,
	},
	readOnlyItem: {
		alignItems: 'center',
		borderRadius: 14,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	roleChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	roleChipText: {
		fontSize: 10.5,
		fontWeight: '800',
	},
	roleInfo: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 10,
	},
	rolePanel: {
		alignItems: 'center',
		borderRadius: 14,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	roleSubtitle: {
		fontSize: 11.5,
		fontWeight: '500',
	},
	roleTitle: {
		fontSize: 13.5,
		fontWeight: '800',
	},
	secondaryButton: {
		borderRadius: 14,
	},
	sectionLabel: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	securityHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
	},
	securityIconWrap: {
		alignItems: 'center',
		borderRadius: 16,
		height: 46,
		justifyContent: 'center',
		width: 46,
	},
	securitySubtitle: {
		fontSize: 12.5,
		lineHeight: 17,
	},
	securityTitle: {
		fontSize: 18,
		fontWeight: '900',
	},
	strengthBars: {
		flex: 1,
		flexDirection: 'row',
		gap: 6,
	},
	strengthBar: {
		borderRadius: 999,
		flex: 1,
		height: 4,
	},
	strengthMeter: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
		marginTop: -2,
	},
	tileHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 6,
	},
});

export default memo(UserDataCard);
