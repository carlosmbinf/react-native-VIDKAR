import { useMemo } from "react";
import { ImageBackground, ScrollView, StyleSheet, View } from "react-native";
import {
    Avatar,
    Button,
    Divider,
    Drawer,
    IconButton,
    Surface,
    Text,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import DrawerBlurShell from "./DrawerBlurShell";

const getUserInitials = (user) => {
  const username = user?.username?.trim();
  if (!username) return "VK";

  const parts = username.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return username.slice(0, 2).toUpperCase();
};

const getRoleLabel = (user) => {
  if (user?.username === "carlosmbinf") return "Administrador general";
  if (user?.profile?.role === "admin") return "Administrador";
  if (user?.modoCadete) return "Cadete activo";
  return "Usuario";
};

const getRoleIcon = (user) => {
  if (user?.username === "carlosmbinf") return "shield-crown-outline";
  if (user?.profile?.role === "admin") return "shield-account-outline";
  if (user?.modoCadete) return "bike-fast";
  return "account-circle-outline";
};

const buildServiceItems = (user) => {
  const items = [];

  if (user?.subscipcionPelis === true) {
    items.push({
      label: "Pelis y Series",
      icon: "movie-filter-outline",
      href: "/(normal)/PeliculasVideos",
    });
  }

  items.push(
    {
      label: "Productos Cubacel",
      icon: "cellphone-wireless",
      href: "/(normal)/ProductosCubacelCards",
    },
    {
      label: "Productos Proxy",
      icon: "wifi",
      href: "/(normal)/ProxyPackages",
    },
    {
      label: "Productos VPN",
      icon: "shield-check-outline",
      href: "/(normal)/VPNPackages",
    },
    {
      label: "Compras PROXY/VPN",
      icon: "history",
      href: "/(normal)/ProxyVPNHistory",
    },
    {
      label: "Comercios",
      icon: "storefront-outline",
      href: "/(normal)/ComerciosList",
    },
  );

  if (user?.permiteRemesas === true) {
    items.push({
      label: "Remesas",
      icon: "cash-fast",
      href: "/(normal)/remesas",
    });
  }

  return items;
};

const buildAdminItems = () => [
  {
    label: "Dashboard",
    icon: "view-dashboard-outline",
    href: "/(normal)/Dashboard",
  },
  {
    label: "Lista de usuarios",
    icon: "account-group-outline",
    href: "/(normal)/Users",
  },
  {
    label: "Notificaciones VPN",
    icon: "bell-badge-outline",
    href: "/(normal)/NotificacionUsersConnectionVPN",
  },
  {
    label: "Ventas",
    icon: "cash-register",
    href: "/(normal)/Ventas",
  },
  {
    label: "Aprobaciones de ventas efectivo",
    icon: "file-document-outline",
    href: "/(normal)/ListaArchivos",
  },
  {
    label: "Add usuarios",
    icon: "account-plus-outline",
    href: "/(normal)/CreateUsers",
  },
  {
    label: "Registro de logs",
    icon: "clipboard-list-outline",
    href: "/(normal)/Logs",
  },
  {
    label: "Servidores",
    icon: "server-network-outline",
    href: "/(normal)/Servidores",
  },
];

const buildPrivateItems = () => [
  {
    label: "Campañas y ofertas",
    icon: "bullhorn-variant-outline",
    href: "/(normal)/CampanasOfertas",
  },
  {
    label: "Propertys",
    icon: "cog-outline",
    href: "/(normal)/ListaPropertys",
  },
  {
    label: "Push tokens",
    icon: "devices",
    href: "/(normal)/PushTokens",
  },
  {
    label: "Mapa de usuarios",
    icon: "map-marker-account-outline",
    href: "/(normal)/MapaUsuarios",
  },
];

const DrawerOptionsAlls = ({
  user,
  currentPath,
  onNavigate,
  onClose,
  onToggleModoCadete,
}) => {
  const insets = useSafeAreaInsets();
  const isAdmin =
    user?.profile?.role === "admin" || user?.username === "carlosmbinf";
  const isSuperAdmin = user?.username === "carlosmbinf";
  const canToggleCadete = typeof onToggleModoCadete === "function";
  const cadeteButtonLabel = user?.modoCadete
    ? "Salir del modo cadete"
    : "Entrar en modo cadete";
  const cadeteButtonIcon = user?.modoCadete ? "bike-off" : "bike-fast";
  const cadeteHelperCopy = user?.modoCadete
    ? "Dejarás de aparecer disponible para nuevas entregas hasta que vuelvas a activarlo."
    : "Activa tu disponibilidad operativa desde el drawer igual que en la app legacy.";

  const sections = useMemo(() => {
    const result = [
      // {
      //   title: "Navegación general",
      //   items: [
      //     {
      //       label: "Mi usuario",
      //       icon: "account-circle-outline",
      //       href: "/(normal)/User",
      //     },
      //     {
      //       label: "Mensajes",
      //       icon: "message-text-outline",
      //       href: "/(normal)/Mensajes",
      //     },
      //   ],
      // },
      {
        title: "Servicios VidKar",
        items: buildServiceItems(user),
      },
    ];

    if (isAdmin) {
      result.push({
        title: "Opciones de administradores",
        items: buildAdminItems(),
      });
    }

    if (isSuperAdmin) {
      result.push({
        title: "Opciones privadas",
        items: buildPrivateItems(),
      });
    }

    return result.filter((section) => section.items.length > 0);
  }, [isAdmin, isSuperAdmin, user]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DrawerBlurShell style={styles.container}>
        <ImageBackground
          source={require("../files/space-bg-shadowcodex.jpg")}
          resizeMode="cover"
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroActions}>
              <Text variant="labelLarge" style={styles.heroCaption}>
                VIDKAR
              </Text>
              <IconButton icon="close" iconColor="#fff" onPress={onClose} />
            </View>
            <Avatar.Text
              size={72}
              label={getUserInitials(user)}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
            <Text
              variant="titleLarge"
              style={styles.username}
              numberOfLines={1}
            >
              {user?.username || "Usuario Expo"}
            </Text>
            <View style={styles.roleRow}>
              <Avatar.Icon
                size={28}
                icon={getRoleIcon(user)}
                style={styles.roleIcon}
                color="#fff"
              />
              <Text variant="bodyMedium" style={styles.roleLabel}>
                {getRoleLabel(user)}
              </Text>
            </View>
            {/* <Text variant="bodySmall" style={styles.heroCopy}>
              Menú alineado con el drawer legacy y visibilidad por rol.
            </Text> */}
          </View>
        </ImageBackground>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 12 },
          ]}
          bounces={false}
        >
          <Surface
            style={[
              styles.contentSurface,
              { paddingBottom: 16 },
            ]}
            elevation={0}
          >
            <View>
              {sections.map((section, sectionIndex) => (
                <Drawer.Section
                  key={section.title}
                  title={section.title}
                  style={styles.section}
                >
                  {section.items.map((item) => {
                    const isActive = currentPath === item.href;

                    return (
                      <Drawer.Item
                        key={item.href}
                        label={item.label}
                        icon={item.icon}
                        active={isActive}
                        style={styles.item}
                        theme={{ colors: { secondaryContainer: "#e8eaf6" } }}
                        onPress={() => onNavigate?.(item.href)}
                      />
                    );
                  })}
                  {sectionIndex < sections.length - 1 ? (
                    <Divider style={styles.divider} />
                  ) : null}
                </Drawer.Section>
              ))}
            </View>
          </Surface>
        </ScrollView>

        {canToggleCadete ? (
          <View
            style={[
              styles.footerDock,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <Surface style={styles.footerCard} elevation={0}>
              <Text variant="titleSmall" style={styles.footerTitle}>
                Modo cadete
              </Text>
              <Text variant="bodySmall" style={styles.footerCopy}>
                {cadeteHelperCopy}
              </Text>
              <Button
                mode={user?.modoCadete ? "contained-tonal" : "contained"}
                icon={cadeteButtonIcon}
                style={styles.footerButton}
                onPress={() => onToggleModoCadete?.()}
                disabled={false}
              >
                {cadeteButtonLabel}
              </Button>
            </Surface>
          </View>
        ) : null}
      </DrawerBlurShell>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  hero: {
    minHeight: 232,
  },
  heroImage: {
    opacity: 0.3,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  heroActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  heroCaption: {
    color: "#bfdbfe",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  avatar: {
    backgroundColor: "#4fc3f7",
    alignSelf: "center",
    marginTop: 4,
  },
  avatarLabel: {
    fontWeight: "800",
  },
  username: {
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 12,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 8,
  },
  roleIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  roleLabel: {
    color: "rgba(255, 255, 255, 0.86)",
    fontWeight: "700",
  },
  heroCopy: {
    color: "rgba(255, 255, 255, 0.72)",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentSurface: {
    backgroundColor: "transparent",
    flexGrow: 1,
    minHeight: "100%",
    justifyContent: "space-between",
    paddingBottom: 30,
  },
  section: {
    paddingHorizontal: 8,
  },
  item: {
    borderRadius: 14,
  },
  divider: {
    marginTop: 8,
    marginHorizontal: 8,
  },
  footerDock: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  footerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 18,
    padding: 16,
  },
  footerTitle: {
    color: "#1e293b",
    fontWeight: "800",
    marginBottom: 4,
  },
  footerCopy: {
    color: "#475569",
    lineHeight: 19,
  },
  footerButton: {
    marginTop: 14,
    borderRadius: 14,
  },
});

export default DrawerOptionsAlls;
