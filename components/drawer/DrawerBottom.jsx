import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Animated, PanResponder, Dimensions, Pressable } from 'react-native';
import Drawer from 'react-native-drawer';
import { Surface, Text, IconButton, useTheme, Divider, Portal } from 'react-native-paper';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DrawerBottom = ({
  open,
  onClose,
  side = 'top', // 'left' | 'right' | 'top' | 'bottom'
  width,
  openDrawerOffset = 0.2,
  elevation = 4,
  title,
  actions = [],
  showHeader = !!title || actions.length > 0,
  overlayOpacity = 0.45,
  children,
  mainContent = null,
  surfaceStyle,
  headerStyle,
  drawerContainerStyle,
}) => {
  const theme = useTheme();
  const isBottom = side === 'bottom';

  // --- NUEVO: modo bottom sheet ---
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const maxSheetHeight = SCREEN_HEIGHT * 0.85;
  const sheetHeight = Math.min(contentHeight || maxSheetHeight, maxSheetHeight);

  useEffect(() => {
    if (!isBottom) return;
    if (open) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [open, isBottom, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => isBottom && g.dy > 4,
      onPanResponderMove: (_, g) => {
        if (!isBottom) return;
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (!isBottom) return;
        if (g.dy > sheetHeight * 0.25 || g.vy > 1.1) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onClose && onClose());
        } else {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const Header = showHeader ? (
    <>
      <View style={[styles.header, headerStyle]}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.actionsRow}>
          {actions.map((a, i) => (
            <IconButton
              key={i}
              icon={a.icon}
              size={20}
              onPress={a.onPress}
              disabled={a.disabled}
            />
          ))}
          <IconButton icon="close" size={22} onPress={onClose} />
        </View>
      </View>
      <Divider />
    </>
  ) : null;

  if (isBottom) {
    return (
      <Portal>
        {open && (
          <View style={styles.portalContainer} pointerEvents="box-none">
            <Pressable
              style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]}
              onPress={() => onClose && onClose()}
            />
            <Animated.View
              style={[
                styles.bottomSheetWrapper,
                { transform: [{ translateY }], maxHeight: maxSheetHeight },
              ]}
              pointerEvents="auto"
              {...panResponder.panHandlers}
            >
              <Surface
                elevation={elevation}
                style={[
                  styles.bottomSurface,
                  { backgroundColor: theme.colors.background },
                  surfaceStyle,
                  { maxHeight: maxSheetHeight },
                ]}
              >
                {/* Handle */}
                <View style={styles.handleZone}>
                  <View style={[styles.handle, { backgroundColor: theme.colors.outlineVariant || '#ccc' }]} />
                </View>
                {Header}
                <View
                  style={styles.bottomContent}
                  onLayout={(e) => setContentHeight(e.nativeEvent.layout.height + 30)}
                >
                  {children}
                </View>
              </Surface>
            </Animated.View>
          </View>
        )}
      </Portal>
    );
  }

  // --- Lógica original para left/right/top usando react-native-drawer (sin cambios) ---
  const content = (
    <Surface
      elevation={elevation}
      style={[
        styles.surface,
        width ? { width } : null,
        { backgroundColor: theme.colors.background },
        surfaceStyle
      ]}
    >
      {Header}
      <View style={styles.content}>{children}</View>
    </Surface>
  );

  return (
    <Drawer
      open={open}
      side={side}
      type="overlay"
      tapToClose
      acceptTap
      openDrawerOffset={width ? () => Math.max(0, (global?.windowWidth || 0) - width) : openDrawerOffset}
      closedDrawerOffset={0}
      panCloseMask={0.2}
      panOpenMask={0.05}
      elevation={elevation}
      styles={{
        drawer: [styles.drawerBase, drawerContainerStyle],
        main: styles.main
      }}
      tweenHandler={(ratio) => ({
        main: { opacity: (2 - ratio) / 2 },
        drawer: { shadowOpacity: ratio }
      })}
      onClose={onClose}
      content={content}
    >
      <View style={styles.mainWrapper}>
        {mainContent}
        {open && (
          <View
            pointerEvents="auto"
            style={[styles.overlay, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]}
          />
        )}
      </View>
    </Drawer>
  );
};

const styles = StyleSheet.create({
  // Existentes para drawer lateral
  drawerBase: { backgroundColor: 'transparent' },
  main: { backgroundColor: 'transparent' },
  surface: { flex: 1, paddingTop: 4 },
  header: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  content: { paddingHorizontal: 14, paddingVertical: 12, flexGrow: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  mainWrapper: { flex: 1 },

  // NUEVOS estilos bottom sheet
  portalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  bottomSheetWrapper: {
    width: '100%',
  },
  bottomSurface: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 54,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
  bottomContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
  },
});

export default DrawerBottom;
