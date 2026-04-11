import { LinearGradient } from "expo-linear-gradient";
import MeteorBase from "@meteorrn/core";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Appearance,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Avatar,
  IconButton,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";

import { Mensajes as MensajesCollection } from "../collections/collections";
import AppHeader from "../Header/AppHeader";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const formatTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatCalendarDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) {
    return "Hoy";
  }

  if (diffDays === 1) {
    return "Ayer";
  }

  if (diffDays > 1 && diffDays < 7) {
    return new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(date);
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const isSameDay = (first, second) => {
  if (!first || !second) {
    return false;
  }

  const firstDate = first instanceof Date ? first : new Date(first);
  const secondDate = second instanceof Date ? second : new Date(second);

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
};

const getInitials = (label) => {
  const parts = String(label || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "MS";
  }

  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
};

const getConversationPalette = (isDark) => {
  if (isDark) {
    return {
      screen: "#020617",
      headerBackground: "#0f172a",
      backgroundTop: "#0b1220",
      backgroundBottom: "#020617",
      heroBackground: "rgba(15, 23, 42, 0.82)",
      heroBorder: "rgba(148, 163, 184, 0.18)",
      heroMuted: "#94a3b8",
      heroStrong: "#f8fafc",
      heroAccent: "#c7d2fe",
      timelineBackground: "rgba(15, 23, 42, 0.76)",
      timelineBorder: "rgba(148, 163, 184, 0.16)",
      ownBubble: "#4f46e5",
      ownBubbleBorder: "rgba(199, 210, 254, 0.18)",
      otherBubble: "rgba(15, 23, 42, 0.94)",
      otherBubbleBorder: "rgba(148, 163, 184, 0.2)",
      ownText: "#ffffff",
      otherText: "#e2e8f0",
      ownMeta: "rgba(255, 255, 255, 0.74)",
      otherMeta: "#94a3b8",
      senderName: "#c7d2fe",
      datePillBackground: "rgba(30, 41, 59, 0.88)",
      datePillBorder: "rgba(99, 102, 241, 0.22)",
      datePillText: "#cbd5f5",
      emptyIconBackground: "rgba(79, 70, 229, 0.16)",
      emptyIcon: "#c7d2fe",
      title: "#f8fafc",
      subtitle: "#cbd5e1",
      subtle: "#94a3b8",
      inputBackground: "rgba(15, 23, 42, 0.9)",
      inputBorder: "rgba(99, 102, 241, 0.22)",
      inputText: "#f8fafc",
      inputPlaceholder: "#94a3b8",
      composerBackground: "rgba(2, 6, 23, 0.9)",
      composerBorder: "rgba(148, 163, 184, 0.14)",
      sendBackground: "#4f46e5",
      sendDisabledBackground: "rgba(51, 65, 85, 0.72)",
      sendIcon: "#ffffff",
      sendDisabledIcon: "#64748b",
      separator: "rgba(148, 163, 184, 0.08)",
      infoPillBackground: "rgba(79, 70, 229, 0.14)",
      infoPillText: "#c7d2fe",
      shadow: "#000000",
    };
  }

  return {
    screen: "#eef4ff",
    headerBackground: "#0f172a",
    backgroundTop: "#e6eeff",
    backgroundBottom: "#f8fbff",
    heroBackground: "rgba(255, 255, 255, 0.94)",
    heroBorder: "rgba(99, 102, 241, 0.14)",
    heroMuted: "#64748b",
    heroStrong: "#0f172a",
    heroAccent: "#3730a3",
    timelineBackground: "rgba(255, 255, 255, 0.92)",
    timelineBorder: "rgba(99, 102, 241, 0.1)",
    ownBubble: "#4f46e5",
    ownBubbleBorder: "rgba(79, 70, 229, 0.16)",
    otherBubble: "#ffffff",
    otherBubbleBorder: "rgba(99, 102, 241, 0.12)",
    ownText: "#ffffff",
    otherText: "#0f172a",
    ownMeta: "rgba(255, 255, 255, 0.72)",
    otherMeta: "#64748b",
    senderName: "#3730a3",
    datePillBackground: "rgba(224, 231, 255, 0.92)",
    datePillBorder: "rgba(99, 102, 241, 0.18)",
    datePillText: "#4338ca",
    emptyIconBackground: "rgba(79, 70, 229, 0.1)",
    emptyIcon: "#4338ca",
    title: "#0f172a",
    subtitle: "#475569",
    subtle: "#64748b",
    inputBackground: "#ffffff",
    inputBorder: "rgba(99, 102, 241, 0.16)",
    inputText: "#0f172a",
    inputPlaceholder: "#64748b",
    composerBackground: "rgba(255, 255, 255, 0.92)",
    composerBorder: "rgba(99, 102, 241, 0.12)",
    sendBackground: "#4f46e5",
    sendDisabledBackground: "rgba(203, 213, 225, 0.9)",
    sendIcon: "#ffffff",
    sendDisabledIcon: "#94a3b8",
    separator: "rgba(99, 102, 241, 0.08)",
    infoPillBackground: "rgba(79, 70, 229, 0.08)",
    infoPillText: "#4338ca",
    shadow: "rgba(15, 23, 42, 0.18)",
  };
};

class MensajesHomeScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inputHeight: 40,
      isDarkMode: Appearance?.getColorScheme?.() === "dark",
      isSending: false,
      keyboardHeight: 0,
      message: "",
      messageText: "",
      screenHeight: SCREEN_HEIGHT - 90,
    };

    this.flatListRef = React.createRef();
    this.keyboardDidHideSub = null;
    this.keyboardDidShowSub = null;
    this.keyboardWillHideSub = null;
    this.keyboardWillShowSub = null;
    this.palette = getConversationPalette(this.state.isDarkMode);
  }

  componentDidMount() {
    this.appearanceSubscription = Appearance?.addChangeListener?.(
      ({ colorScheme }) => {
        this.setState({ isDarkMode: colorScheme === "dark" });
      },
    );

    if (Platform.OS === "ios") {
      this.keyboardWillShowSub = Keyboard.addListener(
        "keyboardWillShow",
        this.keyboardWillShow,
      );
      this.keyboardWillHideSub = Keyboard.addListener(
        "keyboardWillHide",
        this.keyboardWillHide,
      );
      return;
    }

    this.keyboardDidShowSub = Keyboard.addListener(
      "keyboardDidShow",
      this.keyboardDidShow,
    );
    this.keyboardDidHideSub = Keyboard.addListener(
      "keyboardDidHide",
      this.keyboardDidHide,
    );
  }

  componentDidUpdate(prevProps) {
    if (prevProps.myTodoTasks.length < this.props.myTodoTasks.length) {
      setTimeout(() => {
        this.flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }

  componentWillUnmount() {
    this.appearanceSubscription?.remove?.();
    this.keyboardWillShowSub?.remove();
    this.keyboardWillHideSub?.remove();
    this.keyboardDidShowSub?.remove();
    this.keyboardDidHideSub?.remove();
  }

  keyboardWillShow = (event) => {
    this.setState({ keyboardHeight: event.endCoordinates.height });
  };

  keyboardWillHide = () => {
    this.setState({ keyboardHeight: 0 });
  };

  keyboardDidShow = (event) => {
    this.setState({ keyboardHeight: event.endCoordinates.height });
  };

  keyboardDidHide = () => {
    this.setState({ keyboardHeight: 0 });
  };

  handleSend = async () => {
    const { isSending, message } = this.state;
    const { user } = this.props;

    if (!message.trim() || isSending || !user) {
      return;
    }

    this.setState({ isSending: true });

    try {
      await MensajesCollection.insert({
        from: Meteor.userId(),
        to: user,
        mensaje: message.trim(),
        createdAt: new Date(),
        leido: false,
      });

      this.setState({
        inputHeight: 40,
        isSending: false,
        message: "",
      });

      setTimeout(() => {
        this.flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);

      Meteor.call("enviarMensajeDirecto2", user, message.trim(), {
        title: Meteor.user()?.username || "SERVER",
      });
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      this.setState({ isSending: false });
    }
  };

  sendNow = async () => {
    const text = (this.state.messageText || "").trim();
    if (!text || this.state.isSending || !this.props.user) {
      return;
    }

    try {
      await new Promise((resolve) => this.setState({ message: text }, resolve));
      await this.handleSend();
    } finally {
      this.setState({ messageText: "" });
    }
  };

  renderAvatar = (label, avatar, size = 46) => {
    const palette = this.palette;

    if (avatar) {
      return (
        <Avatar.Image
          size={size}
          source={{ uri: avatar }}
          style={styles.avatarImage}
        />
      );
    }

    return (
      <Avatar.Text
        size={size}
        label={getInitials(label)}
        color="#ffffff"
        style={[styles.avatarText, { backgroundColor: palette.sendBackground }]}
      />
    );
  };

  renderConversationHero = () => {
    const { myTodoTasks, targetAvatar, user, userLabel } = this.props;
    const palette = this.palette;

    return (
      <Surface
        elevation={0}
        style={[
          styles.heroCard,
          {
            backgroundColor: palette.heroBackground,
            borderColor: palette.heroBorder,
            shadowColor: palette.shadow,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroAvatarWrap}>
            {this.renderAvatar(userLabel || "Mensajes", targetAvatar, 52)}
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, { color: palette.heroMuted }]}>
              Conversación directa
            </Text>
            <Text style={[styles.heroTitle, { color: palette.heroStrong }]}>
              {userLabel || "Mensajes"}
            </Text>
            <Text style={[styles.heroSubtitle, { color: palette.heroMuted }]}>
              {user
                ? "Espacio privado para conversar con claridad y rapidez."
                : "Selecciona una conversación para escribir y enviar mensajes."}
            </Text>
          </View>
        </View>

        <View style={styles.heroMetaRow}>
          <View
            style={[
              styles.heroPill,
              { backgroundColor: palette.infoPillBackground },
            ]}
          >
            <Text style={[styles.heroPillText, { color: palette.infoPillText }]}>
              {myTodoTasks.length} mensaje{myTodoTasks.length === 1 ? "" : "s"}
            </Text>
          </View>
          <View
            style={[
              styles.heroPill,
              { backgroundColor: palette.infoPillBackground },
            ]}
          >
            <Text style={[styles.heroPillText, { color: palette.infoPillText }]}>
              {user ? "Canal activo" : "Sin destinatario"}
            </Text>
          </View>
        </View>
      </Surface>
    );
  };

  renderDateSeparator = (label) => {
    const palette = this.palette;

    return (
      <View style={styles.dateSeparatorWrap}>
        <View
          style={[
            styles.dateSeparator,
            {
              backgroundColor: palette.datePillBackground,
              borderColor: palette.datePillBorder,
            },
          ]}
        >
          <Text style={[styles.dateText, { color: palette.datePillText }]}>
            {label}
          </Text>
        </View>
      </View>
    );
  };

  renderMessage = ({ index, item }) => {
    const palette = this.palette;
    const previousMessage = this.props.myTodoTasks[index - 1];
    const isMyMessage = item.user._id === Meteor.userId();
    const showAvatar =
      index === 0 ||
      previousMessage?.user?._id !== item.user._id ||
      !isSameDay(previousMessage?.createdAt, item.createdAt);
    const shouldShowDateSeparator =
      index === this.props.myTodoTasks.length - 1 ||
      !isSameDay(previousMessage?.createdAt, item.createdAt);

    return (
      <View style={styles.messageRowBlock}>
        {shouldShowDateSeparator
          ? this.renderDateSeparator(formatCalendarDate(item.createdAt))
          : null}

        <View
          style={[
            styles.messageContainer,
            isMyMessage
              ? styles.myMessageContainer
              : styles.otherMessageContainer,
          ]}
        >
          {!isMyMessage ? (
            <View style={styles.avatarContainer}>
              {showAvatar ? (
                this.renderAvatar(item.user.name, item.user.avatar, 34)
              ) : (
                <View style={styles.avatarSpacer} />
              )}
            </View>
          ) : null}

          <View
            style={[
              styles.messageBubble,
              styles.messageBubbleWidth,
              isMyMessage
                ? [
                    styles.myMessageBubble,
                    {
                      backgroundColor: palette.ownBubble,
                      borderColor: palette.ownBubbleBorder,
                    },
                  ]
                : [
                    styles.otherMessageBubble,
                    {
                      backgroundColor: palette.otherBubble,
                      borderColor: palette.otherBubbleBorder,
                    },
                  ],
            ]}
          >
            {!isMyMessage && showAvatar ? (
              <Text style={[styles.senderName, { color: palette.senderName }]}>
                {item.user.name}
              </Text>
            ) : null}

            <Text
              style={[
                styles.messageText,
                { color: isMyMessage ? palette.ownText : palette.otherText },
              ]}
            >
              {item.text}
            </Text>

            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.timeText,
                  { color: isMyMessage ? palette.ownMeta : palette.otherMeta },
                ]}
              >
                {formatTime(item.createdAt)}
              </Text>

              {isMyMessage && item.sent ? (
                <IconButton
                  icon={item.received ? "check-all" : "check"}
                  size={14}
                  iconColor={item.received ? "#7dd3fc" : palette.ownMeta}
                  style={styles.checkIcon}
                />
              ) : null}
            </View>
          </View>

          {isMyMessage ? <View style={styles.trailingSpacer} /> : null}
        </View>
      </View>
    );
  };

  renderEmptyState = () => {
    const palette = this.palette;
    const { user } = this.props;

    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyIconWrap,
            { backgroundColor: palette.emptyIconBackground },
          ]}
        >
          <IconButton icon="message-text-outline" size={42} iconColor={palette.emptyIcon} />
        </View>
        <Text style={[styles.emptyText, { color: palette.title }]}>
          {user ? "Tu conversación está lista" : "Selecciona una conversación"}
        </Text>
        <Text style={[styles.emptySubtext, { color: palette.subtitle }]}>
          {user
            ? "Envía el primer mensaje y mantén el intercambio claro y ordenado."
            : "Cuando abras un chat, aquí verás todos los mensajes en una vista más limpia y cómoda."}
        </Text>
      </View>
    );
  };

  renderHeaderAvatar = () => {
    const { targetAvatar, userLabel } = this.props;

    if (!userLabel) {
      return null;
    }

    return <View style={styles.headerAvatarSlot}>{this.renderAvatar(userLabel, targetAvatar, 34)}</View>;
  };

  render() {
    const { loading, myTodoTasks, user, userLabel } = this.props;
    const { isDarkMode, isSending, keyboardHeight, messageText } = this.state;

    const palette = getConversationPalette(isDarkMode);
    this.palette = palette;

    if (loading) {
      return (
        <View style={[styles.screen, { backgroundColor: palette.screen }]}> 
          <AppHeader
            title="Mensajes"
            subtitle={userLabel || "Conversación privada"}
            backgroundColor={palette.headerBackground}
            showBackButton
            backHref="/(normal)/Main"
            actions={this.renderHeaderAvatar()}
          />
          <LinearGradient
            colors={[palette.backgroundTop, palette.backgroundBottom]}
            style={styles.surface}
          >
            <View style={styles.loadingStateWrap}>
              <Surface
                elevation={0}
                style={[
                  styles.loadingCard,
                  {
                    backgroundColor: palette.heroBackground,
                    borderColor: palette.heroBorder,
                  },
                ]}
              >
                <ActivityIndicator size="large" color={palette.sendBackground} />
                <Text style={[styles.loadingTitle, { color: palette.title }]}> 
                  Cargando conversación
                </Text>
                <Text style={[styles.loadingText, { color: palette.subtitle }]}> 
                  Estamos preparando el historial de mensajes para que lo veas con fluidez.
                </Text>
              </Surface>
            </View>
          </LinearGradient>
        </View>
      );
    }

    return (
      <View style={[styles.screen, { backgroundColor: palette.screen }]}> 
        <AppHeader
          title="Mensajes"
          subtitle={userLabel || "Conversación privada"}
          backgroundColor={palette.headerBackground}
          showBackButton
          backHref="/(normal)/Main"
          actions={this.renderHeaderAvatar()}
        />

        <LinearGradient
          colors={[palette.backgroundTop, palette.backgroundBottom]}
          style={styles.surface}
        >
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
          >
            <View style={styles.contentContainer}>
              <View style={styles.heroContainer}>{this.renderConversationHero()}</View>

              <Surface
                elevation={0}
                style={[
                  styles.timelineSurface,
                  {
                    backgroundColor: palette.timelineBackground,
                    borderColor: palette.timelineBorder,
                    shadowColor: palette.shadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.timelineSurfaceOverlay,
                    { borderBottomColor: palette.separator },
                  ]}
                >
                  <Text style={[styles.timelineTitle, { color: palette.title }]}>
                    Historial de mensajes
                  </Text>
                  <Text style={[styles.timelineSubtitle, { color: palette.subtitle }]}>
                    {user
                      ? "Todo lo que envías y recibes se mantiene tal como está, ahora con una lectura más cómoda."
                      : "Abre una conversación para escribir y responder mensajes desde esta misma vista."}
                  </Text>
                </View>

                <View style={styles.messagesBody}>
                  {myTodoTasks.length === 0 ? (
                    this.renderEmptyState()
                  ) : (
                    <FlatList
                      ref={this.flatListRef}
                      data={myTodoTasks}
                      renderItem={this.renderMessage}
                      keyExtractor={(item) => item._id}
                      inverted
                      contentContainerStyle={styles.messagesList}
                      showsVerticalScrollIndicator={false}
                      initialNumToRender={20}
                      maxToRenderPerBatch={10}
                      windowSize={10}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode={
                        Platform.OS === "ios" ? "interactive" : "on-drag"
                      }
                    />
                  )}
                </View>
              </Surface>
            </View>

            <View
              style={[
                styles.composerWrapper,
                {
                  backgroundColor: palette.composerBackground,
                  borderTopColor: palette.composerBorder,
                },
                Platform.OS === "android" && keyboardHeight > 0
                  ? { marginBottom: keyboardHeight }
                  : null,
              ]}
            >
              <View style={styles.composerContent}>
                <View
                  style={[
                    styles.inputShell,
                    {
                      backgroundColor: palette.inputBackground,
                      borderColor: palette.inputBorder,
                    },
                  ]}
                >
                  <TextInput
                    mode="flat"
                    value={messageText}
                    onChangeText={(nextMessageText) =>
                      this.setState({ messageText: nextMessageText })
                    }
                    onSubmitEditing={this.sendNow}
                    placeholder={
                      user
                        ? `Escribe a ${userLabel || "tu contacto"}...`
                        : "Selecciona una conversación"
                    }
                    placeholderTextColor={palette.inputPlaceholder}
                    style={[
                      styles.composerInput,
                      {
                        backgroundColor: palette.inputBackground,
                        color: palette.inputText,
                      },
                    ]}
                    theme={{
                      colors: {
                        primary: palette.sendBackground,
                        background: palette.inputBackground,
                        onSurfaceVariant: palette.inputPlaceholder,
                        text: palette.inputText,
                      },
                    }}
                    underlineColor="transparent"
                    disabled={!user || isSending}
                    returnKeyType="send"
                  />
                </View>

                <Surface
                  elevation={0}
                  style={[
                    styles.sendButtonWrap,
                    {
                      backgroundColor:
                        messageText.trim() && user && !isSending
                          ? palette.sendBackground
                          : palette.sendDisabledBackground,
                    },
                  ]}
                >
                  <IconButton
                    icon={isSending ? "progress-clock" : "send"}
                    size={22}
                    disabled={!messageText.trim() || !user || isSending}
                    onPress={this.sendNow}
                    iconColor={
                      messageText.trim() && user && !isSending
                        ? palette.sendIcon
                        : palette.sendDisabledIcon
                    }
                    style={styles.sendButton}
                  />
                </Surface>
              </View>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    );
  }
}

const MensajesHomeNative = (props) => {
  const params = useLocalSearchParams();
  const routeUser = Array.isArray(params.item) ? params.item[0] : params.item;
  const explicitUser = Array.isArray(params.user)
    ? params.user[0]
    : params.user;
  const targetUserId = props.user || routeUser || explicitUser || null;

  const { loading, myTodoTasks, targetAvatar, userLabel } = Meteor.useTracker(() => {
    if (!targetUserId) {
      return {
        loading: false,
        myTodoTasks: [],
        targetAvatar: undefined,
        userLabel: "",
      };
    }

    const handle = Meteor.subscribe(
      "mensajes",
      {
        $or: [
          { $and: [{ from: targetUserId, to: Meteor.userId() }] },
          { $and: [{ from: Meteor.userId(), to: targetUserId }] },
        ],
      },
      { sort: { createdAt: -1 } },
    );

    Meteor.subscribe("user", targetUserId, {
      fields: {
        "profile.firstName": 1,
        "profile.lastName": 1,
        "services.facebook.picture.data.url": 1,
        "profile.avatar": 1,
      },
    });

    const mensajes = MensajesCollection.find(
      {
        $or: [
          { $and: [{ from: targetUserId, to: Meteor.userId() }] },
          { $and: [{ from: Meteor.userId(), to: targetUserId }] },
        ],
      },
      { sort: { createdAt: -1 } },
    ).fetch();

    const targetUser = Meteor.users.findOne(targetUserId);
    const targetFirstName = targetUser?.profile?.firstName || "";
    const targetLastName = targetUser?.profile?.lastName || "";
    const resolvedUserLabel =
      `${targetFirstName} ${targetLastName}`.trim() || "Conversación";
    const resolvedTargetAvatar =
      typeof targetUser?.profile?.avatar === "string" && targetUser.profile.avatar
        ? targetUser.profile.avatar
        : typeof targetUser?.services?.facebook?.picture?.data?.url === "string" &&
            targetUser.services.facebook.picture.data.url
          ? targetUser.services.facebook.picture.data.url
          : undefined;

    const list = mensajes.map((element) => {
      if (element.to === Meteor.userId() && !element.leido) {
        MensajesCollection.update(element._id, { $set: { leido: true } });
      }

      const fromUser = Meteor.users.findOne(element.from);
      const firstName = fromUser?.profile?.firstName || "";
      const lastName = fromUser?.profile?.lastName || "";
      const name = `${firstName} ${lastName}`.trim() || "Usuario";
      const avatarFromProfile = fromUser?.profile?.avatar;
      const avatarFromFacebook =
        fromUser?.services?.facebook?.picture?.data?.url;
      const avatar =
        typeof avatarFromProfile === "string" && avatarFromProfile
          ? avatarFromProfile
          : typeof avatarFromFacebook === "string" && avatarFromFacebook
            ? avatarFromFacebook
            : undefined;

      return {
        _id: element._id,
        createdAt: element.createdAt ? new Date(element.createdAt) : new Date(),
        received: !!element.leido,
        sent: true,
        text: element.mensaje,
        user: {
          _id: element.from,
          avatar,
          name,
        },
      };
    });

    return {
      loading: !handle.ready(),
      myTodoTasks: list,
      targetAvatar: resolvedTargetAvatar,
      userLabel: resolvedUserLabel,
    };
  }, [targetUserId]);

  return (
    <MensajesHomeScreen
      {...props}
      user={targetUserId}
      myTodoTasks={myTodoTasks}
      loading={loading}
      targetAvatar={targetAvatar}
      userLabel={userLabel}
    />
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  surface: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  heroContainer: {
    marginBottom: 12,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  heroAvatarWrap: {
    marginRight: 14,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  heroPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  headerAvatarSlot: {
    marginRight: 10,
  },
  avatarImage: {
    backgroundColor: "transparent",
  },
  avatarText: {
    borderWidth: 0,
  },
  timelineSurface: {
    borderRadius: 30,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
  },
  timelineSurfaceOverlay: {
    borderBottomWidth: 1,
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  timelineSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  messagesBody: {
    flex: 1,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingTop: 18,
  },
  messageRowBlock: {
    width: "100%",
  },
  dateSeparatorWrap: {
    alignItems: "center",
    marginBottom: 8,
    marginTop: 10,
  },
  dateSeparator: {
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "capitalize",
  },
  messageContainer: {
    alignItems: "flex-end",
    flexDirection: "row",
    marginBottom: 8,
  },
  myMessageContainer: {
    justifyContent: "flex-end",
  },
  otherMessageContainer: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    justifyContent: "flex-end",
    marginBottom: 4,
    marginRight: 8,
  },
  avatarSpacer: {
    width: 34,
  },
  messageBubble: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "rgba(15, 23, 42, 0.18)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  messageBubbleWidth: {
    maxWidth: Math.min(SCREEN_WIDTH * 0.76, 360),
  },
  myMessageBubble: {
    borderBottomRightRadius: 8,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  checkIcon: {
    margin: -6,
    marginLeft: 0,
  },
  trailingSpacer: {
    width: 6,
  },
  emptyContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingVertical: 36,
  },
  emptyIconWrap: {
    alignItems: "center",
    borderRadius: 24,
    height: 72,
    justifyContent: "center",
    marginBottom: 14,
    width: 72,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 320,
    textAlign: "center",
  },
  composerWrapper: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  composerContent: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
    paddingBottom: Platform.OS === "ios" ? 22 : 16,
  },
  inputShell: {
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    minHeight: 54,
    overflow: "hidden",
  },
  composerInput: {
    fontSize: 15,
    minHeight: 54,
    paddingHorizontal: 2,
  },
  sendButtonWrap: {
    alignItems: "center",
    borderRadius: 24,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  sendButton: {
    margin: 0,
  },
  loadingStateWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  loadingCard: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 360,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
});

export default MensajesHomeNative;
