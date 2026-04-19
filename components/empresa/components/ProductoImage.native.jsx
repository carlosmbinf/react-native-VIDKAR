import MeteorBase from "@meteorrn/core";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import { createEmpresaPalette } from "../styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const ProductoImage = ({ productoId, size = 104, fill = false, style = null }) => {
  const theme = useTheme();
  const palette = createEmpresaPalette(theme);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setImageUrl("");

    if (!productoId) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    Meteor.call("findImgbyProduct", productoId, (error, result) => {
      if (!mounted) {
        return;
      }

      if (!error && typeof result === "string") {
        setImageUrl(result);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [productoId]);

  if (loading) {
    return (
      <View
        style={[
          fill ? styles.fillLayer : styles.placeholder,
          !fill ? styles.mediaFrame : null,
          fill ? null : { height: size, width: size },
          {
            backgroundColor: palette.cardSoft,
            borderColor: palette.border,
          },
          style,
        ]}
      >
        <ActivityIndicator animating size="small" />
      </View>
    );
  }

  if (!imageUrl) {
    return (
      <View
        style={[
          fill ? styles.fillLayer : styles.placeholder,
          !fill ? styles.mediaFrame : null,
          fill ? null : { height: size, width: size },
          {
            backgroundColor: palette.cardSoft,
            borderColor: palette.border,
          },
          style,
        ]}
      >
        <Text style={{ color: palette.copy }} variant="labelSmall">
          Sin imagen
        </Text>
      </View>
    );
  }

  return (
    <Image
      resizeMode="cover"
      source={{ uri: imageUrl }}
      style={[fill ? styles.fillLayer : styles.image, fill ? null : { height: size, width: size }, style]}
    />
  );
};

const styles = StyleSheet.create({
  fillLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    borderRadius: 16,
  },
  mediaFrame: {
    borderWidth: 1,
  },
  placeholder: {
    alignItems: "center",
    borderRadius: 16,
    justifyContent: "center",
  },
});

export default ProductoImage;