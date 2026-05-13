import Meteor from '@meteorrn/core';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import VpnCardAdmin from './VpnCardAdmin';
import VpnCardUser from './VpnCardUser';

const VpnCard = ({ item, styles, accentColor, preciosVPNlist, handleReiniciarConsumoVPN, handleVPNStatus }) => {
	const isAdmin = useMemo(() => {
		const currentUser = Meteor.user();
		return currentUser?.profile?.role === 'admin' || currentUser?.username === 'carlosmbinf';
	}, []);
	const [editMode, setEditMode] = useState(false);

	if (!item) {
		return null;
	}

	const canEdit = isAdmin;
	const hasVpnData = Boolean(item.vpnMbGastados || item.vpnfechaSubscripcion || item.vpnmegas || item.vpn);
	const showAdmin = canEdit && (editMode || !hasVpnData);

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
				<VpnCardUser item={item} styles={styles} accentColor={accentColor} canEdit={canEdit} onRequestEdit={() => setEditMode(true)} />
			)}
		</View>
	);
};

const ui = StyleSheet.create({
	wrapper: { width: '100%' },
});

export default memo(VpnCard);
