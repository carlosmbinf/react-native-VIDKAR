import { Image, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

// Decoración de los bloques existentes, sin añadir espacio ni interceptar gestos.
export default function EmpresaBrandImage({ slot = 'cover', radius = undefined }) {
  const theme = useTheme();
  const appearance = theme.empresaAppearance;
  const uri = appearance?.images[slot];
  if (!uri) return null;
  return <Image accessibilityIgnoresInvertColors pointerEvents="none" source={{ uri }} resizeMode="cover" style={[StyleSheet.absoluteFillObject, { opacity: 0.14, borderRadius: radius ?? appearance.styles.cardRadius }]} />;
}
