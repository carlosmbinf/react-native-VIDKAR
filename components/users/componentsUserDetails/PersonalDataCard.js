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
	const accentColor = hashColor(fullName || item._id || 'U');
	const palette = {
		label: theme.dark ? '#94a3b8' : '#64748b',
		muted: theme.dark ? '#cbd5e1' : '#475569',
		panel: theme.dark ? 'rgba(30, 41, 59, 0.72)' : 'rgba(248, 250, 252, 0.96)',
		panelBorder: theme.dark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.08)',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};
	const completionOk = completeness.percent === 100;

	return (
		<Card elevation={4} style={styles.cards} testID="personal-data-card">
			<View style={{ height: 4, backgroundColor: accentColor, width: '100%' }} />
			<Card.Content style={ui.content}>
				<View style={ui.headerRow}>
					<View style={ui.avatarFrame}>
						{item.picture ? (
							<Avatar.Image size={58} source={{ uri: item.picture }} />
						) : (
							<Avatar.Text size={58} label={getInitials(fullName || item.username)} style={{ backgroundColor: accentColor }} />
						)}
					</View>
					<View style={ui.headerCopy}>
						<Text style={[ui.eyebrow, { color: palette.label }]}>Identidad personal</Text>
						<Text style={[ui.name, { color: palette.title }]} numberOfLines={1} testID="pd-fullname">
							{fullName || 'Nombre no definido'}
						</Text>
						<Text style={[ui.username, { color: palette.muted }]} numberOfLines={1}>
							@{item.username || 'usuario'}
						</Text>
					</View>
					<Chip
						compact
						icon={completionOk ? 'check-circle' : 'progress-alert'}
						style={[
							ui.completenessChip,
							{ backgroundColor: completionOk ? 'rgba(34, 197, 94, 0.14)' : 'rgba(245, 158, 11, 0.16)' },
						]}
						textStyle={[ui.completenessChipText, { color: completionOk ? '#16a34a' : '#d97706' }]}
						testID="pd-completeness"
					>
						{completionOk ? 'Completo' : `${completeness.percent}%`}
					</Chip>
				</View>

				<View style={ui.infoGrid}>
					<View style={[ui.infoItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<Text style={[ui.infoLabel, { color: palette.label }]}>Nombre</Text>
						<Text style={[ui.infoValue, { color: palette.title }]}>{firstGiven || '—'}</Text>
					</View>
					<View style={[ui.infoItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<Text style={[ui.infoLabel, { color: palette.label }]}>Segundo</Text>
						<Text style={[ui.infoValue, { color: palette.title }]}>{secondGiven || '—'}</Text>
					</View>
					<View style={[ui.infoItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<Text style={[ui.infoLabel, { color: palette.label }]}>Apellidos</Text>
						<Text style={[ui.infoValue, { color: palette.title }]}>{lastName || '—'}</Text>
					</View>
					<View style={[ui.infoItem, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
						<Text style={[ui.infoLabel, { color: palette.label }]}>Móvil</Text>
						<Text style={[ui.infoValue, { color: palette.title }]}>{item.movil || item.mobile || item.phone || '—'}</Text>
					</View>
				</View>

				{completeness.percent < 100 ? (
					<HelperText type="info" visible style={ui.helper}>
						Completa los campos faltantes: {completeness.missing.join(', ')}
					</HelperText>
				) : null}
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	avatarFrame: {
		borderRadius: 22,
		overflow: 'hidden',
	},
	completenessChip: {
		alignSelf: 'flex-start',
		borderRadius: 999,
	},
	completenessChipText: {
		fontSize: 11,
		fontWeight: '800',
	},
	content: {
		gap: 16,
		paddingBottom: 18,
		paddingTop: 16,
	},
	eyebrow: {
		fontSize: 11,
		fontWeight: '900',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	headerCopy: {
		flex: 1,
		gap: 3,
		minWidth: 0,
	},
	headerRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
	},
	helper: {
		fontSize: 11,
		marginTop: -4,
		opacity: 0.75,
	},
	infoGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	infoItem: {
		borderRadius: 16,
		borderWidth: 1,
		flexBasis: '47%',
		flexGrow: 1,
		gap: 4,
		minWidth: 128,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	infoLabel: {
		fontSize: 10,
		fontWeight: '900',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	infoValue: {
		fontSize: 14,
		fontWeight: '800',
	},
	name: {
		fontSize: 20,
		fontWeight: '900',
		lineHeight: 25,
	},
	username: {
		fontSize: 13,
		fontWeight: '700',
	},
});

export default memo(PersonalDataCard);
