import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Badge,
  Divider,
  IconButton,
  List,
  Menu,
  Text,
  useTheme,
} from "react-native-paper";

import { Mensajes } from "../collections/collections";
import {
  DARK_MENU_GLASS_TINT,
  LIGHT_MENU_GLASS_TINT,
} from "../shared/GlassMenuSurface";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const MENSAJES_FIELDS = {
  createdAt: 1,
  from: 1,
  leido: 1,
  mensaje: 1,
  to: 1,
};

const MESSAGE_SENDER_FIELDS = {
  picture: 1,
  "profile.firstName": 1,
  "profile.lastName": 1,
};

const getConversationQuery = (otherUserId, currentUserId) => ({
  $or: [
    { $and: [{ from: otherUserId }, { to: currentUserId }] },
    { $and: [{ from: currentUserId }, { to: otherUserId }] },
  ],
});

const MessageMenuContent = ({ currentUserId, users, onOpenThread }) => (
  <View>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.menuScroll}
    >
      {users.map((userId, index) => {
        const user = Meteor.users.findOne({ _id: userId });
        const lastMessage = Mensajes.findOne(
          getConversationQuery(userId, currentUserId),
          { sort: { createdAt: -1 } },
        );
        const unreadCount = Mensajes.find(
          { from: userId, to: currentUserId, leido: false },
          { sort: { createdAt: -1 } },
        ).count();
        const messageDescription = `${lastMessage?.from === currentUserId ? "TU: " : ""}${lastMessage?.mensaje || ""}`;

        return (
          <View key={userId}>
            <List.Item
              onPress={() => onOpenThread?.(userId)}
              title={
                user?.profile
                  ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
                  : ""
              }
              titleStyle={styles.itemTitle}
              description={messageDescription}
              descriptionStyle={styles.itemDescription}
              left={(props) => (
                <Avatar.Image
                  {...props}
                  size={50}
                  source={{ uri: user?.picture || undefined }}
                />
              )}
              right={(props) =>
                unreadCount ? (
                  <Badge {...props}>
                    <Text>{unreadCount}</Text>
                  </Badge>
                ) : null
              }
            />
            {index !== users.length - 1 ? <Divider /> : null}
          </View>
        );
      })}
    </ScrollView>
  </View>
);

const MenuIconMensajesNative = ({ onOpenMessages }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const theme = useTheme();
  const menuTintColor = theme.dark
    ? DARK_MENU_GLASS_TINT
    : LIGHT_MENU_GLASS_TINT;
  const blurTint = theme.dark ? "dark" : "light";
  const currentUserId = Meteor.useTracker(() => Meteor.userId());
  const { countMensajes, messagesReady, users } = Meteor.useTracker(() => {
    if (!currentUserId) {
      return {
        countMensajes: 0,
        messagesReady: true,
        users: [],
      };
    }

    const messagesHandle = Meteor.subscribe(
      "mensajes",
      { to: currentUserId },
      { fields: MENSAJES_FIELDS },
    );
    const messages = Mensajes.find(
      { to: currentUserId },
      { sort: { _id: 1 } },
    ).fetch();
    const uniqueUsers = [...new Set(messages.map((message) => message?.from).filter(Boolean))];

    return {
      countMensajes: Mensajes.find({ to: currentUserId, leido: false }).count(),
      messagesReady: messagesHandle.ready(),
      users: uniqueUsers,
    };
  }, [currentUserId]);
  const usersKey = useMemo(() => users.join(","), [users]);
  const usersReady = Meteor.useTracker(() => {
    if (!currentUserId || users.length === 0) {
      return true;
    }

    const usersHandle = Meteor.subscribe(
      "user",
      { _id: { $in: users } },
      { fields: MESSAGE_SENDER_FIELDS },
    );

    return usersHandle.ready();
  }, [currentUserId, usersKey]);
  const loading = !messagesReady || !usersReady;

  const handleAnchorPress = () => {
    if (users.length === 0) {
      onOpenMessages?.();
      return;
    }

    setMenuVisible(true);
  };

  const anchor =
    !loading && users.length > 0 && countMensajes ? (
      <View collapsable={false} style={styles.anchorContainer}>
        <Badge style={styles.anchorBadge}>
          <Text>{countMensajes}</Text>
        </Badge>
        <IconButton
          icon="email"
          iconColor="#ffffff"
          size={25}
          onPress={handleAnchorPress}
        />
      </View>
    ) : (
      <View collapsable={false} style={styles.anchorContainer}>
        <IconButton
          icon="email"
          iconColor="white"
          size={25}
          onPress={handleAnchorPress}
        />
      </View>
    );

  if (!currentUserId) {
    return null;
  }

  if (loading) {
    return null;
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchorPosition="bottom"
      anchor={anchor}
      contentStyle={styles.menuContent}
    >
      <BlurView
        tint={blurTint}
        style={{
          borderRadius: 25,
          overflow: "hidden",
          backgroundColor: menuTintColor,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.22)",
        }}
        intensity={15}
        experimentalBlurMethod="dimezisBlurView"
      >
        <MessageMenuContent
          currentUserId={currentUserId}
          users={users}
          onOpenThread={(userId) => {
            setMenuVisible(false);
            onOpenMessages?.(userId);
          }}
        />
      </BlurView>
    </Menu>
  );
};

const styles = StyleSheet.create({
  anchorContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    minWidth: 40,
  },
  menuContent: {
    width: 270,
    backgroundColor: "transparent",
    overflow: "visible",
    padding: 0,
    borderRadius: 25,
  },
  menuScroll: {
    maxHeight: 390,
  },
  loadingContainer: {
    justifyContent: "center",
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  anchorBadge: {
    position: "absolute",
    right: 3,
    top: 3,
    zIndex: 1,
  },
  itemTitle: {
    fontSize: 15,
  },
  itemDescription: {
    fontSize: 10,
  },
});

export default MenuIconMensajesNative;
