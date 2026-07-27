import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import React, { useEffect, useMemo, useState } from "react";
import {
    InteractionManager,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
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
  "profile.role": 1,
};

const getCurrentUserMessagesQuery = (currentUserId) => ({
  $or: [{ from: currentUserId }, { to: currentUserId }],
});

const MessageMenuContent = ({ conversations, currentUserId, onOpenThread }) => (
  <View>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.menuScroll}
    >
      {conversations.map((conversation, index) => {
        const userId = conversation.userId;
        const user = Meteor.users.findOne({ _id: userId });
        const lastMessage = conversation.lastMessage;
        const unreadCount = conversation.unreadCount;
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
                    <Text style={{ color: "#ffffff" }}>{unreadCount}</Text>
                  </Badge>
                ) : null
              }
            />
            {index !== conversations.length - 1 ? <Divider /> : null}
          </View>
        );
      })}
    </ScrollView>
  </View>
);

const MenuIconMensajesNative = ({ onOpenMessages }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [readyToSubscribe, setReadyToSubscribe] = useState(false);
  const theme = useTheme();
  const menuTintColor = theme.dark
    ? DARK_MENU_GLASS_TINT
    : LIGHT_MENU_GLASS_TINT;
  const blurTint = theme.dark ? "dark" : "light";
  const currentUserId = Meteor.useTracker(() => Meteor.userId());

  useEffect(() => {
    let mounted = true;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      if (mounted) {
        setReadyToSubscribe(true);
      }
    });

    return () => {
      mounted = false;
      interactionTask?.cancel?.();
    };
  }, []);

  const { conversations, countMensajes, messagesReady, users } = Meteor.useTracker(() => {
    if (!readyToSubscribe || !currentUserId) {
      return {
        conversations: [],
        countMensajes: 0,
        messagesReady: true,
        users: [],
      };
    }

    const messagesHandle = Meteor.subscribe(
      "mensajes",
      getCurrentUserMessagesQuery(currentUserId),
      { fields: MENSAJES_FIELDS, sort: { createdAt: -1 } },
    );
    const messages = Mensajes.find(
      getCurrentUserMessagesQuery(currentUserId),
      { fields: MENSAJES_FIELDS, sort: { createdAt: -1 } },
    ).fetch();
    const unreadCountsByUser = new Map();
    const latestMessageByUser = new Map();

    messages.forEach((message) => {
      if (!message) {
        return;
      }

      const otherUserId = message.from === currentUserId ? message.to : message.from === currentUserId || message.to === currentUserId ? message.from : null;

      if (!otherUserId) {
        return;
      }

      if (!latestMessageByUser.has(otherUserId)) {
        latestMessageByUser.set(otherUserId, message);
      }

      if (message.from === otherUserId && message.to === currentUserId && message.leido === false) {
        unreadCountsByUser.set(otherUserId, (unreadCountsByUser.get(otherUserId) || 0) + 1);
      }
    });

    const uniqueUsers = Array.from(latestMessageByUser.keys());
    const conversationSummaries = uniqueUsers.map((userId) => ({
      userId,
      lastMessage: latestMessageByUser.get(userId) || null,
      unreadCount: unreadCountsByUser.get(userId) || 0,
    }));

    return {
      conversations: conversationSummaries,
      countMensajes: Mensajes.find({ to: currentUserId, leido: false }).count(),
      messagesReady: messagesHandle.ready(),
      users: uniqueUsers,
    };
  }, [currentUserId, readyToSubscribe]);
  const usersKey = useMemo(() => users.join(","), [users]);
  const usersReady = Meteor.useTracker(() => {
    if (!currentUserId || users.length === 0) {
      return true;
    }

    const usersHandle = Meteor.subscribe("user", { _id: { $in: users } }, {
      fields: MESSAGE_SENDER_FIELDS,
    });

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
          <Text style={{ color: theme.dark ? "#000000" : "#ffffff" }}>{countMensajes}</Text>
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

  if (!readyToSubscribe || !currentUserId) {
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
          conversations={conversations}
          currentUserId={currentUserId}
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
