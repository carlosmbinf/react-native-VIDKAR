import MeteorBase from "@meteorrn/core";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Appbar, Menu, useTheme } from "react-native-paper";

import AppHeader from "../../Header/AppHeader";
import MenuIconMensajes from "../../components/MenuIconMensajes.native";
import { EMPRESA_BRAND, createEmpresaPalette } from "../styles/empresaTheme";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const EmpresaTopBar = ({
  title,
  subtitle,
  onOpenDrawer,
  backHref = "/(empresa)/EmpresaNavigator",
  onLogout,
  rightActions,
}) => {
  const router = useRouter();
  const theme = useTheme();
  const palette = createEmpresaPalette(theme);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (backHref) {
      router.replace(backHref);
    }
  };

  const handleLogout = () => {
    setMenuVisible(false);

    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    Meteor.logout(() => {
      router.replace("/(auth)/Loguin");
    });
  };

  const actions = (
    <View style={styles.actionsRow}>
      {rightActions ? <View style={styles.injectedAction}>{rightActions}</View> : null}

      <MenuIconMensajes
        onOpenMessages={(item) => {
          if (item) {
            router.push({
              pathname: "/(empresa)/Mensaje",
              params: { item },
            });
            return;
          }

          router.push("/(empresa)/Mensaje");
        }}
      />

      <Menu
        anchor={<Appbar.Action icon="dots-vertical" iconColor="#ffffff" onPress={() => setMenuVisible(true)} />}
        contentStyle={[
          styles.menuContent,
          {
            backgroundColor: palette.menu,
            borderColor: palette.border,
          },
        ]}
        onDismiss={() => setMenuVisible(false)}
        visible={menuVisible}
      >
        <Menu.Item
          leadingIcon="account-circle-outline"
          onPress={() => {
            setMenuVisible(false);
            router.push("/(empresa)/User");
          }}
          title="Mi usuario"
        />
        <Menu.Item
          leadingIcon="logout"
          onPress={handleLogout}
          title="Cerrar sesión"
        />
      </Menu>
    </View>
  );

  return (
    <AppHeader
      actions={actions}
      backgroundColor={EMPRESA_BRAND}
      backHref={backHref}
      left={
        onOpenDrawer ? (
          <Appbar.Action icon="menu" iconColor="#ffffff" onPress={onOpenDrawer} />
        ) : null
      }
      onBack={handleBack}
      showBackButton={!onOpenDrawer}
      subtitle={subtitle}
      title={title}
    />
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: "center",
    flexDirection: "row",
    marginRight: 2,
  },
  injectedAction: {
    alignItems: "center",
    flexDirection: "row",
  },
  menuContent: {
    borderRadius: 18,
    borderWidth: 1,
    minWidth: 204,
    overflow: "hidden",
  },
});

export default EmpresaTopBar;