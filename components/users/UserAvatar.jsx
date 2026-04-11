import { StyleSheet, View } from "react-native";
import { Avatar, Badge } from "react-native-paper";

const UserAvatar = ({ user, isConnected, connectionType, size = 50 }) => {
  if (!user) return null;

  const getBadgeColor = () => {
    if (!isConnected) return null;

    if (connectionType === "web") return "#10ffE0";
    if (connectionType === "proxy") return "#102dff";
    if (connectionType === "vpn") return "#10ff00";

    return "#10ff00";
  };

  const badgeColor = getBadgeColor();
  const showBadge = isConnected && badgeColor;
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
            },
          ]}
        />
      )}
      {user.picture ? (
        <Avatar.Image size={size} source={{ uri: user.picture }} />
      ) : (
        <Avatar.Text
          size={size}
          label={
            (user.profile?.firstName?.toString().slice(0, 1) || "") +
            (user.profile?.lastName?.toString().slice(0, 1) || "")
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    zIndex: 10,
    borderColor: "white",
    borderWidth: 2,
  },
});

export default UserAvatar;
