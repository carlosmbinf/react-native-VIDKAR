import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    AccessibilityInfo,
    Animated,
    Easing,
    ImageBackground,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from "react-native";
import {
    Avatar,
    Divider,
    Drawer,
    IconButton,
    Surface,
    Text,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DrawerBlurShell from "./DrawerBlurShell";

const CARD_PRESS_IN_DURATION_MS = 140;
const CARD_PRESS_OUT_DURATION_MS = 220;

const ModeActionCard = ({
  accessibilityLabel,
  actionLabel,
  description,
  icon,
  onPress,
  title,
}) => {
  const pressProgress = useRef(new Animated.Value(0)).current;
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(true);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotionEnabled(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotionEnabled,
    );

    return () => {
      mounted = false;
      pressProgress.stopAnimation();
      subscription?.remove?.();
    };
  }, [pressProgress]);

  const animatePress = (pressed) => {
    pressProgress.stopAnimation();

    if (reduceMotionEnabled) {
      pressProgress.setValue(0);
      return;
    }

    Animated.timing(pressProgress, {
      duration: pressed
        ? CARD_PRESS_IN_DURATION_MS
        : CARD_PRESS_OUT_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      toValue: pressed ? 1 : 0,
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = reduceMotionEnabled
    ? null
    : {
        transform: [
          {
            translateY: pressProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
          {
            scale: pressProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.985],
            }),
          },
        ],
      };

  return (
    <Animated.View style={[styles.modeCardMotion, animatedStyle]}>
      <Surface elevation={0} style={styles.footerCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={onPress}
          onPressIn={() => animatePress(true)}
          onPressOut={() => animatePress(false)}
          style={({ pressed }) => [
            styles.modeRow,
            pressed ? styles.modeRowPressed : null,
          ]}
        >
          <View style={styles.modeIconWrap}>
            <MaterialCommunityIcons color="#a5b4fc" name={icon} size={20} />
          </View>
          <View style={styles.modeCopyWrap}>
            <Text variant="titleSmall" style={styles.footerTitle}>
              {title}
            </Text>
            <Text
              numberOfLines={1}
              variant="bodySmall"
              style={styles.footerCopy}
            >
              {description}
            </Text>
          </View>
          <View style={styles.modeAction}>
            <Text variant="labelMedium" style={styles.modeActionLabel}>
              {actionLabel}
            </Text>
            <MaterialCommunityIcons
              color="#a5b4fc"
              name="chevron-right"
              size={18}
            />
          </View>
        </Pressable>
      </Surface>
    </Animated.View>
  );
};

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
  if (user?.profile?.role === "profesor") return "Profesor";
  if (user?.modoCadete) return "Cadete activo";
  return "Usuario";
};

const getRoleIcon = (user) => {
  if (user?.username === "carlosmbinf") return "shield-crown-outline";
  if (user?.profile?.role === "admin") return "shield-account-outline";
  if (user?.profile?.role === "profesor") return "school-outline";
  if (user?.modoCadete) return "bike-fast";
  return "account-circle-outline";
};

const buildServiceItems = (user) => {
  const items = [];

  items.push(
    {
      label: "Cursos",
      icon: "book-education-outline",
      href: "/(normal)/Cursos",
    },
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

const buildCinemaItems = (user) => user?.subscipcionPelis === true ? [
  {
    label: "Peliculas",
    icon: "movie-open-outline",
    href: "/(normal)/PeliculasVideos",
  },
  {
    label: "Series",
    icon: "television-classic",
    href: "/(normal)/Series",
  },
] : [];

const buildAdminItems = () => [
  {
    label: "Dashboard",
    icon: "view-dashboard-outline",
    href: "/(normal)/Dashboard",
  },
  {
    label: "Gestión de cursos",
    icon: "book-cog-outline",
    href: "/(normal)/GestionCursos",
  },
  {
    label: "Evaluaciones con IA",
    icon: "brain",
    href: "/(normal)/EvaluacionesIA",
  },
  {
    label: "Ganancias de cursos",
    icon: "cash-multiple",
    href: "/(normal)/GananciasCursos",
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
    label: "Precios",
    icon: "tag-multiple-outline",
    href: "/(normal)/Precios",
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

const buildProfessorItems = () => [
  {
    label: "Gestión de cursos",
    icon: "book-cog-outline",
    href: "/(normal)/GestionCursos",
  },
  {
    label: "Ganancias de cursos",
    icon: "cash-multiple",
    href: "/(normal)/GananciasCursos",
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
    label: "Streaming HLS",
    icon: "movie-cog-outline",
    href: "/(normal)/HlsAdmin",
  },
  {
    label: "Mapa de usuarios",
    icon: "map-marker-account-outline",
    href: "/(normal)/MapaUsuarios",
  },
  {
    label: "Centro antifraude",
    icon: "shield-alert-outline",
    href: "/(normal)/CentroAntifraude",
  },
];

const DrawerOptionsAlls = ({
  user,
  currentPath,
  onNavigate,
  onClose,
  onToggleModoCadete,
  onToggleModoEmpresa,
}) => {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const isLandscapeDrawer = width > height;
  const isAdmin =
    user?.profile?.role === "admin" || user?.username === "carlosmbinf";
  const isProfessor = user?.profile?.role === "profesor";
  const isSuperAdmin = user?.username === "carlosmbinf";
  const canToggleCadete = typeof onToggleModoCadete === "function";
  const canToggleEmpresa =
    typeof onToggleModoEmpresa === "function" &&
    user?.empresaTerminosCondicionesAcepted === true;
  const cadeteButtonLabel = user?.modoCadete
    ? "Salir del modo cadete"
    : "Entrar en modo cadete";
  const cadeteButtonIcon = user?.modoCadete ? "bike-off" : "bike-fast";
  const cadeteHelperCopy = user?.modoCadete
    ? "Disponible para recibir nuevas entregas."
    : "Activa tu disponibilidad para entregas.";
  const empresaButtonLabel = user?.modoEmpresa
    ? "Salir del modo empresa"
    : "Entrar en modo empresa";
  const empresaButtonIcon = user?.modoEmpresa
    ? "store-off-outline"
    : "storefront-outline";
  const empresaHelperCopy = user?.modoEmpresa
    ? "Panel de tiendas y pedidos activo."
    : "Gestiona tus tiendas, productos y pedidos.";

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
        title: "Cinema",
        items: buildCinemaItems(user),
      },
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

    if (isProfessor) {
      result.push({
        title: "Panel del profesor",
        items: buildProfessorItems(),
      });
    }

    if (isSuperAdmin) {
      result.push({
        title: "Opciones privadas",
        items: buildPrivateItems(),
      });
    }

    return result.filter((section) => section.items.length > 0);
  }, [isAdmin, isProfessor, isSuperAdmin, user]);

  const headerNode = (
    <ImageBackground
      source={require("../files/space-bg-shadowcodex.jpg")}
      resizeMode="cover"
      style={[
        styles.hero,
        isLandscapeDrawer ? styles.heroLandscape : null,
        {
          minHeight: Math.max(
            isLandscapeDrawer ? 208 : 252,
            (isLandscapeDrawer ? 188 : 232) + insets.top,
          ),
        },
      ]}
      imageStyle={styles.heroImage}
    >
      <View
        style={[
          styles.heroOverlay,
          isLandscapeDrawer ? styles.heroOverlayLandscape : null,
          {
            paddingTop: Math.max(insets.top, 14),
            paddingBottom: isLandscapeDrawer ? 18 : 26,
          },
        ]}
      >
        <View style={styles.heroActions}>
          <Text variant="labelLarge" style={styles.heroCaption}>
            VIDKAR
          </Text>
          <IconButton icon="close" iconColor="#fff" onPress={onClose} />
        </View>
        <Avatar.Text
          size={isLandscapeDrawer ? 62 : 72}
          label={getUserInitials(user)}
          style={styles.avatar}
          labelStyle={styles.avatarLabel}
        />
        <Text variant="titleLarge" style={styles.username} numberOfLines={1}>
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
      </View>
    </ImageBackground>
  );

  const menuNode = (
    <Surface
      elevation={0}
      style={[
        styles.contentSurface,
        isLandscapeDrawer ? styles.contentSurfaceScrollable : null,
        { paddingBottom: 16 },
      ]}
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
  );

  const footerNode =
    canToggleCadete || canToggleEmpresa ? (
      <View
        style={[
          styles.footerDock,
          isLandscapeDrawer ? styles.footerDockScrollable : null,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {canToggleCadete ? (
          <ModeActionCard
            accessibilityLabel={cadeteButtonLabel}
            actionLabel={user?.modoCadete ? "Salir" : "Entrar"}
            description={cadeteHelperCopy}
            icon={cadeteButtonIcon}
            onPress={() => onToggleModoCadete?.()}
            title="Modo cadete"
          />
        ) : null}
        {canToggleEmpresa ? (
          <ModeActionCard
            accessibilityLabel={empresaButtonLabel}
            actionLabel={user?.modoEmpresa ? "Salir" : "Entrar"}
            description={empresaHelperCopy}
            icon={empresaButtonIcon}
            onPress={() => onToggleModoEmpresa?.()}
            title="Modo empresa"
          />
        ) : null}
      </View>
    ) : null;

  return (
    <View style={styles.safeArea}>
      <DrawerBlurShell style={styles.container}>
        {isLandscapeDrawer ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.drawerScrollableContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {headerNode}
            {menuNode}
            {footerNode}
          </ScrollView>
        ) : (
          <>
            {headerNode}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 12 },
              ]}
              bounces={false}
            >
              {menuNode}
            </ScrollView>
            {footerNode}
          </>
        )}
      </DrawerBlurShell>
    </View>
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
  heroLandscape: {
    minHeight: 188,
  },
  heroImage: {
    opacity: 0.3,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.34)",
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  heroOverlayLandscape: {
    paddingHorizontal: 16,
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
    marginTop: 10,
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
  drawerScrollableContent: {
    flexGrow: 1,
    paddingBottom: 6,
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
  contentSurfaceScrollable: {
    flexGrow: 0,
    justifyContent: "flex-start",
    minHeight: 0,
    paddingTop: 8,
    paddingBottom: 18,
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
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 6,
  },
  footerDockScrollable: {
    paddingTop: 2,
  },
  modeCardMotion: {
    borderRadius: 14,
  },
  footerCard: {
    backgroundColor: "#1e293b",
    borderColor: "rgba(148, 163, 184, 0.26)",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  modeRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 66,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modeRowPressed: {
    backgroundColor: "rgba(79, 93, 246, 0.14)",
  },
  modeIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(79, 93, 246, 0.18)",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  modeCopyWrap: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  footerTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "800",
  },
  footerCopy: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  modeAction: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: 8,
  },
  modeActionLabel: {
    color: "#c7d2fe",
    fontSize: 11,
    fontWeight: "800",
  },
});

export default DrawerOptionsAlls;
