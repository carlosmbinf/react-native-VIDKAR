import MeteorBase from '@meteorrn/core';
import React, { useMemo } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { PaperProvider, useTheme } from 'react-native-paper';

import { applyEmpresaAppearance } from '../../services/commerceAppearance';
import { hasEmpresaWebsiteAccess } from '../../services/commerceProvisioning';
import { ComercioWebAppearanceCollection } from '../collections/collections';

const Meteor = /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (MeteorBase);

export default function EmpresaAppearanceProvider({ children }) {
  const baseTheme = useTheme();
  const ownerId = Meteor.useTracker(() => {
    const user = Meteor.user();
    return hasEmpresaWebsiteAccess(user) ? Meteor.userId() : null;
  }, []);
  const settings = Meteor.useTracker(() => {
    if (!ownerId) return null;
    const handle = Meteor.subscribe('comercio.webAppearance', ownerId);
    return handle.ready() ? ComercioWebAppearanceCollection.findOne({ _id: ownerId })?.settings || null : null;
  }, [ownerId]);
  const theme = useMemo(() => applyEmpresaAppearance(baseTheme, settings, Platform.OS), [baseTheme, settings]);
  const appearance = theme.empresaAppearance;

  return <PaperProvider theme={theme}>
    <View style={[styles.screen, { backgroundColor: appearance?.backgroundColor || baseTheme.colors.background }]}>
      {appearance?.images.backgroundImage ? <Image accessibilityIgnoresInvertColors pointerEvents="none" source={{ uri: appearance.images.backgroundImage }} resizeMode="cover" style={styles.background} /> : null}
      {children}
    </View>
  </PaperProvider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  background: { ...StyleSheet.absoluteFillObject, opacity: 0.14 },
});
