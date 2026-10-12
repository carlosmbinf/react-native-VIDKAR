import React from "react";
import { ScrollView } from "react-native";
import { Dialog, Portal, useTheme } from "react-native-paper";

const SettlementDrawer = ({
  actions,
  children,
  locked = false,
  onClose,
  open,
  title,
}) => {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog
        dismissable={!locked}
        onDismiss={onClose}
        style={{ backgroundColor: theme.colors.surface, maxHeight: "92%" }}
        visible={open}
      >
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content style={{ flexShrink: 1, paddingHorizontal: 0 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Dialog.Content>
        {actions ? <Dialog.Actions>{actions}</Dialog.Actions> : null}
      </Dialog>
    </Portal>
  );
};

export default SettlementDrawer;
