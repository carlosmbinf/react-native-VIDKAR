import MeteorBase from "@meteorrn/core";
import { BlurTargetView, BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, usePathname } from "expo-router";
import React from "react";
import {
    Alert,
    Appearance,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Platform,
    StyleSheet,
    TextInput as RNTextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ActivityIndicator,
    Avatar,
    IconButton,
    Menu,
    Surface,
    Text,
} from "react-native-paper";

import { buildMeteorHttpBaseUrl } from "../../services/meteor/evidenceImages";
import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import { Mensajes as MensajesCollection } from "../collections/collections";
import { EMPRESA_BRAND } from "../empresa/styles/empresaTheme";
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
const LOADING_CARD_MAX_WIDTH = Math.min(Math.max(SCREEN_WIDTH * 0.54, 360), 620);

const normalizeChatAssetUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const trimmedValue = value.trim();

  // `images.upload` ya devuelve la URL pública configurada en ROOT_URL.
  // No la reemplazamos por el origen del WebSocket, porque en producción
  // ese origen incluye el puerto interno de Meteor y no es descargable por
  // Expo/APNs/FCM (por ejemplo, https://www.vidkar.com -> :3000).
  if (/^(data:|blob:|https?:\/\/)/i.test(trimmedValue)) {
    return trimmedValue;
  }

  try {
    const publicAssetOrigin = buildMeteorHttpBaseUrl();

    if (!publicAssetOrigin) {
      return trimmedValue;
    }

    return new URL(trimmedValue, publicAssetOrigin).toString();
  } catch (_error) {
    return trimmedValue;
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

const buildChatNavigationUrl = (senderId) =>
  senderId ? `Mensaje?item=${encodeURIComponent(senderId)}` : "Mensaje";

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
      screen: "#030712",
      headerBackground: "#0b0f19",
      backgroundTop: "#0b0f19",
      backgroundBottom: "#030712",
      heroBackground: "rgba(17, 24, 39, 0.8)",
      heroBorder: "rgba(255, 255, 255, 0.08)",
      heroMuted: "#9ca3af",
      heroStrong: "#f9fafb",
      heroAccent: "#93c5fd",
      timelineBackground: "rgba(17, 24, 39, 0.7)",
      timelineBorder: "rgba(255, 255, 255, 0.06)",
      ownBubble: "#1e3a8a",
      ownBubbleBorder: "rgba(96, 165, 250, 0.25)",
      otherBubble: "#111827",
      otherBubbleBorder: "rgba(255, 255, 255, 0.08)",
      ownText: "#f0f9ff",
      otherText: "#f3f4f6",
      ownMeta: "rgba(224, 242, 254, 0.65)",
      otherMeta: "#9ca3af",
      senderName: "#93c5fd",
      datePillBackground: "rgba(17, 24, 39, 0.85)",
      datePillBorder: "rgba(255, 255, 255, 0.08)",
      datePillText: "#cbd5e1",
      emptyIconBackground: "rgba(37, 99, 235, 0.12)",
      emptyIcon: "#93c5fd",
      title: "#f9fafb",
      subtitle: "#9ca3af",
      subtle: "#6b7280",
      inputBackground: "rgba(255, 255, 255, 0.08)",
      inputBorder: "rgba(255, 255, 255, 0.12)",
      inputText: "#f9fafb",
      inputPlaceholder: "#9ca3af",
      composerBackground: "transparent",
      composerBorder: "rgba(255, 255, 255, 0.08)",
      sendBackground: "#2563eb",
      sendDisabledBackground: "rgba(31, 41, 55, 0.6)",
      sendIcon: "#ffffff",
      sendDisabledIcon: "#6b7280",
      separator: "rgba(255, 255, 255, 0.06)",
      infoPillBackground: "rgba(37, 99, 235, 0.12)",
      infoPillText: "#93c5fd",
      shadow: "#000000",
    };
  }

  return {
    screen: "#f8fafc",
    headerBackground: "#0f172a",
    backgroundTop: "#f1f5f9",
    backgroundBottom: "#f8fafc",
    heroBackground: "rgba(255, 255, 255, 0.95)",
    heroBorder: "rgba(0, 0, 0, 0.06)",
    heroMuted: "#64748b",
    heroStrong: "#0f172a",
    heroAccent: "#2563eb",
    timelineBackground: "rgba(255, 255, 255, 0.92)",
    timelineBorder: "rgba(0, 0, 0, 0.05)",
    ownBubble: "#2563eb",
    ownBubbleBorder: "rgba(37, 99, 235, 0.3)",
    otherBubble: "#ffffff",
    otherBubbleBorder: "rgba(0, 0, 0, 0.07)",
    ownText: "#ffffff",
    otherText: "#0f172a",
    ownMeta: "rgba(255, 255, 255, 0.75)",
    otherMeta: "#94a3b8",
    senderName: "#2563eb",
    datePillBackground: "rgba(255, 255, 255, 0.9)",
    datePillBorder: "rgba(0, 0, 0, 0.08)",
    datePillText: "#475569",
    emptyIconBackground: "rgba(37, 99, 235, 0.08)",
    emptyIcon: "#2563eb",
    title: "#0f172a",
    subtitle: "#64748b",
    subtle: "#94a3b8",
    inputBackground: "rgba(0, 0, 0, 0.04)",
    inputBorder: "rgba(0, 0, 0, 0.08)",
    inputText: "#0f172a",
    inputPlaceholder: "#94a3b8",
    composerBackground: "transparent",
    composerBorder: "rgba(0, 0, 0, 0.06)",
    sendBackground: "#2563eb",
    sendDisabledBackground: "rgba(226, 232, 240, 0.8)",
    sendIcon: "#ffffff",
    sendDisabledIcon: "#94a3b8",
    separator: "rgba(0, 0, 0, 0.05)",
    infoPillBackground: "rgba(37, 99, 235, 0.08)",
    infoPillText: "#2563eb",
    shadow: "rgba(15, 23, 42, 0.08)",
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
      message: "",
      messageText: "",
      screenHeight: SCREEN_HEIGHT - 90,
    };

    this.flatListRef = React.createRef();
    this.attachmentButtonRef = React.createRef();
    this.composerBlurTargetRef = React.createRef();
    this.palette = getConversationPalette(this.state.isDarkMode);
  }

  componentDidMount() {
    this.appearanceSubscription = Appearance?.addChangeListener?.(
      ({ colorScheme }) => {
        this.setState({ isDarkMode: colorScheme === "dark" });
      },
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

      const currentUserId = Meteor.userId();
      const chatNavigationUrl = buildChatNavigationUrl(currentUserId);

      Meteor.call("enviarMensajeDirecto2", user, message.trim(), {
        data: {
          chatUserId: currentUserId,
          fromUserId: currentUserId,
          item: currentUserId,
          linking: chatNavigationUrl,
          navigationUrl: chatNavigationUrl,
          notificationType: "chat",
          toUserId: user,
          type: "chat_message",
          url: chatNavigationUrl,
        },
        title: Meteor.user()?.profile?.firstName && Meteor.user()?.profile?.lastName
          ? `${Meteor.user().profile.firstName} ${Meteor.user().profile.lastName}`
          : Meteor.user()?.username || "SERVER",
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
      const currentUserId = Meteor.userId();
      const chatNavigationUrl = buildChatNavigationUrl(currentUserId);

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
        from: currentUserId,
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
            chatUserId: currentUserId,
            fromUserId: currentUserId,
            linking: chatNavigationUrl,
            image: pushImageUrl,
            imageUrl: pushImageUrl,
            imageFileId: uploadResponse.fileId,
            imageFileName: uploadResponse.fileName,
            imageMimeType: inferMimeType(asset),
            item: currentUserId,
            navigationUrl: chatNavigationUrl,
            notificationImageUrl: pushImageUrl,
            notificationType: "chat",
            toUserId: user,
            type: "image",
            url: chatNavigationUrl,
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
              hasImage ? styles.messageBubbleWithImage : null,
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

            <View
              style={[
                styles.messageFooter,
                hasImage ? styles.messageFooterWithImage : null,
              ]}
            >
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
    const { insets, loading, myTodoTasks, user, userLabel } = this.props;
    const {
      attachmentMenuAnchor,
      attachmentMenuVisible,
      isDarkMode,
      isSending,
      isUploadingImage,
      messageText,
    } = this.state;

    const bottomInset = insets?.bottom ?? (Platform.OS === "ios" ? 20 : 8);
    const composerBottomPadding = Math.max(bottomInset, 0);

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
            title={user
                        ? userLabel
                        : "Mensajes"}
            subtitle={userLabel || "Conversación privada"}
            backgroundColor={this.props.headerBackgroundColor || palette.headerBackground}
            overlapContent
            showBackButton
            backHref={this.props.headerBackHref || "/(normal)/Main"}
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
          title={user ? userLabel : "Mensajes"}
          subtitle={userLabel || "Conversación privada"}
          backgroundColor={this.props.headerBackgroundColor || palette.headerBackground}
          overlapContent
          showBackButton
          backHref={this.props.headerBackHref || "/(normal)/Main"}
          actions={this.renderHeaderAvatar()}
        />

        <LinearGradient
          colors={[palette.backgroundTop, palette.backgroundBottom]}
          style={styles.surface}
        >
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View style={styles.contentContainer}>
              <BlurTargetView
                ref={this.composerBlurTargetRef}
                collapsable={false}
                style={styles.messagesBody}
              >
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
              </BlurTargetView>
            </View>

            <BlurView
              style={[
                styles.composerWrapper,
                {
                  borderTopColor: palette.composerBorder,
                  paddingBottom: composerBottomPadding,
                },
              ]}
              tint={isDarkMode ? "dark" : "light"}
              intensity={15}
              blurTarget={
                Platform.OS === "android" ? this.composerBlurTargetRef : undefined
              }
              blurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
              renderToHardwareTextureAndroid
            >
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

              <View style={styles.composerContent}>

                <View
                  ref={this.attachmentButtonRef}
                  collapsable={false}
                  style={styles.attachmentAnchorContainer}
                >
                  <IconButton
                    icon={isUploadingImage ? "progress-upload" : "plus"}
                    size={20}
                    disabled={!user || isSending}
                    onPress={this.openAttachmentMenu}
                    iconColor={user && !isSending ? palette.sendBackground : palette.sendDisabledIcon}
                    style={[
                      styles.attachmentButton,
                      {
                        backgroundColor: palette.inputBackground,
                        borderColor: palette.inputBorder,
                      },
                    ]}
                  />
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
                  <RNTextInput
                    value={messageText}
                    onChangeText={(nextMessageText) =>
                      this.setState({ messageText: nextMessageText })
                    }
                    placeholder={
                      user
                        ? `Escribe a ${userLabel || "tu contacto"}...`
                        : "Selecciona una conversación"
                    }
                    placeholderTextColor={palette.inputPlaceholder}
                    style={[
                      styles.composerInput,
                      {
                        color: palette.inputText,
                      },
                    ]}
                    multiline
                    maxLength={undefined}
                    editable={Boolean(user) && !isSending}
                    textAlignVertical="center"
                  />
                </View>

                <IconButton
                  icon={isSending ? "progress-clock" : "arrow-up"}
                  size={20}
                  disabled={!messageText.trim() || !user || isSending}
                  onPress={this.sendNow}
                  iconColor={
                    messageText.trim() && user && !isSending
                      ? palette.sendIcon
                      : palette.sendDisabledIcon
                  }
                  style={[
                    styles.sendButton,
                    {
                      backgroundColor:
                        messageText.trim() && user && !isSending
                          ? palette.sendBackground
                          : palette.sendDisabledBackground,
                      borderColor: palette.inputBorder,
                    },
                  ]}
                />
              </View>
            </BlurView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    );
  }
}

const MensajesHomeNative = (props) => {
  const params = useLocalSearchParams();
  const pathname = usePathname();
  const routeUser = Array.isArray(params.item) ? params.item[0] : params.item;
  const explicitUser = Array.isArray(params.user)
    ? params.user[0]
    : params.user;
  const targetUserId = props.user || routeUser || explicitUser || null;
  const isEmpresaRoute = pathname?.startsWith("/(empresa)");
  const headerBackgroundColor = isEmpresaRoute ? EMPRESA_BRAND : undefined;
  const headerBackHref = isEmpresaRoute
    ? "/(empresa)/EmpresaNavigator"
    : "/(normal)/Main";
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

  const insets = useSafeAreaInsets();

  return (
    <MensajesHomeScreen
      {...props}
      insets={insets}
      headerBackHref={headerBackHref}
      headerBackgroundColor={headerBackgroundColor}
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
    paddingBottom: 16,
    paddingTop: 88,
  },
  messageRowBlock: {
    width: "100%",
  },
  dateSeparatorWrap: {
    alignItems: "center",
    marginBottom: 6,
    marginTop: 8,
  },
  dateSeparator: {
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 90,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dateText: {
    fontSize: 10.5,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "capitalize",
  },
  messageContainer: {
    alignItems: "flex-end",
    flexDirection: "row",
    maxWidth: "100%",
    marginBottom: 5,
  },
  myMessageContainer: {
    justifyContent: "flex-end",
  },
  otherMessageContainer: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    justifyContent: "flex-end",
    marginBottom: 2,
    marginRight: 6,
  },
  avatarSpacer: {
    width: 30,
  },
  messageBubble: {
    alignSelf: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    flexShrink: 1,
    maxWidth: "75%",
    overflow: "hidden",
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 6,
  },
  messageBubbleWithImage: {
    width: Math.min(SCREEN_WIDTH * 0.7, 260),
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 4,
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 3,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 18.5,
    flexShrink: 1,
  },
  messageFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    justifyContent: "flex-end",
    marginTop: 3,
  },
  messageFooterWithImage: {
    marginTop: 2,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: "500",
  },
  checkIcon: {
    margin: -8,
    marginLeft: 0,
  },
  trailingSpacer: {
    width: 4,
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
    borderRadius: 20,
    height: 56,
    justifyContent: "center",
    marginBottom: 12,
    width: 56,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 280,
    textAlign: "center",
  },
  paginationLoaderWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingBottom: 6,
    paddingTop: 8,
  },
  paginationLoaderText: {
    fontSize: 11,
    fontWeight: "500",
  },
  paginationHintWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 4,
    paddingTop: 6,
  },
  paginationHintText: {
    fontSize: 10.5,
    fontWeight: "500",
  },
  composerWrapper: {
    borderTopWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingTop: 6,
    zIndex: 12,
  },
  composerContent: {
    alignItems: "flex-end",
    borderRadius: 22,
    flexDirection: "row",
    gap: 6,
    overflow: "hidden",
  },
  inputShell: {
    borderRadius: 19,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 7 : 4,
  },
  attachmentAnchorContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentButton: {
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    margin: 0,
    width: 38,
  },
  attachmentMenu: {
    backgroundColor: "transparent",
    borderRadius: 14,
    overflow: "hidden",
    padding: 0,
    width: 170,
  },
  attachmentMenuSurface: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  composerInput: {
    fontSize: 14.5,
    lineHeight: 20,
    maxHeight: 80,
    minHeight: 20,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    margin: 0,
  },
  sendButton: {
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    margin: 0,
    width: 38,
  },
  messageImage: {
    borderRadius: 12,
    alignSelf: "center",
    height: 220,
    width: "100%",
  },
  imageCaption: {
    marginTop: 4,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  loadingStateWrap: {
    alignItems: "center",
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    width: "100%",
    maxWidth: LOADING_CARD_MAX_WIDTH + 56,
  },
  loadingCard: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: LOADING_CARD_MAX_WIDTH,
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
