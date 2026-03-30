import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Appbar, Menu, useTheme } from "react-native-paper";

import { BlurView } from "expo-blur";
import WizardConStepper from "../carritoCompras/WizardConStepper.native";
import MenuIconMensajes from "../components/MenuIconMensajes.native";
import {
  DARK_MENU_GLASS_TINT,
  LIGHT_MENU_GLASS_TINT,
} from "../shared/GlassMenuSurface";
import AppHeader, { DEFAULT_HEADER_COLOR } from "./AppHeader";

const MenuHeader = ({
  backgroundColor = DEFAULT_HEADER_COLOR,
  title,
  subtitle,
  onOpenDrawer,
  onOpenProfile,
  onOpenMessages,
  onLogout,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const theme = useTheme();
  const menuTintColor = theme.dark
    ? DARK_MENU_GLASS_TINT
    : LIGHT_MENU_GLASS_TINT;

  const closeMenu = () => setMenuVisible(false);

  return (
    <AppHeader
      backgroundColor={backgroundColor}
      includeSafeAreaTop={false}
      title={title || "VIDKAR"}
      subtitle={subtitle}
      titleStyle={styles.title}
      subtitleStyle={styles.subtitle}
      left={
        <Appbar.Action icon="menu" iconColor="#fff" onPress={onOpenDrawer} />
      }
      actions={
        <View style={styles.actionsRow}>
          <MenuIconMensajes onOpenMessages={onOpenMessages} />
          <WizardConStepper />
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <Appbar.Action
                icon="dots-vertical"
                iconColor="#fff"
                onPress={() => setMenuVisible(true)}
              />
            }
            contentStyle={styles.menuContent}
            anchorPosition="bottom"
          >
            <BlurView
              tint={menuTintColor}
              style={{
                borderRadius: 25,
                overflow: "hidden",
                backgroundColor: menuTintColor,
                borderWidth: 0.5,
                borderColor: "rgba(255,255,255,0.22)",
              }}
              intensity={15}
            >
              <Menu.Item
                leadingIcon="account-circle-outline"
                title="Mi usuario"
                onPress={() => {
                  closeMenu();
                  onOpenProfile?.();
                }}
              />
              <Menu.Item
                leadingIcon="logout"
                title="Cerrar sesión"
                onPress={() => {
                  closeMenu();
                  onLogout?.();
                }}
              />
            </BlurView>
          </Menu>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  title: {
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 1,
  },
  menuContent: {
    backgroundColor: "transparent",
    overflow: "visible",
    padding: 0,
  },
});

export default MenuHeader;
