import MeteorBase from "@meteorrn/core";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
    Alert,
    Appearance,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Platform,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Avatar,
    IconButton,
    Menu,
    Surface,
    Text,
    TextInput,
} from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { getMeteorUrl } from "../../services/meteor/client.native";
import { Mensajes as MensajesCollection } from "../collections/collections";
import AppHeader from "../Header/AppHeader";
import {
    DARK_MENU_GLASS_TINT,
    LIGHT_MENU_GLASS_TINT,
} from "../shared/GlassMenuSurface";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import('@meteorrn/core').useTracker }} */ (
    MeteorBase
  );

const MESSAGE_PAGE_SIZE = 20;

const CONVERSATION_MESSAGE_FIELDS = {
  attachmentFileId: 1,
  attachmentFileName: 1,
  attachmentFileSize: 1,
  attachmentHeight: 1,
  attachmentKind: 1,
  attachmentMimeType: 1,
  attachmentUrl: 1,
  attachmentWidth: 1,
  attachments: 1,
  createdAt: 1,
  from: 1,
  imageHeight: 1,
  imageMimeType: 1,
  imageUrl: 1,
  imageWidth: 1,
  leido: 1,
  mensaje: 1,
  to: 1,
  type: 1,
};

const CONVERSATION_USER_FIELDS = {
  "profile.avatar": 1,
  "profile.firstName": 1,
  "profile.lastName": 1,
  "services.facebook.picture.data.url": 1,
};

const CHAT_IMAGE_PICKER_OPTIONS = {
  allowsEditing: true,
  aspect: [4, 5],
  base64: true,
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.78,
};

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const toHttpOriginFromMeteorUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const parsedMeteorUrl = new URL(value);
    const protocol = parsedMeteorUrl.protocol === "wss:" ? "https:" : "http:";
    return `${protocol}//${parsedMeteorUrl.host}`;
  } catch (_error) {
    return null;
  }
};

const normalizeChatAssetUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  try {
    const parsedAssetUrl = new URL(value);
    const activeMeteorOrigin = toHttpOriginFromMeteorUrl(getMeteorUrl());

    if (!activeMeteorOrigin) {
      return value;
    }

    const parsedActiveOrigin = new URL(activeMeteorOrigin);
    if (parsedActiveOrigin.host === parsedAssetUrl.host) {
      return value;
    }

    return `${parsedActiveOrigin.origin}${parsedAssetUrl.pathname}${parsedAssetUrl.search}${parsedAssetUrl.hash}`;
  } catch (_error) {
    return value;
  }
};

const getBase64SizeBytes = (base64) => {
  if (!base64) {
    return 0;
  }

  const padding = (base64.match(/=+$/) || [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const inferMimeType = (asset) => {
  if (typeof asset?.mimeType === "string" && asset.mimeType.trim()) {
    return asset.mimeType;
  }

  const fileName = String(asset?.fileName || "").toLowerCase();
  if (fileName.endsWith(".png")) {
    return "image/png";
  }

  return "image/jpeg";
};

const requestGalleryPermission = async () => {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted || current.accessPrivileges === "limited") {
    return true;
  }

  if (current.status === "denied" && !current.canAskAgain) {
    Alert.alert(
      "Permiso de galería bloqueado",
      "Para enviar imágenes por el chat, habilita el acceso a Fotos en Configuración.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Abrir Configuración", onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  }

  const requestResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (requestResult.granted || requestResult.accessPrivileges === "limited") {
    return true;
  }

  Alert.alert(
    "Permiso denegado",
    "No se puede adjuntar una imagen si la app no tiene acceso a tu galería.",
  );
  return false;
};

const buildChatImageMetadata = ({ recipientId }) => ({
  type: "CHAT",
  category: "CHAT_MESSAGE",
  channel: "CHAT",
  source: "MensajesHome.native",
  sourceApp: "expo",
  recipientId,
});

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
      attachmentMenuAnchor: null,
      attachmentMenuVisible: false,
      inputHeight: 40,
      isDarkMode: Appearance?.getColorScheme?.() === "dark",
      isSending: false,
      isUploadingImage: false,
      keyboardHeight: 0,
      message: "",
      messageText: "",
      screenHeight: SCREEN_HEIGHT - 90,
    };

    this.flatListRef = React.createRef();
  this.attachmentButtonRef = React.createRef();
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
    const previousLatestMessageId = prevProps.myTodoTasks[0]?._id;
    const currentLatestMessageId = this.props.myTodoTasks[0]?._id;

    if (
      prevProps.myTodoTasks.length < this.props.myTodoTasks.length &&
      previousLatestMessageId !== currentLatestMessageId
    ) {
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

  openAttachmentMenu = () => {
    if (!this.props.user || this.state.isSending) {
      return;
    }

    const anchorNode = this.attachmentButtonRef.current;
    if (!anchorNode?.measureInWindow) {
      this.setState({
        attachmentMenuAnchor: { x: 20, y: SCREEN_HEIGHT - 120 },
        attachmentMenuVisible: true,
      });
      return;
    }

    anchorNode.measureInWindow((pageX, pageY, width, _height) => {
      const menuWidth = 188;
      const menuHeight = 64;
      const horizontalPadding = 12;
      const desiredX = pageX + width / 2 - menuWidth / 2;
      const maxX = Math.max(horizontalPadding, SCREEN_WIDTH - menuWidth - horizontalPadding);
      const x = Math.min(Math.max(horizontalPadding, desiredX), maxX);
      const y = Math.max(12, pageY - menuHeight - 10);

      this.setState({
        attachmentMenuAnchor: { x, y },
        attachmentMenuVisible: true,
      });
    });
  };

  closeAttachmentMenu = () => {
    this.setState({ attachmentMenuAnchor: null, attachmentMenuVisible: false });
  };

  handleSelectChatImage = async () => {
    const { messageText } = this.state;
    const { user, userLabel } = this.props;

    this.closeAttachmentMenu();

    if (!user) {
      return;
    }

    try {
      const allowed = await requestGalleryPermission();
      if (!allowed) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync(
        CHAT_IMAGE_PICKER_OPTIONS,
      );
      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.base64) {
        Alert.alert(
          "No se pudo adjuntar la imagen",
          "La imagen seleccionada no pudo leerse correctamente.",
        );
        return;
      }

      this.setState({ isSending: true, isUploadingImage: true });

      const uploadResponse = await new Promise((resolve, reject) => {
        Meteor.call(
          "images.upload",
          {
            base64: asset.base64,
            name: asset.fileName || `chat_${Date.now()}.jpg`,
            size: asset.fileSize || getBase64SizeBytes(asset.base64),
            type: inferMimeType(asset),
          },
          buildChatImageMetadata({ recipientId: user }),
          (error, response) => (error ? reject(error) : resolve(response)),
        );
      });

      if (!uploadResponse?.success || !uploadResponse?.url) {
        throw new Error("No se pudo obtener la URL pública de la imagen.");
      }

      const cleanCaption = String(messageText || "").trim();
      const pushImageUrl = normalizeChatAssetUrl(uploadResponse.url);

      await MensajesCollection.insert({
        attachmentFileId: uploadResponse.fileId,
        attachmentFileName: uploadResponse.fileName,
        attachmentFileSize: asset.fileSize || getBase64SizeBytes(asset.base64),
        attachmentHeight: asset.height,
        attachmentKind: "image",
        attachmentMimeType: inferMimeType(asset),
        attachmentUrl: uploadResponse.url,
        attachmentWidth: asset.width,
        attachments: [
          {
            fileId: uploadResponse.fileId,
            fileName: uploadResponse.fileName,
            fileSize: asset.fileSize || getBase64SizeBytes(asset.base64),
            kind: "image",
            mimeType: inferMimeType(asset),
            url: uploadResponse.url,
            width: asset.width,
            height: asset.height,
          },
        ],
        from: Meteor.userId(),
        to: user,
        mensaje: cleanCaption || undefined,
        createdAt: new Date(),
        imageFileId: uploadResponse.fileId,
        imageFileName: uploadResponse.fileName,
        imageHeight: asset.height,
        imageMimeType: inferMimeType(asset),
        imageUrl: uploadResponse.url,
        imageWidth: asset.width,
        leido: false,
        type: "image",
      });

      this.setState({
        inputHeight: 40,
        isSending: false,
        isUploadingImage: false,
        message: "",
        messageText: "",
      });

      setTimeout(() => {
        this.flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);

      Meteor.call(
        "enviarMensajeDirecto2",
        user,
        cleanCaption || "Imagen",
        {
          data: {
            attachmentKind: "image",
            attachmentUrl: pushImageUrl,
            attachmentFileId: uploadResponse.fileId,
            attachmentFileName: uploadResponse.fileName,
            attachmentMimeType: inferMimeType(asset),
            image: pushImageUrl,
            imageUrl: pushImageUrl,
            imageFileId: uploadResponse.fileId,
            imageFileName: uploadResponse.fileName,
            imageMimeType: inferMimeType(asset),
            notificationImageUrl: pushImageUrl,
            type: "image",
            attachments: [
              {
                kind: "image",
                url: pushImageUrl,
                fileId: uploadResponse.fileId,
                fileName: uploadResponse.fileName,
                mimeType: inferMimeType(asset),
                width: asset.width,
                height: asset.height,
              },
            ],
          },
          title: userLabel || Meteor.user()?.username || "Chat",
        },
      );
    } catch (error) {
      console.error("Error al adjuntar imagen del chat:", error);
      Alert.alert(
        "No se pudo enviar la imagen",
        error?.reason || error?.message || "Inténtalo nuevamente.",
      );
      this.setState({ isSending: false, isUploadingImage: false });
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
    const nextMessage = this.props.myTodoTasks[index + 1];
    const isMyMessage = item.user._id === Meteor.userId();
    const resolvedImageUrl =
      typeof item.attachmentUrl === "string" && item.attachmentUrl.trim()
        ? normalizeChatAssetUrl(item.attachmentUrl)
        : typeof item.imageUrl === "string" && item.imageUrl.trim()
          ? normalizeChatAssetUrl(item.imageUrl)
          : "";
    const hasImage = Boolean(resolvedImageUrl);
    const hasText = typeof item.text === "string" && item.text.trim();
    const showAvatar =
      index === 0 ||
      previousMessage?.user?._id !== item.user._id ||
      !isSameDay(previousMessage?.createdAt, item.createdAt);
    const shouldShowDateSeparator =
      index === this.props.myTodoTasks.length - 1 ||
      !isSameDay(nextMessage?.createdAt, item.createdAt);

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

            {hasImage ? (
              <Image
                source={{ uri: resolvedImageUrl }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : null}

            {hasText ? (
              <Text
                style={[
                  styles.messageText,
                  hasImage ? styles.imageCaption : null,
                  { color: isMyMessage ? palette.ownText : palette.otherText },
                ]}
              >
                {item.text}
              </Text>
            ) : null}

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

  handleLoadOlderMessages = () => {
    const { hasMoreMessages, isPaginating, loading, onLoadOlderMessages, user } =
      this.props;

    if (!user || loading || isPaginating || !hasMoreMessages) {
      return;
    }

    onLoadOlderMessages?.();
  };

  renderListFooter = () => {
    const { hasMoreMessages, isPaginating, myTodoTasks } = this.props;
    const palette = this.palette;

    if (isPaginating) {
      return (
        <View style={styles.paginationLoaderWrap}>
          <ActivityIndicator size="small" color={palette.sendBackground} />
          <Text style={[styles.paginationLoaderText, { color: palette.subtitle }]}> 
            Cargando mensajes anteriores...
          </Text>
        </View>
      );
    }

    if (!hasMoreMessages || myTodoTasks.length === 0) {
      return null;
    }

    return (
      <View style={styles.paginationHintWrap}>
        <Text style={[styles.paginationHintText, { color: palette.subtle }]}> 
          Desplázate hacia arriba para cargar más mensajes.
        </Text>
      </View>
    );
  };

  render() {
    const { loading, myTodoTasks, user, userLabel } = this.props;
    const {
      attachmentMenuAnchor,
      attachmentMenuVisible,
      isDarkMode,
      isSending,
      isUploadingImage,
      keyboardHeight,
      messageText,
    } = this.state;

    const palette = getConversationPalette(isDarkMode);
    const attachmentMenuTint = isDarkMode
      ? DARK_MENU_GLASS_TINT
      : LIGHT_MENU_GLASS_TINT;
    const attachmentMenuBlurTint = isDarkMode ? "dark" : "light";
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
                    initialNumToRender={MESSAGE_PAGE_SIZE}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={
                      Platform.OS === "ios" ? "interactive" : "on-drag"
                    }
                    onEndReached={this.handleLoadOlderMessages}
                    onEndReachedThreshold={0.18}
                    ListFooterComponent={this.renderListFooter}
                    maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                  />
                )}
              </View>
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
                <Menu
                  visible={attachmentMenuVisible && Boolean(attachmentMenuAnchor)}
                  onDismiss={this.closeAttachmentMenu}
                  anchor={attachmentMenuAnchor || { x: 20, y: SCREEN_HEIGHT - 120 }}
                  contentStyle={styles.attachmentMenu}
                >
                  <BlurView
                    tint={attachmentMenuBlurTint}
                    style={[
                      styles.attachmentMenuSurface,
                      {
                        backgroundColor: attachmentMenuTint,
                        borderColor: "rgba(255,255,255,0.22)",
                      },
                    ]}
                    intensity={15}
                    experimentalBlurMethod="dimezisBlurView"
                  >
                    <Menu.Item
                      leadingIcon="image-multiple"
                      title="Fotos y videos"
                      onPress={this.handleSelectChatImage}
                    />
                  </BlurView>
                </Menu>

                <View
                  ref={this.attachmentButtonRef}
                  collapsable={false}
                  style={styles.attachmentAnchorContainer}
                >
                  <Surface
                    elevation={0}
                    style={[
                      styles.attachmentButtonWrap,
                      {
                        backgroundColor: palette.inputBackground,
                        borderColor: palette.inputBorder,
                      },
                    ]}
                  >
                    <IconButton
                      icon={isUploadingImage ? "progress-upload" : "plus"}
                      size={24}
                      disabled={!user || isSending}
                      onPress={this.openAttachmentMenu}
                      iconColor={palette.sendBackground}
                      style={styles.attachmentButton}
                    />
                  </Surface>
                </View>

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
  const [messageLimit, setMessageLimit] = React.useState(MESSAGE_PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const dataReady = useDeferredScreenData();

  React.useEffect(() => {
    setMessageLimit(MESSAGE_PAGE_SIZE);
    setIsLoadingMore(false);
  }, [targetUserId]);

  const { hasMoreMessages, loading, myTodoTasks, targetAvatar, userLabel } = Meteor.useTracker(() => {
    if (!targetUserId) {
      return {
        hasMoreMessages: false,
        loading: false,
        myTodoTasks: [],
        targetAvatar: undefined,
        userLabel: "",
      };
    }

    if (!dataReady) {
      return {
        hasMoreMessages: false,
        loading: true,
        myTodoTasks: [],
        targetAvatar: undefined,
        userLabel: "",
      };
    }

    const selector = {
      $or: [
        { $and: [{ from: targetUserId, to: Meteor.userId() }] },
        { $and: [{ from: Meteor.userId(), to: targetUserId }] },
      ],
    };

    const subscriptionLimit = messageLimit + 1;
    const conversationUserIds = [targetUserId, Meteor.userId()].filter(Boolean);

    const handle = Meteor.subscribe(
      "mensajes",
      selector,
      {
        fields: CONVERSATION_MESSAGE_FIELDS,
        limit: subscriptionLimit,
        sort: { createdAt: -1 },
      },
    );

    Meteor.subscribe("user", { _id: { $in: conversationUserIds } }, {
      fields: CONVERSATION_USER_FIELDS,
    });

    const mensajes = MensajesCollection.find(
      selector,
      {
        fields: CONVERSATION_MESSAGE_FIELDS,
        limit: subscriptionLimit,
        sort: { createdAt: -1 },
      },
    ).fetch();

    const hasMore = mensajes.length > messageLimit;
    const visibleMensajes = hasMore ? mensajes.slice(0, messageLimit) : mensajes;

    const targetUser = Meteor.users.findOne(targetUserId, {
      fields: CONVERSATION_USER_FIELDS,
    });
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

    const list = visibleMensajes.map((element) => {
      if (element.to === Meteor.userId() && !element.leido) {
        MensajesCollection.update(element._id, { $set: { leido: true } });
      }

      const fromUser = Meteor.users.findOne(element.from, {
        fields: CONVERSATION_USER_FIELDS,
      });
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
        attachmentFileId: element.attachmentFileId,
        attachmentFileName: element.attachmentFileName,
        attachmentFileSize: element.attachmentFileSize,
        attachmentHeight: element.attachmentHeight,
        attachmentKind: element.attachmentKind,
        attachmentMimeType: element.attachmentMimeType,
        attachmentUrl: element.attachmentUrl,
        attachmentWidth: element.attachmentWidth,
        attachments: element.attachments,
        createdAt: element.createdAt ? new Date(element.createdAt) : new Date(),
        imageHeight: element.imageHeight,
        imageMimeType: element.imageMimeType,
        imageUrl: element.imageUrl,
        imageWidth: element.imageWidth,
        received: !!element.leido,
        sent: true,
        text: element.mensaje,
        type: element.type || "text",
        user: {
          _id: element.from,
          avatar,
          name,
        },
      };
    });

    return {
      hasMoreMessages: hasMore,
      loading: !handle.ready(),
      myTodoTasks: list,
      targetAvatar: resolvedTargetAvatar,
      userLabel: resolvedUserLabel,
    };
  }, [dataReady, messageLimit, targetUserId]);

  React.useEffect(() => {
    if (!loading) {
      setIsLoadingMore(false);
    }
  }, [loading]);

  const handleLoadOlderMessages = React.useCallback(() => {
    if (isLoadingMore || !hasMoreMessages) {
      return;
    }

    setIsLoadingMore(true);
    setMessageLimit((currentLimit) => currentLimit + MESSAGE_PAGE_SIZE);
  }, [hasMoreMessages, isLoadingMore]);

  return (
    <MensajesHomeScreen
      {...props}
      hasMoreMessages={hasMoreMessages}
      isPaginating={isLoadingMore}
      onLoadOlderMessages={handleLoadOlderMessages}
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
  messagesBody: {
    flex: 1,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingTop: 12,
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
  paginationLoaderWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingBottom: 8,
    paddingTop: 12,
  },
  paginationLoaderText: {
    fontSize: 12,
    fontWeight: "600",
  },
  paginationHintWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 4,
    paddingTop: 8,
  },
  paginationHintText: {
    fontSize: 11,
    fontWeight: "600",
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
  attachmentButtonWrap: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    overflow: "hidden",
    width: 54,
  },
  attachmentAnchorContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentButton: {
    margin: 0,
  },
  attachmentMenu: {
    backgroundColor: "transparent",
    borderRadius: 18,
    overflow: "hidden",
    padding: 0,
    width: 188,
  },
  attachmentMenuSurface: {
    borderRadius: 18,
    borderWidth: 2,
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
  messageImage: {
    borderRadius: 18,
    height: Math.min(SCREEN_HEIGHT * 0.34, 260),
    marginBottom: 8,
    width: Math.min(SCREEN_WIDTH * 0.62, 220),
  },
  imageCaption: {
    marginTop: 2,
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
