import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Checkbox,
  Chip,
  HelperText,
  IconButton,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { PushTokens } from "../collections/collections";
import AppHeader from "../Header/AppHeader";
import { sendMessage } from "../../services/notifications/PushMessaging.native";
import {
  canAccessPushTokenDashboards,
  getPlatformMeta,
  normalizePushTokenEntityId,
  PUSH_TOKEN_FIELDS,
  PUSH_TOKEN_SORT_UPDATED,
} from "./pushTokens/utils";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const USER_FIELDS = {
  username: 1,
  profile: 1,
};

const PLATFORM_FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "ANDROID", label: "Android" },
  { value: "IOS", label: "iPhone" },
];

const formatDate = (value) => {
  if (!value) {
    return "Sin actividad reciente";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin actividad reciente";
  }

  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (_error) {
    return date.toLocaleString("es-ES");
  }
};

const getUserLabel = (user) => {
  const firstName =
    typeof user?.profile?.firstName === "string"
      ? user.profile.firstName.trim()
      : "";
  const lastName =
    typeof user?.profile?.lastName === "string"
      ? user.profile.lastName.trim()
      : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  return user?.username || "Cliente";
};

const getInitials = (label) => {
  const value = String(label || "VK").trim();
  if (!value) {
    return "VK";
  }

  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
};

const buildPalette = (theme) => {
  const isDark = theme.dark;

  return {
    screen: theme.colors.background,
    hero: isDark ? "rgba(15, 23, 42, 0.92)" : "#eef4ff",
    panel: theme.colors.elevation?.level1 || theme.colors.surface,
    panelSecondary: theme.colors.elevation?.level2 || theme.colors.surfaceVariant,
    border: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)",
    title: theme.colors.onSurface,
    subtitle: theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
    primarySoft: isDark ? "rgba(79, 70, 229, 0.24)" : "rgba(79, 70, 229, 0.1)",
    primaryBorder: isDark ? "rgba(129, 140, 248, 0.28)" : "rgba(79, 70, 229, 0.14)",
    selectedCard: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(37, 99, 235, 0.08)",
    selectedBorder: isDark ? "rgba(96, 165, 250, 0.5)" : "rgba(37, 99, 235, 0.24)",
    chipBackground: isDark ? "rgba(51, 65, 85, 0.72)" : "rgba(226, 232, 240, 0.9)",
    chipText: theme.colors.onSurface,
    chipSelectedBackground: isDark
      ? "rgba(59, 130, 246, 0.28)"
      : "rgba(37, 99, 235, 0.12)",
    chipSelectedBorder: isDark
      ? "rgba(96, 165, 250, 0.42)"
      : "rgba(37, 99, 235, 0.2)",
    chipSelectedText: isDark ? "#dbeafe" : "#1d4ed8",
    success: "#16a34a",
    warning: "#f59e0b",
    info: "#3b82f6",
    ios: "#a855f7",
    android: "#22c55e",
  };
};

const SummaryCard = ({ label, value, tone, colors }) => (
  <Surface
    elevation={0}
    style={[
      styles.summaryCard,
      {
        backgroundColor: colors.panel,
        borderColor: colors.border,
      },
    ]}
  >
    <Text variant="labelMedium" style={[styles.summaryLabel, { color: colors.subtitle }]}>
      {label}
    </Text>
    <Text variant="headlineSmall" style={[styles.summaryValue, { color: tone || colors.title }]}>
      {value}
    </Text>
  </Surface>
);

const FilterChipGroup = ({ colors, options, selectedValue, onSelect }) => (
  <View style={styles.filterChipsRow}>
    {options.map((option) => {
      const isSelected = option.value === selectedValue;

      return (
        <Chip
          key={option.value}
          compact
          mode="outlined"
          selected={isSelected}
          onPress={() => onSelect(option.value)}
          style={[
            styles.filterChip,
            {
              backgroundColor: isSelected
                ? colors.chipSelectedBackground
                : colors.chipBackground,
              borderColor: isSelected
                ? colors.chipSelectedBorder
                : colors.border,
            },
          ]}
          textStyle={{
            color: isSelected ? colors.chipSelectedText : colors.chipText,
          }}
        >
          {option.label}
        </Chip>
      );
    })}
  </View>
);

const SenderOption = ({
  description,
  icon,
  label,
  onPress,
  selected,
  colors,
}) => (
  <Pressable onPress={onPress} style={styles.senderPressable}>
    <Surface
      elevation={0}
      style={[
        styles.senderCard,
        {
          backgroundColor: selected ? colors.selectedCard : colors.panel,
          borderColor: selected ? colors.selectedBorder : colors.border,
        },
      ]}
    >
      <View style={styles.senderHeader}>
        <Avatar.Icon
          size={42}
          icon={icon}
          color={selected ? colors.primary : colors.title}
          style={[
            styles.senderAvatar,
            { backgroundColor: selected ? colors.primarySoft : colors.panelSecondary },
          ]}
        />
        <Checkbox
          status={selected ? "checked" : "unchecked"}
          onPress={onPress}
          color={colors.primary}
        />
      </View>
      <Text variant="titleSmall" style={[styles.senderTitle, { color: colors.title }]}>
        {label}
      </Text>
      <Text variant="bodySmall" style={[styles.senderCopy, { color: colors.subtitle }]}>
        {description}
      </Text>
    </Surface>
  </Pressable>
);

const RecipientCard = ({ item, selected, onToggle, colors }) => (
  <Pressable onPress={() => onToggle(item.userId)} style={styles.recipientPressable}>
    <Surface
      elevation={0}
      style={[
        styles.recipientCard,
        {
          backgroundColor: selected ? colors.selectedCard : colors.panel,
          borderColor: selected ? colors.selectedBorder : colors.border,
        },
      ]}
    >
      <View style={styles.recipientTopRow}>
        <View style={styles.recipientIdentityRow}>
          <Avatar.Text
            size={46}
            label={item.initials}
            style={[
              styles.recipientAvatar,
              { backgroundColor: selected ? colors.primarySoft : colors.panelSecondary },
            ]}
            labelStyle={{ color: selected ? colors.primary : colors.title }}
          />
          <View style={styles.recipientCopy}>
            <Text variant="titleMedium" style={[styles.recipientTitle, { color: colors.title }]}>
              {item.displayName}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.subtitle }}>
              @{item.username}
            </Text>
          </View>
        </View>
        <Checkbox
          status={selected ? "checked" : "unchecked"}
          onPress={() => onToggle(item.userId)}
          color={colors.primary}
        />
      </View>

      <View style={styles.recipientMetaRow}>
        <Chip compact icon="account-outline" style={styles.recipientMetaChip}>
          {item.devicesCount === 1 ? "1 canal activo" : `${item.devicesCount} canales activos`}
        </Chip>
        <Chip compact icon="clock-outline" style={styles.recipientMetaChip}>
          {item.latestActivityLabel}
        </Chip>
      </View>

      <View style={styles.recipientFooter}>
        <View style={styles.platformChipsRow}>
          {item.platforms.map((platform) => (
            <Chip
              key={`${item.userId}-${platform.key}`}
              compact
              style={[
                styles.platformChip,
                {
                  backgroundColor:
                    platform.key === "ios" ? "rgba(168, 85, 247, 0.12)" : "rgba(34, 197, 94, 0.12)",
                },
              ]}
              textStyle={{
                color: platform.key === "ios" ? colors.ios : colors.android,
              }}
            >
              {platform.label}
            </Chip>
          ))}
        </View>
        <Text variant="bodySmall" style={{ color: colors.subtitle }}>
          {selected ? "Seleccionado para el envío" : "Disponible para incluir"}
        </Text>
      </View>
    </Surface>
  </Pressable>
);

const PushOffersScreen = () => {
  const theme = useTheme();
  const colors = React.useMemo(() => buildPalette(theme), [theme]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [platformFilter, setPlatformFilter] = React.useState("ALL");
  const [selectedRecipientIds, setSelectedRecipientIds] = React.useState([]);
  const [senderMode, setSenderMode] = React.useState("USER");
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [feedback, setFeedback] = React.useState({ visible: false, message: "" });

  const { ready, currentUser, recipients } = Meteor.useTracker(() => {
    const sessionUser = Meteor.user();
    const canManage = canAccessPushTokenDashboards(sessionUser);

    if (!canManage) {
      return {
        ready: true,
        currentUser: sessionUser,
        recipients: [],
      };
    }

    const tokenHandle = Meteor.subscribe("push_tokens", {}, {
      fields: PUSH_TOKEN_FIELDS,
      sort: PUSH_TOKEN_SORT_UPDATED,
    });
    const tokenDocs = PushTokens.find(
      {},
      {
        fields: PUSH_TOKEN_FIELDS,
        sort: PUSH_TOKEN_SORT_UPDATED,
      },
    ).fetch();
    const userIds = Array.from(
      new Set(
        tokenDocs.map((item) => normalizePushTokenEntityId(item?.userId)).filter(Boolean),
      ),
    );
    const userHandle = userIds.length
      ? Meteor.subscribe(
          "user",
          { _id: { $in: userIds } },
          { fields: USER_FIELDS },
        )
      : { ready: () => true };

    const usersById = new Map(
      (userIds.length
        ? Meteor.users.find({ _id: { $in: userIds } }, { fields: USER_FIELDS }).fetch()
        : []
      )
        .map((user) => [normalizePushTokenEntityId(user?._id), user])
        .filter(([id]) => Boolean(id)),
    );

    const groupedRecipients = tokenDocs.reduce((accumulator, tokenDoc) => {
      const userId = normalizePushTokenEntityId(tokenDoc?.userId);
      if (!userId) {
        return accumulator;
      }

      const current = accumulator.get(userId) || {
        userId,
        devices: [],
        latestActivity: null,
      };
      current.devices.push(tokenDoc);

      const latestCandidate = tokenDoc?.updatedAt || tokenDoc?.createdAt || null;
      if (
        latestCandidate &&
        (!current.latestActivity ||
          new Date(latestCandidate).getTime() >
            new Date(current.latestActivity).getTime())
      ) {
        current.latestActivity = latestCandidate;
      }

      accumulator.set(userId, current);
      return accumulator;
    }, new Map());

    const normalizedRecipients = Array.from(groupedRecipients.values())
      .map((entry) => {
        const user = usersById.get(entry.userId);
        const displayName = getUserLabel(user || {});
        const username = user?.username || `usuario-${entry.userId.slice(-4)}`;
        const platforms = Array.from(
          entry.devices.reduce((platformsMap, device) => {
            const platformMeta = getPlatformMeta(device?.platform, device?.provider);
            const key =
              platformMeta.platformLabel === "Android"
                ? "android"
                : platformMeta.platformLabel === "iPhone / iOS"
                  ? "ios"
                  : platformMeta.platformLabel.toLowerCase();
            const existing = platformsMap.get(key) || {
              key,
              label: platformMeta.platformLabel,
              count: 0,
            };
            existing.count += 1;
            platformsMap.set(key, existing);
            return platformsMap;
          }, new Map()).values(),
        );

        return {
          userId: entry.userId,
          username,
          displayName,
          initials: getInitials(displayName),
          devicesCount: entry.devices.length,
          latestActivity: entry.latestActivity,
          latestActivityLabel: formatDate(entry.latestActivity),
          platforms,
          androidCount: platforms.find((item) => item.key === "android")?.count || 0,
          iosCount: platforms.find((item) => item.key === "ios")?.count || 0,
        };
      })
      .sort((left, right) =>
        left.displayName.localeCompare(right.displayName, "es", {
          sensitivity: "base",
        }),
      );

    return {
      ready: tokenHandle.ready() && userHandle.ready(),
      currentUser: sessionUser,
      recipients: normalizedRecipients,
    };
  }, []);

  const canManagePushCampaigns = canAccessPushTokenDashboards(currentUser);
  const currentUserId = currentUser?._id;
  const currentUsername = currentUser?.username || "mi usuario";
  const selectedRecipientSet = React.useMemo(
    () => new Set(selectedRecipientIds),
    [selectedRecipientIds],
  );
  const recipientsById = React.useMemo(
    () => new Map(recipients.map((item) => [item.userId, item])),
    [recipients],
  );

  React.useEffect(() => {
    const validIds = new Set(recipients.map((item) => item.userId));
    setSelectedRecipientIds((current) => current.filter((id) => validIds.has(id)));
  }, [recipients]);

  const visibleRecipients = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return recipients.filter((item) => {
      if (
        platformFilter === "ANDROID" &&
        item.androidCount === 0
      ) {
        return false;
      }

      if (platformFilter === "IOS" && item.iosCount === 0) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [item.displayName, item.username]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [platformFilter, recipients, searchQuery]);

  const summary = React.useMemo(() => {
    const selectedVisibleCount = visibleRecipients.filter((item) =>
      selectedRecipientSet.has(item.userId),
    ).length;

    return {
      available: recipients.length,
      selected: selectedRecipientIds.length,
      android: recipients.filter((item) => item.androidCount > 0).length,
      ios: recipients.filter((item) => item.iosCount > 0).length,
      selectedVisible: selectedVisibleCount,
    };
  }, [recipients, selectedRecipientIds.length, selectedRecipientSet, visibleRecipients]);

  const allVisibleSelected =
    visibleRecipients.length > 0 &&
    visibleRecipients.every((item) => selectedRecipientSet.has(item.userId));

  const senderLabel =
    senderMode === "SERVER" ? "Cuenta institucional" : `Mi usuario · ${currentUsername}`;

  const handleBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(normal)/Main");
  }, []);

  const toggleRecipient = React.useCallback((userId) => {
    setSelectedRecipientIds((current) =>
      current.includes(userId)
        ? current.filter((item) => item !== userId)
        : [...current, userId],
    );
  }, []);

  const toggleAllVisible = React.useCallback(() => {
    const visibleIds = visibleRecipients.map((item) => item.userId);

    setSelectedRecipientIds((current) => {
      const currentSet = new Set(current);
      const shouldSelectAll = visibleIds.some((id) => !currentSet.has(id));

      if (shouldSelectAll) {
        visibleIds.forEach((id) => currentSet.add(id));
      } else {
        visibleIds.forEach((id) => currentSet.delete(id));
      }

      return Array.from(currentSet);
    });
  }, [visibleRecipients]);

  const clearSelection = React.useCallback(() => {
    setSelectedRecipientIds([]);
  }, []);

  const showFeedback = React.useCallback((nextMessage) => {
    setFeedback({ visible: true, message: nextMessage });
  }, []);

  const runSend = React.useCallback(async () => {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const recipientsToSend = selectedRecipientIds
      .map((recipientId) => recipientsById.get(recipientId))
      .filter(Boolean);
    const senderLogActor = senderMode === "SERVER" ? "SERVER" : currentUserId;

    if (!currentUserId || !cleanTitle || !cleanMessage || !recipientsToSend.length) {
      return;
    }

    setSending(true);

    let successCount = 0;
    const failedRecipients = [];

    try {
      const sendResults = await Promise.allSettled(
        recipientsToSend.map((recipient) =>
          sendMessage({
            body: cleanMessage,
            title: cleanTitle,
            toUserId: recipient.userId,
            senderId: senderMode === "SERVER" ? "SERVER" : currentUserId,
            data: {
              campaignType: "offer",
              senderMode,
            },
          }),
        ),
      );

      sendResults.forEach((result, index) => {
        const recipient = recipientsToSend[index];

        if (result.status === "fulfilled") {
          successCount += 1;
          return;
        }

        failedRecipients.push(recipient.displayName);
        if (__DEV__) {
          console.warn(
            `[PushOffersScreen] No se pudo enviar la campaña a ${recipient.userId}:`,
            result.reason,
          );
        }
      });

      Meteor.call(
        "registrarLog",
        failedRecipients.length > 0 ? "OFERTAS PUSH PARCIAL" : "OFERTAS PUSH",
        currentUserId,
        senderLogActor,
        `Campaña "${cleanTitle}" enviada a ${successCount} cliente(s) con firma ${senderMode === "SERVER" ? "SERVER" : currentUsername}.`,
      );

      if (failedRecipients.length === 0) {
        setTitle("");
        setMessage("");
        setSelectedRecipientIds([]);
        showFeedback(
          successCount === 1
            ? "La campaña se envió al cliente seleccionado."
            : `La campaña se envió a ${successCount} clientes.`,
        );
        return;
      }

      showFeedback(
        `Se enviaron ${successCount} comunicaciones y ${failedRecipients.length} quedaron pendientes.`,
      );
    } catch (error) {
      Meteor.call(
        "registrarLog",
        "ERROR OFERTAS PUSH",
        currentUserId,
        senderLogActor,
        error?.message ||
          error?.reason ||
          `No se pudo completar la campaña con firma ${senderMode === "SERVER" ? "SERVER" : currentUsername}.`,
      );
      showFeedback(
        error?.reason || error?.message || "No se pudo completar el envío.",
      );
    } finally {
      setSending(false);
    }
  }, [
    recipientsById,
    currentUserId,
    currentUsername,
    message,
    selectedRecipientIds,
    senderMode,
    showFeedback,
    title,
  ]);

  const handleSend = React.useCallback(() => {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!selectedRecipientIds.length) {
      showFeedback("Selecciona al menos un cliente antes de enviar la campaña.");
      return;
    }

    if (!cleanTitle) {
      showFeedback("Agrega un título para presentar la campaña.");
      return;
    }

    if (!cleanMessage) {
      showFeedback("Escribe el mensaje comercial que quieres compartir.");
      return;
    }

    Alert.alert(
      "Enviar campaña",
      `Se enviará esta comunicación a ${selectedRecipientIds.length} cliente(s) con la firma ${senderLabel}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          onPress: () => {
            runSend().catch(() => null);
          },
        },
      ],
    );
  }, [runSend, selectedRecipientIds.length, senderLabel, showFeedback, title, message]);

  if (!canManagePushCampaigns) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.screen }]}>
        <AppHeader
          title="Campañas y ofertas"
          subtitle="Vista privada"
          showBackButton
          onBack={handleBack}
        />
        <View style={styles.loadingState}>
          <Surface
            elevation={0}
            style={[
              styles.emptyState,
              { backgroundColor: colors.panel, borderColor: colors.border },
            ]}
          >
            <Text variant="titleMedium" style={{ color: colors.title }}>
              Acceso restringido
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.subtitle }}>
              Esta vista comercial está reservada para la cuenta principal.
            </Text>
          </Surface>
        </View>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.screen }]}>
        <AppHeader
          title="Campañas y ofertas"
          subtitle="Preparando audiencia"
          showBackButton
          onBack={handleBack}
        />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" style={{ color: colors.subtitle }}>
            Cargando clientes con canal activo para campañas.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <AppHeader
        title="Campañas y ofertas"
        subtitle="Comunicación comercial"
        showBackButton
        onBack={handleBack}
        actions={
          <IconButton
            icon={showFilters ? "filter-off-outline" : "filter-variant"}
            iconColor={theme.colors.onPrimary}
            onPress={() => setShowFilters((current) => !current)}
          />
        }
      />

      <FlatList
        data={visibleRecipients}
        keyExtractor={(item) => item.userId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <RecipientCard
            item={item}
            selected={selectedRecipientSet.has(item.userId)}
            onToggle={toggleRecipient}
            colors={colors}
          />
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Surface
              elevation={0}
              style={[
                styles.heroCard,
                { backgroundColor: colors.hero, borderColor: colors.primaryBorder },
              ]}
            >
              <Text variant="labelLarge" style={[styles.heroEyebrow, { color: colors.primary }]}>
                Comunicación comercial
              </Text>
              <Text variant="headlineMedium" style={[styles.heroTitle, { color: colors.title }]}>
                Activa una oferta para la audiencia correcta
              </Text>
              <Text variant="bodyMedium" style={[styles.heroCopy, { color: colors.subtitle }]}>
                Selecciona a las personas con canal activo, define el mensaje y
                decide si la campaña saldrá con tu nombre o con la firma
                institucional.
              </Text>
            </Surface>

            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Clientes disponibles"
                value={summary.available}
                tone={colors.info}
                colors={colors}
              />
              <SummaryCard
                label="Seleccionados"
                value={summary.selected}
                tone={colors.primary}
                colors={colors}
              />
              <SummaryCard
                label="Android"
                value={summary.android}
                tone={colors.android}
                colors={colors}
              />
              <SummaryCard
                label="iPhone"
                value={summary.ios}
                tone={colors.ios}
                colors={colors}
              />
            </View>

            <Surface
              elevation={0}
              style={[
                styles.formCard,
                { backgroundColor: colors.panel, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={{ color: colors.title }}>
                  Firma del envío
                </Text>
                <Text variant="bodySmall" style={{ color: colors.subtitle }}>
                  Elige cómo aparecerá esta comunicación ante el cliente.
                </Text>
              </View>

              <View style={styles.senderGrid}>
                <SenderOption
                  icon="account-circle-outline"
                  label={`Mi usuario · ${currentUsername}`}
                  description="La campaña saldrá acompañada por tu cuenta actual."
                  selected={senderMode === "USER"}
                  onPress={() => setSenderMode("USER")}
                  colors={colors}
                />
                <SenderOption
                  icon="domain"
                  label="Cuenta institucional"
                  description="La campaña saldrá con una firma institucional."
                  selected={senderMode === "SERVER"}
                  onPress={() => setSenderMode("SERVER")}
                  colors={colors}
                />
              </View>
            </Surface>

            <Surface
              elevation={0}
              style={[
                styles.formCard,
                { backgroundColor: colors.panel, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={{ color: colors.title }}>
                  Contenido de la campaña
                </Text>
                <Text variant="bodySmall" style={{ color: colors.subtitle }}>
                  Mantén un mensaje claro, directo y orientado al valor de la
                  oferta.
                </Text>
              </View>

              <TextInput
                mode="outlined"
                label="Título"
                placeholder="Ej. Oferta especial para esta semana"
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />
              <HelperText type="info" visible={true}>
                {`${title.length}/80 · Un buen título facilita la lectura del comunicado.`}
              </HelperText>

              <TextInput
                mode="outlined"
                label="Mensaje"
                placeholder="Comparte aquí el beneficio principal, vigencia o llamada a la acción."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={styles.messageInput}
              />

              <View style={styles.composerFooter}>
                <View style={styles.selectionResume}>
                  <Chip compact icon="account-multiple-check-outline">
                    {selectedRecipientIds.length === 1
                      ? "1 cliente seleccionado"
                      : `${selectedRecipientIds.length} clientes seleccionados`}
                  </Chip>
                  <Chip compact icon="card-account-details-outline">
                    {senderLabel}
                  </Chip>
                </View>
                <Button
                  mode="contained"
                  icon="bullhorn-variant-outline"
                  onPress={handleSend}
                  loading={sending}
                  disabled={sending || !selectedRecipientIds.length}
                >
                  Enviar campaña
                </Button>
              </View>
            </Surface>

            {showFilters ? (
              <Surface
                elevation={0}
                style={[
                  styles.filterPanel,
                  { backgroundColor: colors.panel, borderColor: colors.border },
                ]}
              >
                <TextInput
                  mode="outlined"
                  label="Buscar clientes"
                  placeholder="Nombre o usuario"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  left={<TextInput.Icon icon="magnify" />}
                  right={
                    searchQuery ? (
                      <TextInput.Icon icon="close" onPress={() => setSearchQuery("")} />
                    ) : null
                  }
                />

                <View>
                  <Text variant="labelMedium" style={{ color: colors.subtitle }}>
                    Cobertura
                  </Text>
                  <FilterChipGroup
                    colors={colors}
                    options={PLATFORM_FILTERS}
                    selectedValue={platformFilter}
                    onSelect={setPlatformFilter}
                  />
                </View>
              </Surface>
            ) : (
              <Surface
                elevation={0}
                style={[
                  styles.filterSummaryBar,
                  { backgroundColor: colors.panel, borderColor: colors.border },
                ]}
              >
                <Text variant="bodySmall" style={{ color: colors.subtitle }}>
                  {searchQuery
                    ? `Búsqueda activa · ${visibleRecipients.length} resultado(s)`
                    : "Filtros ocultos"}
                </Text>
                <View style={styles.filterSummaryChips}>
                  <Chip compact icon="account-search-outline">
                    {visibleRecipients.length} visibles
                  </Chip>
                  <Chip compact icon="cellphone-cog">
                    {platformFilter === "ALL"
                      ? "Todas las plataformas"
                      : platformFilter === "ANDROID"
                        ? "Android"
                        : "iPhone"}
                  </Chip>
                </View>
              </Surface>
            )}

            <View style={styles.recipientsHeader}>
              <View>
                <Text variant="titleMedium" style={{ color: colors.title }}>
                  Audiencia disponible
                </Text>
                <Text variant="bodySmall" style={{ color: colors.subtitle }}>
                  Elige a quién quieres incluir en esta campaña.
                </Text>
              </View>
              <View style={styles.recipientsActions}>
                <Button mode="text" compact onPress={toggleAllVisible}>
                  {allVisibleSelected ? "Quitar visibles" : "Seleccionar visibles"}
                </Button>
                {selectedRecipientIds.length > 0 ? (
                  <Button mode="text" compact onPress={clearSelection}>
                    Limpiar
                  </Button>
                ) : null}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Surface
            elevation={0}
            style={[
              styles.emptyState,
              { backgroundColor: colors.panel, borderColor: colors.border },
            ]}
          >
            <Text variant="titleMedium" style={{ color: colors.title }}>
              No hay clientes disponibles
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.subtitle }}>
              Ajusta la búsqueda o revisa los filtros para volver a ver la
              audiencia disponible.
            </Text>
          </Surface>
        }
      />

      <Snackbar
        visible={feedback.visible}
        onDismiss={() => setFeedback((current) => ({ ...current, visible: false }))}
        duration={3200}
      >
        {feedback.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  composerFooter: {
    gap: 14,
  },
  emptyState: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 6,
    padding: 22,
  },
  filterChip: {
    borderRadius: 999,
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  filterPanel: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 18,
    marginBottom: 18,
    padding: 18,
  },
  filterSummaryBar: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filterSummaryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  formCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    marginBottom: 18,
    padding: 20,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    marginBottom: 18,
    padding: 22,
  },
  heroCopy: {
    lineHeight: 22,
  },
  heroEyebrow: {
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontWeight: "800",
  },
  listContent: {
    padding: 18,
    paddingBottom: 28,
  },
  listHeader: {
    paddingBottom: 8,
  },
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 24,
  },
  messageInput: {
    minHeight: 126,
  },
  platformChip: {
    borderRadius: 999,
  },
  platformChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recipientAvatar: {
    marginRight: 12,
  },
  recipientCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    marginBottom: 14,
    padding: 16,
  },
  recipientCopy: {
    flex: 1,
    gap: 4,
  },
  recipientFooter: {
    gap: 10,
  },
  recipientIdentityRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  recipientMetaChip: {
    borderRadius: 999,
  },
  recipientMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recipientPressable: {
    borderRadius: 24,
  },
  recipientTitle: {
    fontWeight: "700",
  },
  recipientTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  recipientsActions: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  recipientsHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  screen: {
    flex: 1,
  },
  sectionHeader: {
    gap: 6,
  },
  selectionResume: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  senderAvatar: {
    marginRight: 10,
  },
  senderCard: {
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    gap: 10,
    minWidth: 0,
    padding: 16,
  },
  senderCopy: {
    lineHeight: 20,
  },
  senderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  senderHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  senderPressable: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  senderTitle: {
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minWidth: 140,
    padding: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  summaryLabel: {
    marginBottom: 8,
  },
  summaryValue: {
    fontWeight: "800",
  },
});

export default PushOffersScreen;
