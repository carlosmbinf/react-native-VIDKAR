import React, { memo, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import Meteor from '@meteorrn/core';

import VpnCardUser from './VpnCardUser';
import VpnCardAdmin from './VpnCardAdmin';

const VpnCard = ({
  item,
  styles,
  accentColor,
  // admin-only props
  preciosVPNlist,
  handleReiniciarConsumoVPN,
  handleVPNStatus,
}) => {
  if (!item) return null;

  const isAdmin = useMemo(() => Meteor.user()?.profile?.role === 'admin', []);
  const [editMode, setEditMode] = useState(false);

  const canEdit = isAdmin;
  const showAdmin = canEdit && editMode;

  return (
    <View style={ui.wrapper} testID="vpn-card-wrapper">
      {showAdmin ? (
        <VpnCardAdmin
          item={item}
          styles={styles}
          preciosVPNlist={preciosVPNlist}
          handleReiniciarConsumoVPN={handleReiniciarConsumoVPN}
          handleVPNStatus={handleVPNStatus}
          accentColor={accentColor}
          canEdit={canEdit}
          onRequestView={() => setEditMode(false)}
        />
      ) : (
        <VpnCardUser
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

export default memo(VpnCard);
