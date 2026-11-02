import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';

const McpSettingsLinkCard = ({ styles: profileStyles, accentColor, onPress }) => {
	const theme = useTheme();
	const accent = accentColor || (theme.dark ? '#fbbf24' : '#f59e0b');

	const palette = {
		cardBorder: theme.dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
		copy: theme.dark ? '#cbd5e1' : '#475569',
		iconBg: theme.dark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.10)',
		label: theme.dark ? '#94a3b8' : '#64748b',
		title: theme.dark ? '#f8fafc' : '#0f172a',
	};

	return (
		<Card elevation={0} style={[profileStyles?.cards, ui.card, { borderColor: palette.cardBorder }]} testID="mcp-settings-access-card">
			<Card.Content style={ui.content}>
				<View style={ui.header}>
					<View style={[ui.iconWrap, { backgroundColor: palette.iconBg }]}>
						<MaterialCommunityIcons color={accent} name="key-chain-variant" size={24} />
					</View>
					<View style={ui.headerCopy}>
						<Text style={[ui.eyebrow, { color: palette.label }]}>Integraciones seguras</Text>
						<Text style={[ui.title, { color: palette.title }]}>Tokens MCP de VIDKAR</Text>
					</View>
				</View>
				<Text style={[ui.description, { color: palette.copy }]}>
					Administra tus tokens autorizados y el acceso de Siri a herramientas desde un panel dedicado.
				</Text>
				<Button
					icon="arrow-right"
					mode="contained-tonal"
					onPress={onPress}
					style={ui.button}
					contentStyle={ui.buttonContent}
				>
					Administrar tokens MCP
				</Button>
			</Card.Content>
		</Card>
	);
};

const ui = StyleSheet.create({
	button: {
		alignSelf: 'stretch',
		borderRadius: 14,
	},
	buttonContent: {
		flexDirection: 'row-reverse',
		minHeight: 44,
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
	description: {
		fontSize: 12.5,
		lineHeight: 18,
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
	title: {
		fontSize: 18,
		fontWeight: '900',
		letterSpacing: -0.2,
	},
});

export default McpSettingsLinkCard;
