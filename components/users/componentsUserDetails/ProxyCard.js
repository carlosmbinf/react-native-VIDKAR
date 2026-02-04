import React, { memo, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import Meteor from '@meteorrn/core';

import ProxyCardUser from './ProxyCardUser';
import ProxyCardAdmin from './ProxyCardAdmin';

const ProxyCard = ({
  item,
  styles,
  accentColor,
  // admin-only props
  precioslist,
  handleReiniciarConsumo,
  addVenta,
}) => {
  if (!item) return null;

  const isAdmin = useMemo(() => Meteor.user()?.profile?.role === 'admin', []);
  const [editMode, setEditMode] = useState(false);

  const canEdit = isAdmin;
  const showAdmin = canEdit && editMode;

  return (
    <View style={ui.wrapper} testID="proxy-card-wrapper">
      {showAdmin ? (
        <ProxyCardAdmin
          item={item}
          styles={styles}
          precioslist={precioslist}
          handleReiniciarConsumo={handleReiniciarConsumo}
          addVenta={addVenta}
          accentColor={accentColor}
          canEdit={canEdit}
          onRequestView={() => setEditMode(false)}
        />
      ) : (
        <ProxyCardUser
          item={item}
          styles={styles}
          accentColor={accentColor}
          canEdit={canEdit}
          onRequestEdit={() => setEditMode(true)}
        />
      )}
    </View>
  );
};

const ui = StyleSheet.create({
  wrapper: { width: '100%' },
  toggleRow: { marginTop: 10, alignItems: 'center' },
});

export default memo(ProxyCard);
