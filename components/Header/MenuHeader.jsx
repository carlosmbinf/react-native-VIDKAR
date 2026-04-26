import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Appbar, Menu } from "react-native-paper";

import WizardConStepper from "../carritoCompras/WizardConStepper.native";
import MenuIconMensajes from "../components/MenuIconMensajes.native";
import AppHeader, { DEFAULT_HEADER_COLOR } from "./AppHeader";
import BlurMenuSurface, { blurMenuContentStyle } from "./BlurMenuSurface";

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

  const closeMenu = () => setMenuVisible(false);

  return (
    <AppHeader
      backgroundColor={backgroundColor}
      overlapContent
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
            <BlurMenuSurface>
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
            </BlurMenuSurface>
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
    ...blurMenuContentStyle,
  },
});

export default MenuHeader;
