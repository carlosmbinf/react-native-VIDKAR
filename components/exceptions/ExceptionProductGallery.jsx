import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

export default function ExceptionProductGallery({ images }) {
  const theme = useTheme();
  const [failedIds, setFailedIds] = useState({});
  if (!images.length) {
    return <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>Sin imagen</Text>
    </View>;
  }
  return <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.gallery}>
    {images.map((image, index) => <View key={image.id} style={[styles.imageFrame, { backgroundColor: theme.colors.surfaceVariant }]}>
      {failedIds[image.id]
        ? <Text style={{ color: theme.colors.onSurfaceVariant }}>Imagen no disponible</Text>
        : <Image accessibilityLabel={`Imagen ${index + 1} de ${images.length}`} resizeMode="contain"
          source={{ uri: image.url }} style={styles.image}
          onError={() => setFailedIds((current) => ({ ...current, [image.id]: true }))} />}
    </View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  gallery: { gap: 8 },
  imageFrame: { width: 180, height: 180, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  placeholder: { height: 180, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
