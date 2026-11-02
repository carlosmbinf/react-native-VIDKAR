import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const COLOR_STOPS = [
	{ at: 0, color: '#34d399' },
	{ at: 0.45, color: '#a3e635' },
	{ at: 0.7, color: '#facc15' },
	{ at: 0.85, color: '#fb923c' },
	{ at: 1, color: '#ef4444' },
];

const hexToRgb = (hex) => hex.match(/[\da-f]{2}/gi).map((part) => Number.parseInt(part, 16));
const rgbToHex = (rgb) => `#${rgb.map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`;

const colorAt = (position) => {
	const nextIndex = COLOR_STOPS.findIndex((stop) => stop.at >= position);
	if (nextIndex <= 0) return COLOR_STOPS[0].color;

	const start = COLOR_STOPS[nextIndex - 1];
	const end = COLOR_STOPS[nextIndex];
	const amount = (position - start.at) / (end.at - start.at);
	const startRgb = hexToRgb(start.color);
	const endRgb = hexToRgb(end.color);

	return rgbToHex(startRgb.map((channel, index) => channel + (endRgb[index] - channel) * amount));
};

const ConsumptionProgressBar = ({ label, progress, trackColor, textColor }) => {
	const normalizedProgress = Math.max(0, Math.min(1, progress));
	const gradientColors = Array.from({ length: 9 }, (_, index) =>
		colorAt((normalizedProgress * index) / 8),
	);

	return (
		<View
			accessibilityLabel={`${label}, ${Math.round(normalizedProgress * 100)}%`}
			accessibilityRole="progressbar"
			accessibilityValue={{ min: 0, max: 100, now: Math.round(normalizedProgress * 100) }}
			style={[styles.track, { backgroundColor: trackColor }]}
		>
			{normalizedProgress > 0 ? (
				<View style={[styles.fill, { width: `${normalizedProgress * 100}%` }]}>
					<LinearGradient
						colors={gradientColors}
						end={{ x: 1, y: 0 }}
						start={{ x: 0, y: 0 }}
						style={StyleSheet.absoluteFill}
					/>
				</View>
			) : null}
			<View pointerEvents="none" style={styles.labelRow}>
				<Text numberOfLines={1} style={[styles.label, { color: textColor }]}>
					{label}
				</Text>
				<Text style={[styles.percent, { color: textColor }]}>
					{Math.round(normalizedProgress * 100)}%
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	fill: {
		borderRadius: 999,
		bottom: 0,
		left: 0,
		overflow: 'hidden',
		position: 'absolute',
		top: 0,
	},
	label: {
		flex: 1,
		fontSize: 11,
		fontWeight: '700',
	},
	labelRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		justifyContent: 'space-between',
		paddingHorizontal: 12,
	},
	percent: {
		fontSize: 11,
		fontVariant: ['tabular-nums'],
		fontWeight: '900',
	},
	track: {
		borderRadius: 999,
		height: 36,
		justifyContent: 'center',
		overflow: 'hidden',
		position: 'relative',
	},
});

export default ConsumptionProgressBar;
