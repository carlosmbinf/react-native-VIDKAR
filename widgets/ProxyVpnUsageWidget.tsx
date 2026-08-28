import {
  HStack,
  Image,
  Link,
  ProgressView,
  Rectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  background,
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  padding,
  progressViewStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import type { WidgetEnvironment } from "expo-widgets";

type WidgetApi = {
  createWidget: typeof import("expo-widgets").createWidget;
};

const ExpoWidgets: WidgetApi | null = (() => {
  try {
    // expo-widgets solo está disponible en una development/production build iOS.
    return require("expo-widgets") as WidgetApi;
  } catch {
    return null;
  }
})();

export type ProxyVpnUsageWidgetProps = {
  authenticated: boolean;
  proxyEnabled: boolean;
  proxyProgress: number;
  proxyStatus: string;
  proxyUsed: string;
  vpnEnabled: boolean;
  vpnProgress: number;
  vpnStatus: string;
  vpnUsed: string;
  updatedAt: string;
};

const ProxyVpnUsageWidget = (
  props: ProxyVpnUsageWidgetProps,
  environment: WidgetEnvironment,
) => {
  "widget";

  const compact = environment.widgetFamily === "systemSmall";
  const isFullColor =
    environment.widgetRenderingMode == null ||
    environment.widgetRenderingMode === "fullColor";
  const primaryText = isFullColor
    ? "#FFFFFF"
    : { type: "hierarchical" as const, style: "primary" as const };
  const secondaryText = isFullColor
    ? "#B8C8E3"
    : { type: "hierarchical" as const, style: "secondary" as const };

  return (
    <ZStack
      alignment="leading"
      modifiers={[
        containerBackground(isFullColor ? "#091526" : "#000000", "widget"),
        clipShape("containerRelativeShape"),
      ]}
    >
      {isFullColor ? (
        <Rectangle
          modifiers={[
            foregroundStyle({
              type: "linearGradient",
              colors: ["#122A49", "#08111F"],
              startPoint: { x: 0, y: 0 },
              endPoint: { x: 1, y: 1 },
            }),
            frame({ maxHeight: Infinity, maxWidth: Infinity }),
          ]}
        />
      ) : null}

      <VStack
        alignment="leading"
        spacing={compact ? 8 : 10}
        modifiers={[padding({ all: compact ? 13 : 16 })]}
      >
        <HStack spacing={7}>
          <Image systemName="network" modifiers={[foregroundStyle("#64B5F6")]} />
          <Text modifiers={[font({ size: 13, weight: "bold" }), foregroundStyle(primaryText)]}>
            Consumo VIDKAR
          </Text>
          <Spacer />
          {!compact ? (
            <Link
              destination="vidkar://?widgetRefresh=1"
              label="Actualizar"
              modifiers={[
                font({ size: 11, weight: "semibold" }),
                foregroundStyle("#90CAF9"),
              ]}
            />
          ) : null}
        </HStack>

        {!props.authenticated ? (
          <VStack
            alignment="leading"
            spacing={6}
            modifiers={[
              background("#1AFFFFFF"),
              clipShape("roundedRectangle", 12),
              padding({ all: 12 }),
            ]}
          >
            <Text modifiers={[font({ size: 15, weight: "bold" }), foregroundStyle(primaryText)]}>
              Inicia sesión
            </Text>
            <Text modifiers={[font({ size: 11, weight: "medium" }), foregroundStyle(secondaryText)]}>
              Abre VIDKAR para consultar tu consumo.
            </Text>
          </VStack>
        ) : (
          <>
            <VStack
              alignment="leading"
              spacing={5}
              modifiers={[
                background("#1A2196F3"),
                clipShape("roundedRectangle", 12),
                padding({ all: compact ? 9 : 11 }),
              ]}
            >
              <HStack spacing={6}>
                <Image systemName="globe" modifiers={[foregroundStyle("#64B5F6")]} />
                <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle(primaryText)]}>
                  Proxy
                </Text>
                <Spacer />
                <Text modifiers={[font({ size: 11, weight: "semibold" }), foregroundStyle(props.proxyEnabled ? "#81D4FA" : secondaryText)]}>
                  {props.proxyStatus}
                </Text>
              </HStack>
              {!compact && props.proxyEnabled ? (
                <ProgressView
                  value={props.proxyProgress}
                  modifiers={[progressViewStyle("linear"), tint("#42A5F5")]}
                />
              ) : null}
              <Text modifiers={[font({ size: 11, weight: "medium" }), foregroundStyle(secondaryText)]}>
                Consumido: {props.proxyUsed}
              </Text>
            </VStack>

            <VStack
              alignment="leading"
              spacing={5}
              modifiers={[
                background("#1A4CAF50"),
                clipShape("roundedRectangle", 12),
                padding({ all: compact ? 9 : 11 }),
              ]}
            >
              <HStack spacing={6}>
                <Image systemName="shield.lefthalf.filled" modifiers={[foregroundStyle("#81C784")]} />
                <Text modifiers={[font({ size: 12, weight: "bold" }), foregroundStyle(primaryText)]}>
                  VPN
                </Text>
                <Spacer />
                <Text modifiers={[font({ size: 11, weight: "semibold" }), foregroundStyle(props.vpnEnabled ? "#A5D6A7" : secondaryText)]}>
                  {props.vpnStatus}
                </Text>
              </HStack>
              {!compact && props.vpnEnabled ? (
                <ProgressView
                  value={props.vpnProgress}
                  modifiers={[progressViewStyle("linear"), tint("#66BB6A")]}
                />
              ) : null}
              <Text modifiers={[font({ size: 11, weight: "medium" }), foregroundStyle(secondaryText)]}>
                Consumido: {props.vpnUsed}
              </Text>
            </VStack>
          </>
        )}

        <Spacer />
        <HStack>
          <Text modifiers={[font({ size: 9, weight: "medium" }), foregroundStyle(secondaryText)]}>
            Actualizado {props.updatedAt}
          </Text>
          <Spacer />
          {compact ? (
            <Link
              destination="vidkar://?widgetRefresh=1"
              label="Actualizar"
              modifiers={[font({ size: 9, weight: "semibold" }), foregroundStyle("#90CAF9")]}
            />
          ) : null}
        </HStack>
      </VStack>
    </ZStack>
  );
};

const widget = ExpoWidgets
  ? ExpoWidgets.createWidget("ProxyVpnUsageWidget", ProxyVpnUsageWidget)
  : {
      updateSnapshot: () => undefined,
    };

export default widget;
