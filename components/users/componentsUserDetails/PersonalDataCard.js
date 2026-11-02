import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Card, Chip, HelperText, Text, useTheme } from 'react-native-paper';

const parseProfileNames = (profile = {}) => {
	const rawFirst = (profile.firstName || '').trim();
	const lastName = (profile.lastName || '').trim();
	const tokens = rawFirst.split(/\s+/).filter(Boolean);
	const firstGiven = tokens[0] || '';
	const secondGiven = tokens[1] || profile.middleName || '';
	const fullName = [firstGiven, secondGiven, lastName].filter(Boolean).join(' ');
	return { firstGiven, secondGiven, lastName, fullName };
};

const getInitials = (full = '') =>
	full
		.split(/\s+/)
		.map((word) => word[0])
		.join('')
		.slice(0, 2)
		.toUpperCase() || 'U';

const hashColor = (seed = '') => {
	let hash = 0;
	for (let index = 0; index < seed.length; index += 1) {
		hash = seed.charCodeAt(index) + ((hash << 5) - hash);
	}
	const color = (hash & 0x00ffffff).toString(16).toUpperCase();
	return `#${'00000'.substring(0, 6 - color.length)}${color}`;
};

const computeCompleteness = ({ firstGiven, lastName }) => {
	const present = [firstGiven, lastName].filter(Boolean).length;
	return {
		percent: Math.round((present / 2) * 100),
		missing: [!firstGiven && 'primer nombre', !lastName && 'apellidos'].filter(Boolean),
	};
};

const PersonalDataCard = ({ item, styles }) => {
	const theme = useTheme();
	if (!item) {
		return null;
	}

	const profile = item.profile || {};
	const { firstGiven, secondGiven, lastName, fullName } = parseProfileNames(profile);
	const completeness = computeCompleteness({ firstGiven, lastName });
	const accentColor = hashColor(fullName || item.username || item._id || 'U');
	const completionOk = completeness.percent === 100;

	const palette = {
		accent: accentColor,
		accentSoft: theme.dark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(37, 99, 235, 0.08)',
		badgeBg: completionOk
			? (theme.dark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(34, 197, 94, 0.12)')
			: (theme.dark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(245, 158, 11, 0.12)'),
		badgeText: completionOk ? (theme.dark ? '#4ade80' : '#15803d') : (theme.dark ? '#fbbf24' : '#b45309'),
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		muted: theme.dark ? '#cbd5e1' : '#64748b',
		tileBg: theme.dark ? 'rgba(30, 41, 59, 0.55)' : 'rgba(241, 245, 249, 0.75)',
		tileBorder: theme.dark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(15, 23, 42, 0.05)',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	const items = [
		{ icon: 'account-outline', label: 'Primer nombre', value: firstGiven || '—' },
		{ icon: 'account-multiple-outline', label: 'Segundo nombre', value: secondGiven || '—' },
		{ icon: 'badge-account-outline', label: 'Apellidos', value: lastName || '—' },
		{ icon: 'cellphone', label: 'Móvil', value: item.movil || item.mobile || item.phone || '—' },
	];

	return (
		<Card elevation={0} style={[styles.cards, ui.card, { borderColor: palette.cardBorder }]} testID="personal-data-card">
			<Card.Content style={ui.content}>
				{/* Header Section */}
				<View style={ui.heroRow}>
					<View style={[ui.avatarHalo, { borderColor: accentColor }]}>
						{item.picture ? (
							<Avatar.Image size={62} source={{ uri: item.picture }} />
						) : (
							<Avatar.Text
								size={62}
								label={getInitials(fullName || item.username)}
								style={{ backgroundColor: accentColor }}
								labelStyle={ui.avatarText}
							/>
						)}
					</View>
					<View style={ui.heroCopy}>
						<View style={ui.eyebrowRow}>
							<Text style={[ui.eyebrow, { color: palette.label }]}>Identidad personal</Text>
							<Chip
								compact
								icon={completionOk ? 'check-circle' : 'alert-circle-outline'}
								style={[ui.completenessChip, { backgroundColor: palette.badgeBg }]}
								textStyle={[ui.completenessChipText, { color: palette.badgeText }]}
								testID="pd-completeness"
							>
								{completionOk ? '100% Completo' : `${completeness.percent}%`}
							</Chip>
						</View>
						<Text style={[ui.name, { color: palette.title }]} numberOfLines={1} testID="pd-fullname">
							{fullName || 'Nombre no definido'}
						</Text>
						<View style={ui.usernameBadge}>
							<MaterialCommunityIcons name="at" size={14} color={palette.muted} />
							<Text style={[ui.username, { color: palette.muted }]} numberOfLines={1}>
								{item.username || 'usuario'}
							</Text>
						</View>
					</View>
				</View>

				{/* 2x2 Info Grid */}
				<View style={ui.infoGrid}>
					{items.map((row) => (
						<View
							key={row.label}
							style={[ui.infoTile, { backgroundColor: palette.tileBg, borderColor: palette.tileBorder }]}
						>
							<View style={ui.tileHeader}>
								<MaterialCommunityIcons name={row.icon} size={15} color={palette.label} />
								<Text style={[ui.infoLabel, { color: palette.label }]}>{row.label}</Text>
							</View>
							<Text style={[ui.infoValue, { color: palette.title }]} numberOfLines={1}>
								{row.value}
							</Text>
						</View>
					))}
				</View>

				{completeness.percent < 100 ? (
					<View style={[ui.warningNotice, { backgroundColor: palette.badgeBg }]}>
						<MaterialCommunityIcons name="information-outline" size={16} color={palette.badgeText} />
						<HelperText type="info" visible style={[ui.helper, { color: palette.badgeText }]}>
							Falta completar: {completeness.missing.join(', ')}
						</HelperText>
					</View>
				) : null}
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	avatarHalo: {
		alignItems: 'center',
		borderRadius: 36,
		borderWidth: 2.5,
		justifyContent: 'center',
		padding: 2,
	},
	avatarText: {
		fontSize: 22,
		fontWeight: '800',
	},
	card: {
		borderWidth: 1,
		overflow: 'hidden',
	},
	completenessChip: {
		borderRadius: 999,
		justifyContent: 'center',
		minHeight: 36,
	},
	completenessChipText: {
		fontSize: 10.5,
		fontWeight: '800',
	},
	content: {
		gap: 16,
		paddingHorizontal: 16,
		paddingVertical: 18,
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
	helper: {
		fontSize: 11.5,
		fontWeight: '600',
		margin: 0,
		padding: 0,
	},
	heroCopy: {
		flex: 1,
		gap: 3,
		minWidth: 0,
	},
	heroRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 14,
	},
	infoGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	infoLabel: {
		fontSize: 10.5,
		fontWeight: '800',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
	infoTile: {
		borderRadius: 14,
		borderWidth: 1,
		flexBasis: '47%',
		flexGrow: 1,
		gap: 4,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	infoValue: {
		fontSize: 14,
		fontWeight: '700',
	},
	name: {
		fontSize: 19,
		fontWeight: '900',
		letterSpacing: -0.3,
		lineHeight: 24,
	},
	tileHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 5,
	},
	username: {
		fontSize: 13,
		fontWeight: '700',
	},
	usernameBadge: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 2,
	},
	warningNotice: {
		alignItems: 'center',
		borderRadius: 12,
		flexDirection: 'row',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
});

export default memo(PersonalDataCard);
