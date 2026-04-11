import { memo } from 'react';
import { View } from 'react-native';
import { Avatar, Card, Chip, Divider, HelperText, Text, Title } from 'react-native-paper';

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
	if (!item) {
		return null;
	}

	const profile = item.profile || {};
	const { firstGiven, secondGiven, lastName, fullName } = parseProfileNames(profile);
	const completeness = computeCompleteness({ firstGiven, lastName });
	const accentColor = hashColor(fullName || item._id || 'U');

	return (
		<Card elevation={12} style={[styles.cards, { overflow: 'hidden' }]} testID="personal-data-card">
			<View style={{ height: 4, backgroundColor: accentColor, width: '100%' }} />
			<Card.Content style={{ paddingTop: 10 }}>
				<View style={[styles.element, { paddingBottom: 4 }]}> 
					<View style={{ flexDirection: 'row', alignItems: 'center' }}>
						{item.picture ? (
							<View style={{ marginRight: 12 }}>
								<Avatar.Image size={50} source={{ uri: item.picture }} />
							</View>
						) : (
							<Avatar.Text size={52} label={getInitials(fullName || item.username)} style={{ backgroundColor: accentColor, marginRight: 12 }} />
						)}
						<View style={{ flex: 1, alignItems: 'flex-start' }}>
							<Title style={[styles.title, { marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start' }]} numberOfLines={1} testID="pd-fullname">
								{fullName || 'Nombre no definido'}
							</Title>
							<Chip
								compact
								icon={completeness.percent === 100 ? 'check-circle' : 'progress-alert'}
								selectedColor={completeness.percent === 100 ? '#2E7D32' : '#FF8F00'}
								style={{
									backgroundColor: completeness.percent === 100 ? '#E8F5E9' : '#FFF8E1',
									marginBottom: 4,
								}}
								textStyle={{ fontSize: 11 }}
								testID="pd-completeness"
							>
								{completeness.percent === 100 ? 'Completo' : `Incompleto (${completeness.percent}%)`}
							</Chip>
						</View>
					</View>
				</View>

				<Divider style={{ marginVertical: 8 }} />

				<View style={{ gap: 6 }}>
					<View style={{ flexDirection: 'row' }}>
						<Text style={{ width: 100, fontSize: 13, opacity: 0.6 }}>Nombre</Text>
						<Text style={[styles.data, { flex: 1 }]}>{firstGiven || '—'}</Text>
					</View>
					<View style={{ flexDirection: 'row' }}>
						<Text style={{ width: 100, fontSize: 13, opacity: 0.6 }}>Segundo</Text>
						<Text style={[styles.data, { flex: 1 }]}>{secondGiven || '—'}</Text>
					</View>
					<View style={{ flexDirection: 'row' }}>
						<Text style={{ width: 100, fontSize: 13, opacity: 0.6 }}>Apellidos</Text>
						<Text style={[styles.data, { flex: 1 }]}>{lastName || '—'}</Text>
					</View>
					<View style={{ flexDirection: 'row' }}>
						<Text style={{ width: 100, fontSize: 13, opacity: 0.6 }}>Móvil</Text>
						<Text style={[styles.data, { flex: 1 }]}>{item.movil || item.mobile || item.phone || '—'}</Text>
					</View>
				</View>

				{completeness.percent < 100 ? (
					<HelperText type="info" visible style={{ marginTop: 8, fontSize: 11, opacity: 0.75 }}>
						Completa los campos faltantes: {completeness.missing.join(', ')}
					</HelperText>
				) : null}
			</Card.Content>
		</Card>
	);
};

export default memo(PersonalDataCard);
