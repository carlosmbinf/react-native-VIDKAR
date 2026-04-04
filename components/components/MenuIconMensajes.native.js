import MeteorBase from "@meteorrn/core";
import React, { useState } from "react";
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

import { BlurView } from "expo-blur";
import { Mensajes } from "../collections/collections";
import {
  DARK_MENU_GLASS_TINT,
  LIGHT_MENU_GLASS_TINT,
} from "../shared/GlassMenuSurface";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

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
          {
            $or: [
              {
                $and: [
                  { from: userId },
                  { to: currentUserId },
                  { leido: false },
                ],
              },
            ],
          },
          { sort: { createdAt: -1 } },
        ).count();

        return (
          <View key={userId}>
            <List.Item
              onPress={() => onOpenThread?.(userId)}
              title={
                user?.profile
                  ? `${user.profile.firstName} ${user.profile.lastName}`
                  : ""
              }
              titleStyle={styles.itemTitle}
              description={`${lastMessage?.from === currentUserId ? "TU: " : ""}${lastMessage?.mensaje || ""}`}
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
  const { countMensajes, loading, users } = Meteor.useTracker(() => {
    if (!currentUserId) {
      return {
        countMensajes: 0,
        loading: false,
        users: [],
      };
    }

    Meteor.subscribe("user", {}, { fields: { _id: 1 } });
    const messagesHandle = Meteor.subscribe("mensajes", { to: currentUserId });
    const myTodoTasks = Mensajes.find(
      { to: currentUserId },
      { sort: { _id: 1 } },
    );
    const uniqueUsers = [];

    myTodoTasks.map((message) => {
      Meteor.subscribe(
        "user",
        { _id: message.from },
        { fields: { _id: 1, profile: 1, picture: 1 } },
      );
      if (!uniqueUsers.includes(message.from)) {
        uniqueUsers.push(message.from);
      }
    });

    return {
      countMensajes: Mensajes.find({
        $or: [{ $and: [{ to: currentUserId }, { leido: false }] }],
      }).count(),
      loading: !messagesHandle.ready(),
      users: uniqueUsers,
    };
  }, [currentUserId]);

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

  if (users.length === 0) {
    return anchor;
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
        {!loading ? (
          <MessageMenuContent
            currentUserId={currentUserId}
            users={users}
            onOpenThread={(userId) => {
              setMenuVisible(false);
              onOpenMessages?.(userId);
            }}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <Text>Cargando mensajes...</Text>
          </View>
        )}
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
