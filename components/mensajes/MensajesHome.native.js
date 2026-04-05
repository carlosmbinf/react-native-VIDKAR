import MeteorBase from "@meteorrn/core";
import { router, useLocalSearchParams } from "expo-router";
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
    Appbar,
    Avatar,
    IconButton,
    Surface,
    Text,
    TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { Mensajes as MensajesCollection } from "../collections/collections";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.myTodoTasks.length < this.props.myTodoTasks.length) {
      setTimeout(() => {
        this.flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }

    if (prevState.message.trim() !== this.state.message.trim()) {
      return;
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

  renderHeader = () => {
    const { myTodoTasks } = this.props;
    if (myTodoTasks.length === 0) {
      return null;
    }

    return (
      <View style={styles.headerSpacer}>
        <Text style={styles.dateText}>
          {formatCalendarDate(myTodoTasks[0]?.createdAt)}
        </Text>
      </View>
    );
  };

  renderMessage = ({ index, item }) => {
    const isMyMessage = item.user._id === Meteor.userId();
    const showAvatar =
      index === 0 ||
      this.props.myTodoTasks[index - 1]?.user._id !== item.user._id;

    return (
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
              item.user.avatar ? (
                <Avatar.Image size={32} source={{ uri: item.user.avatar }} />
              ) : (
                <Avatar.Text
                  size={32}
                  label={item.user.name?.substring(0, 2).toUpperCase() || "U"}
                />
              )
            ) : (
              <View style={styles.avatarSpacer} />
            )}
          </View>
        ) : null}

        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            styles.messageBubbleWidth,
          ]}
        >
          {!isMyMessage && showAvatar ? (
            <Text style={styles.senderName}>{item.user.name}</Text>
          ) : null}

          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>

          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.timeText,
                isMyMessage ? styles.myTimeText : styles.otherTimeText,
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>

            {isMyMessage && item.sent ? (
              <View style={styles.statusContainer}>
                <IconButton
                  icon={item.received ? "check-all" : "check"}
                  size={14}
                  iconColor={item.received ? "#4FC3F7" : "#90A4AE"}
                  style={styles.checkIcon}
                />
              </View>
            ) : null}
          </View>
        </View>

        {isMyMessage ? <View style={styles.trailingSpacer} /> : null}
      </View>
    );
  };

  render() {
    const { loading, myTodoTasks, user, userLabel } = this.props;
    const { keyboardHeight, messageText } = this.state;

    const colorScheme = Appearance.getColorScheme();
    const isDark = colorScheme === "dark";

    const blue = "#3f51b5";
    const inputBg = isDark ? "#1b2633" : "#FFFFFF";
    const borderColor = isDark ? "#2b3a4a" : "#C5CAE9";
    const textColor = isDark ? "#E3F2FD" : "#0D47A1";
    const placeholderColor = isDark ? "#90CAF9" : "#5C6BC0";
    const sendColor = isDark ? "#90CAF9" : blue;

    if (loading) {
      return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <Appbar.Header elevated statusBarHeight={0} style={styles.header}>
            <Appbar.BackAction
              iconColor="#fff"
              onPress={handleBackNavigation}
            />
            <Appbar.Content
              title="Mensajes"
              titleStyle={styles.headerTitle}
              subtitle={userLabel || "Conversación"}
              subtitleStyle={styles.headerSubtitle}
            />
          </Appbar.Header>
          <Surface style={styles.surface}>
            <View style={[styles.container, styles.loadingContainer]}>
              <ActivityIndicator size="large" color="#3f51b5" />
              <Text style={styles.loadingText}>Cargando mensajes...</Text>
            </View>
          </Surface>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <Appbar.Header elevated statusBarHeight={0} style={styles.header}>
          <Appbar.BackAction iconColor="#fff" onPress={handleBackNavigation} />
          <Appbar.Content
            title="Mensajes"
            titleStyle={styles.headerTitle}
            subtitle={userLabel || "Conversación"}
            subtitleStyle={styles.headerSubtitle}
          />
        </Appbar.Header>
        <Surface style={styles.surface}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <View style={styles.contentContainer}>
              {myTodoTasks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <IconButton
                    icon="message-outline"
                    size={64}
                    iconColor="#B0BEC5"
                  />
                  <Text style={styles.emptyText}>No hay mensajes aún</Text>
                  <Text style={styles.emptySubtext}>
                    Inicia la conversación
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={this.flatListRef}
                  data={myTodoTasks}
                  renderItem={this.renderMessage}
                  keyExtractor={(item) => item._id}
                  inverted
                  contentContainerStyle={styles.messagesList}
                  ListHeaderComponent={this.renderHeader}
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

            <View
              style={[
                styles.composerWrapper,
                Platform.OS === "android" && keyboardHeight > 0
                  ? { marginBottom: keyboardHeight }
                  : null,
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: isDark
                      ? "rgba(18, 26, 36, 0.82)"
                      : "rgba(232, 240, 254, 0.9)",
                  },
                ]}
              />
              <View style={styles.composerContent}>
                <TextInput
                  mode="flat"
                  value={messageText}
                  onChangeText={(nextMessageText) =>
                    this.setState({ messageText: nextMessageText })
                  }
                  onSubmitEditing={this.sendNow}
                  placeholder={
                    user
                      ? "Escribe un mensaje..."
                      : "Selecciona una conversación"
                  }
                  placeholderTextColor={placeholderColor}
                  style={styles.composerInput}
                  theme={{
                    colors: {
                      primary: blue,
                      outline: borderColor,
                      text: textColor,
                      placeholder: placeholderColor,
                      background: inputBg,
                    },
                  }}
                  underlineColor="transparent"
                  disabled={!user}
                  returnKeyType="send"
                  right={
                    <TextInput.Icon
                      icon="send"
                      disabled={!messageText.trim() || !user}
                      onPress={this.sendNow}
                      color={
                        messageText.trim() && user
                          ? sendColor
                          : isDark
                            ? "#5f6e7a"
                            : "#B0BEC5"
                      }
                    />
                  }
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Surface>
      </SafeAreaView>
    );
  }
}

const handleBackNavigation = () => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(normal)/Main");
};

const MensajesHomeNative = (props) => {
  const params = useLocalSearchParams();
  const routeUser = Array.isArray(params.item) ? params.item[0] : params.item;
  const explicitUser = Array.isArray(params.user)
    ? params.user[0]
    : params.user;
  const targetUserId = props.user || routeUser || explicitUser || null;

  const { loading, myTodoTasks, userLabel } = Meteor.useTracker(() => {
    if (!targetUserId) {
      return {
        loading: false,
        myTodoTasks: [],
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
      userLabel: resolvedUserLabel,
    };
  }, [targetUserId]);

  return (
    <MensajesHomeScreen
      {...props}
      user={targetUserId}
      myTodoTasks={myTodoTasks}
      loading={loading}
      userLabel={userLabel}
    />
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    backgroundColor: "#0f172a",
    height: 56,
  },
  headerTitle: {
    color: "#ffffff",
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.78)",
  },
  surface: {
    flex: 1,
    height: "100%",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#757575",
    fontSize: 14,
    marginTop: 16,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  messageContainer: {
    alignItems: "flex-end",
    flexDirection: "row",
    marginVertical: 4,
  },
  myMessageContainer: {
    justifyContent: "flex-end",
  },
  otherMessageContainer: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginBottom: 4,
    marginRight: 8,
  },
  avatarSpacer: {
    width: 32,
  },
  messageBubble: {
    borderRadius: 16,
    elevation: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageBubbleWidth: {
    maxWidth: Dimensions.get("window").width * 0.7,
  },
  myMessageBubble: {
    backgroundColor: "#3f51b5",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: "#3f51b5",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#212121",
  },
  messageFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
  },
  myTimeText: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherTimeText: {
    color: "#9E9E9E",
  },
  statusContainer: {
    marginLeft: 4,
  },
  checkIcon: {
    margin: 0,
    padding: 0,
  },
  trailingSpacer: {
    width: 8,
  },
  emptyContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 100,
  },
  emptyText: {
    color: "#757575",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtext: {
    color: "#9E9E9E",
    fontSize: 14,
    marginTop: 4,
  },
  headerSpacer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  dateText: {
    backgroundColor: "#EEEEEE",
    borderRadius: 12,
    color: "#9E9E9E",
    fontSize: 12,
    minWidth: 150,
    paddingHorizontal: 12,
    paddingVertical: 4,
    textAlign: "center",
  },
  composerWrapper: {
    backgroundColor: "transparent",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  composerContent: {
    paddingBottom: Platform.OS === "ios" ? 20 : 30,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  composerInput: {
    backgroundColor: "transparent",
    borderRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

export default MensajesHomeNative;
