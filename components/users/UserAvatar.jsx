import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Avatar, Badge } from 'react-native-paper';

/**
 * Componente reutilizable para Avatar con Badge de estado
 * @param {Object} props
 * @param {Object} props.user - Objeto del usuario
 * @param {boolean} props.isConnected - Si el usuario está conectado
 * @param {string} props.connectionType - Tipo de conexión ('web', 'proxy', 'vpn')
 * @param {number} props.size - Tamaño del avatar (default: 50)
 */
const UserAvatar = ({ user, isConnected, connectionType, size = 50 }) => {
  if (!user) return null;

  // Determinar color del badge según tipo de conexión
  const getBadgeColor = () => {
    if (!isConnected) return null;
    
    if (connectionType === 'web') return '#10ffE0'; // Cyan para web
    if (connectionType === 'proxy') return '#102dff'; // Azul para proxy
    if (connectionType === 'vpn') return '#10ff00'; // Verde para VPN
    
    return '#10ff00'; // Default verde
  };

  const badgeColor = getBadgeColor();
  const showBadge = isConnected && badgeColor;

  // Calcular tamaño del badge proporcionalmente
  const badgeSize = Math.max(16, Math.floor(size * 0.32));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {showBadge && (
        <Badge
          size={badgeSize}
          style={[
            styles.badge,
            { 
              backgroundColor: badgeColor,
              bottom: -2,
              right: -2,
            }
          ]}
        />
      )}
      {user.picture ? (
        <Avatar.Image
          size={size}
          source={{ uri: user.picture }}
        />
      ) : (
        <Avatar.Text
          size={size}
          label={
            (user.profile?.firstName?.toString().slice(0, 1) || '') +
            (user.profile?.lastName?.toString().slice(0, 1) || '')
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    zIndex: 10,
    borderColor: 'white',
    borderWidth: 2,
  },
});

export default UserAvatar;
