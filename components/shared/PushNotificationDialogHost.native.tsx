import React from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import {
    Avatar,
    Button,
    Modal,
    Portal,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BlurView } from "expo-blur";
import {
    dismissPushDialog,
    subscribeToPushDialog,
    type PushDialogPayload,
} from "../../services/notifications/PushMessaging.native";

const ACCENT = "#4f6bff";
const DIALOG_BACKGROUND = "rgba(7, 13, 27, 0.82)";
const DIALOG_BORDER = "rgba(255, 255, 255, 0.1)";
const HERO_BACKGROUND = "rgba(79, 107, 255, 0.12)";
const HERO_BORDER = "rgba(120, 142, 255, 0.18)";
const CARD_BORDER = "rgba(255, 255, 255, 0.08)";
const TEXT_PRIMARY = "#f8fafc";
const TEXT_SECONDARY = "rgba(226, 232, 240, 0.8)";
const TEXT_MUTED = "rgba(191, 202, 219, 0.72)";

export default function PushNotificationDialogHost() {
  const theme = useTheme();
  const isDarkMode = theme.dark;
  const { top, bottom } = useSafeAreaInsets();
  const [payload, setPayload] = React.useState<PushDialogPayload | null>(null);
  const [imageFailed, setImageFailed] = React.useState(false);
  const [imageAspectRatio, setImageAspectRatio] = React.useState<number | null>(
    null,
  );

  React.useEffect(() => {
    return subscribeToPushDialog((nextPayload) => {
      setPayload(nextPayload);
    });
  }, []);

  React.useEffect(() => {
    setImageFailed(false);
    setImageAspectRatio(null);
  }, [payload?.imageUrl]);

  const handleDismiss = React.useCallback(() => {
    dismissPushDialog();
  }, []);

  const shouldShowImage = Boolean(payload?.imageUrl && !imageFailed);
  const normalizedTitle = (payload?.title || "Nueva notificación").trim();
  const normalizedBody = (payload?.body || "Tienes un nuevo mensaje").trim();

  return (
    <Portal>
      <Modal
        visible={Boolean(payload)}
        onDismiss={handleDismiss}
        style={styles.modalWrapper}
        contentContainerStyle={styles.modalContainer}
      >
        <BlurView
          intensity={24}
          tint={isDarkMode ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod="dimezisBlurView"
          renderToHardwareTextureAndroid={true}
        />

        <View style={[styles.dialog, styles.dialogChrome]}>
          <Surface
            elevation={0}
            style={[
              styles.hero,
              styles.heroChrome,
              { paddingTop: Math.max(top, 56) },
            ]}
          >
            <View style={styles.heroRow}>
              <View style={styles.heroIdentity}>
                <Avatar.Icon
                  icon="bell-ring-outline"
                  size={52}
                  color="#ffffff"
                  style={styles.avatar}
                />

                <View style={styles.heroTextBlock}>
                  <Text style={styles.overline}>VIDKAR</Text>
                  <Text style={styles.heroTitle}>{normalizedTitle}</Text>
                </View>
              </View>

              {/* <IconButton
                icon="close"
                size={18}
                iconColor={TEXT_PRIMARY}
                onPress={handleDismiss}
                style={styles.closeButton}
              /> */}
            </View>
          </Surface>

          <View style={styles.content}>
            <ScrollView
              style={styles.scrollView}
              bounces={false}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Surface elevation={0} style={styles.messageCard}>
                <Text style={styles.sectionLabel}>Mensaje</Text>
                <Text style={styles.body}>{normalizedBody}</Text>

                {shouldShowImage ? (
                  <View style={styles.mediaWrapper}>
                    <Image
                      source={{ uri: payload?.imageUrl || undefined }}
                      style={[
                        styles.media,
                        imageAspectRatio
                          ? { aspectRatio: imageAspectRatio }
                          : null,
                      ]}
                      resizeMode="cover"
                      onLoad={(event) => {
                        const sourceWidth = event.nativeEvent.source?.width;
                        const sourceHeight = event.nativeEvent.source?.height;

                        if (sourceWidth && sourceHeight) {
                          setImageAspectRatio(sourceWidth / sourceHeight);
                        }
                      }}
                      onError={() => setImageFailed(true)}
                    />
                  </View>
                ) : null}
              </Surface>

              <Text style={styles.footerHint}>
                Puedes cerrar este aviso cuando termines de leerlo.
              </Text>
            </ScrollView>
          </View>

          <View
            style={[styles.actions, { paddingBottom: Math.max(bottom, 18) }]}
          >
            <Button
              mode="contained"
              onPress={handleDismiss}
              buttonColor={ACCENT}
              contentStyle={styles.actionContent}
              style={styles.actionButton}
            >
              Cerrar
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 16,
  },
  actionContent: {
    minWidth: 132,
    minHeight: 44,
  },
  actions: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingHorizontal: 22,
    paddingTop: 0,
  },
  avatar: {
    backgroundColor: ACCENT,
    marginRight: 14,
  },
  body: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    margin: 0,
  },
  content: {
    flex: 1,
    paddingBottom: 0,
  },
  dialogChrome: {
    backgroundColor: DIALOG_BACKGROUND,
    borderColor: DIALOG_BORDER,
  },
  dialog: {
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    width: "100%",
  },
  dismissPill: {
    borderRadius: 999,
    overflow: "hidden",
  },
  dismissPillText: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footerHint: {
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    paddingHorizontal: 22,
    textAlign: "center",
  },
  hero: {
    borderBottomWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  heroChrome: {
    backgroundColor: HERO_BACKGROUND,
    borderBottomColor: HERO_BORDER,
  },
  heroIdentity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    marginRight: 10,
  },
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  heroSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 28,
  },
  media: {
    height: undefined,
    width: "100%",
  },
  mediaWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: CARD_BORDER,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    overflow: "hidden",
  },
  messageCard: {
    // borderRadius: 22,
    // padding: 5,
  },
  messageTitle: {
    color: TEXT_PRIMARY,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 26,
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    height: "100%",
    margin: 0,
    padding: 0,
  },
  modalWrapper: {
    justifyContent: "flex-start",
    marginBottom: 0,
    marginTop: 0,
  },
  overline: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 6,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
