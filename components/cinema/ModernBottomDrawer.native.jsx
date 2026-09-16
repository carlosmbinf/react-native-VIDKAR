import DrawerBottom from "../drawer/DrawerBottom.native";

/**
 * Adaptador histórico para los detalles de películas y series.
 * La implementación visual y de interacción vive en DrawerBottom.
 */
export default function ModernBottomDrawer({
  children,
  footer,
  header,
  onDismiss,
  palette,
  visible,
}) {
  return (
    <DrawerBottom
      headerContent={header}
      onClose={onDismiss}
      open={visible}
      footer={footer}
      scrollable
      showHeader={Boolean(header)}
      surfaceStyle={{
        borderColor: palette?.border || "rgba(255, 255, 255, 0.16)",
        borderWidth: 1,
      }}
    >
      {children}
    </DrawerBottom>
  );
}
