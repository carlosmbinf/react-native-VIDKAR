import MeteorBase from "@meteorrn/core";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { ActivityIndicator, IconButton, Text, useTheme } from "react-native-paper";

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
  MeteorBase
);

const normalizeImages = (value) => (Array.isArray(value) ? value : [])
  .map((image, index) => {
    const url = typeof image === "string" ? image : image?.url;
    if (typeof url !== "string" || !url.trim()) return null;
    return {
      id: String(typeof image === "object" ? image?.id || image?._id || index : index),
      url: url.trim(),
    };
  })
  .filter(Boolean);

const ProductImageCarousel = ({
  fill = false,
  images: suppliedImages,
  productId,
  resizeMode = "cover",
  showControls = true,
  size = 104,
  style,
}) => {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [remoteImages, setRemoteImages] = useState([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [failedIds, setFailedIds] = useState({});
  const [frameWidth, setFrameWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);
  const images = useMemo(
    () => normalizeImages(suppliedImages || remoteImages),
    [remoteImages, suppliedImages],
  );
  const pageWidth = frameWidth || (fill ? windowWidth : size);
  const frameStyle = fill
    ? [StyleSheet.absoluteFill, styles.frame, style]
    : [styles.frame, { height: size, width: size }, style];

  useEffect(() => {
    if (Array.isArray(suppliedImages)) {
      setRemoteImages(normalizeImages(suppliedImages));
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    setFailedIds({});
    setActiveIndex(0);

    if (!productId) {
      setRemoteImages([]);
      setLoading(false);
      return () => { mounted = false; };
    }

    setLoading(true);
    Meteor.call("comercio.getProductImages", productId, (error, result) => {
      if (!mounted) return;
      if (!error && Array.isArray(result)) {
        const normalized = normalizeImages(result);
        if (normalized.length) {
          setRemoteImages(normalized);
          setLoading(false);
          return;
        }
      }

      Meteor.call("findImgbyProduct", productId, (legacyError, legacyUrl) => {
        if (!mounted) return;
        setRemoteImages(!legacyError && typeof legacyUrl === "string" && legacyUrl
          ? [{ id: `legacy-${productId}`, url: legacyUrl }]
          : []);
        setLoading(false);
      });
    });

    return () => { mounted = false; };
  }, [productId, suppliedImages]);

  useEffect(() => {
    setActiveIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [images.length, pageWidth]);

  const moveTo = (nextIndex) => {
    if (images.length < 2 || !pageWidth) return;
    const normalizedIndex = (nextIndex + images.length) % images.length;
    listRef.current?.scrollToIndex({ index: normalizedIndex, animated: true });
    setActiveIndex(normalizedIndex);
  };

  const renderItem = ({ item, index }) => (
    <View style={[styles.slide, { height: fill ? undefined : size, width: pageWidth }]}>
      {failedIds[item.id] ? (
        <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant || theme.colors.surface }]}>
          <Text style={{ color: theme.colors.onSurfaceVariant }} variant="labelSmall">Imagen no disponible</Text>
        </View>
      ) : (
        <Image
          accessibilityLabel={`Imagen ${index + 1} de ${images.length}`}
          onError={() => setFailedIds((current) => ({ ...current, [item.id]: true }))}
          resizeMode={resizeMode}
          source={{ uri: item.url }}
          style={styles.image}
        />
      )}
    </View>
  );

  return (
    <View
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0 && nextWidth !== frameWidth) setFrameWidth(nextWidth);
      }}
      style={frameStyle}
    >
      {loading ? (
        <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant || theme.colors.surface }]}>
          <ActivityIndicator size="small" />
        </View>
      ) : images.length ? (
        <>
          <FlatList
            data={images}
            decelerationRate="fast"
            getItemLayout={(_data, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
            horizontal
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={(event) => {
              if (!pageWidth) return;
              setActiveIndex(Math.max(0, Math.min(images.length - 1, Math.round(event.nativeEvent.contentOffset.x / pageWidth))));
            }}
            pagingEnabled
            ref={listRef}
            renderItem={renderItem}
            showsHorizontalScrollIndicator={false}
            style={styles.list}
          />
          {images.length > 1 ? (
            <>
              {showControls ? (
                <>
                  <IconButton
                    accessibilityLabel="Imagen anterior"
                    disabled={!pageWidth}
                    icon="chevron-left"
                    onPress={() => moveTo(activeIndex - 1)}
                    size={18}
                    style={[styles.arrow, styles.arrowLeft]}
                  />
                  <IconButton
                    accessibilityLabel="Imagen siguiente"
                    disabled={!pageWidth}
                    icon="chevron-right"
                    onPress={() => moveTo(activeIndex + 1)}
                    size={18}
                    style={[styles.arrow, styles.arrowRight]}
                  />
                </>
              ) : null}
              <View pointerEvents="none" style={styles.counter}>
                <Text style={styles.counterText} variant="labelSmall">{activeIndex + 1} / {images.length}</Text>
              </View>
            </>
          ) : null}
        </>
      ) : (
        <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant || theme.colors.surface }]}>
          <Text style={{ color: theme.colors.onSurfaceVariant }} variant="labelSmall">Sin imagen</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  arrow: {
    position: "absolute",
    top: "50%",
    margin: 0,
    transform: [{ translateY: -18 }],
    backgroundColor: "rgba(15, 23, 42, 0.68)",
  },
  arrowLeft: { left: 4 },
  arrowRight: { right: 4 },
  counter: {
    position: "absolute",
    right: 7,
    bottom: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  counterText: { color: "#ffffff", fontWeight: "700", fontVariant: ["tabular-nums"] },
  frame: { overflow: "hidden", position: "relative" },
  image: { height: "100%", width: "100%" },
  list: { flex: 1 },
  placeholder: { alignItems: "center", flex: 1, justifyContent: "center", width: "100%" },
  slide: { overflow: "hidden" },
});

export default ProductImageCarousel;