import React from "react";
import { View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

import DrawerBottom from "../drawer/DrawerBottom.native";

const SettlementDrawer = ({
  actions,
  allowSwipeToClose = true,
  children,
  locked = false,
  onClose,
  open,
  title,
}) => {
  const theme = useTheme();
  const requestClose = () => {
    if (!locked) onClose?.();
  };

  return (
    <DrawerBottom
      allowContentSwipeToClose={!locked}
      allowSwipeToClose={allowSwipeToClose && !locked}
      closeOnBackdropPress={!locked}
      footer={actions ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "flex-end" }}>{actions}</View> : null}
      headerContent={(
        <View style={{ alignItems: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
          <Text numberOfLines={1} style={{ color: theme.colors.onSurface, flex: 1 }} variant="titleMedium">
            {title}
          </Text>
          <IconButton
            accessibilityLabel="Cerrar"
            disabled={locked}
            icon="close"
            onPress={requestClose}
          />
        </View>
      )}
      keyboardShouldPersistTaps="handled"
      maxHeightRatio={0.92}
      onClose={requestClose}
      open={open}
      scrollable
      title={title}
    >
      {children}
    </DrawerBottom>
  );
};

export default SettlementDrawer;
