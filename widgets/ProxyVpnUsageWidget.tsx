import {
  HStack,
  Image,
  Link,
  ProgressView,
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
  lineLimit,
  padding,
  progressViewStyle,
  tint,
  widgetAccentedRenderingMode,
} from "@expo/ui/swift-ui/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import type { SFSymbol } from "sf-symbols-typescript";

type WidgetApi = {
  createWidget: typeof import("expo-widgets").createWidget;
};

type WidgetConfiguration = {
  service: "proxy" | "vpn";
};

type ServiceKey = "proxy" | "vpn";

const ExpoWidgets: WidgetApi | null = (() => {
  try {
    return require("expo-widgets") as WidgetApi;
  } catch {
    return null;
  }
})();

export type ProxyVpnUsageWidgetProps = {
  authenticated: boolean;
  dailyUsage: {
    label: string;
    proxy: number;
    vpn: number;
  }[];
  isAdmin: boolean;
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
  environment: WidgetEnvironment<WidgetConfiguration>,
) => {
  "widget";

  const family = environment.widgetFamily;
  const isSmall = family === "systemSmall";
  const isMedium = family === "systemMedium";
  const isLarge = family === "systemLarge";
  const renderingMode = environment.widgetRenderingMode ?? "fullColor";
  const isFullColor = renderingMode === "fullColor";
  const isAccented = renderingMode === "accented";
  const selectedService =
    environment.configuration?.service === "vpn" ? "vpn" : "proxy";

  // iOS tinted/Liquid Glass mode replaces the widget background and recolors
  // transparent content. Keep the detailed color treatment only in fullColor.
  const primaryText = isFullColor
    ? "#FFFFFF"
    : { type: "hierarchical" as const, style: "primary" as const };
  const secondaryText = isFullColor
    ? "#AEBED8"
    : { type: "hierarchical" as const, style: "secondary" as const };

  const getService = (service: ServiceKey) =>
    service === "proxy"
      ? {
          accent: "#4DA3FF",
          backgroundColor: "#152B67",
          enabled: props.proxyEnabled,
          icon: "globe" as SFSymbol,
          progress: props.proxyProgress,
          status: props.proxyStatus,
          title: "Proxy",
          used: props.proxyUsed,
        }
      : {
          accent: "#69D27B",
          backgroundColor: "#163A32",
          enabled: props.vpnEnabled,
          icon: "shield.lefthalf.filled" as SFSymbol,
          progress: props.vpnProgress,
          status: props.vpnStatus,
          title: "VPN",
          used: props.vpnUsed,
        };

  const imageModifiers = (accent: string) => [
    foregroundStyle(accent),
    ...(isAccented ? [widgetAccentedRenderingMode("accented")] : []),
  ];

  const renderServiceCard = (service: ServiceKey, compact = false) => {
    const data = getService(service);

    return (
      <VStack
        alignment="leading"
        spacing={compact ? 8 : 6}
        modifiers={[
          ...(isFullColor ? [background(data.backgroundColor)] : []),
          clipShape("roundedRectangle", compact ? 16 : 13),
          padding({ all: compact ? 13 : 10 }),
        ]}
      >
        <HStack spacing={6}>
          <Image systemName={data.icon} modifiers={imageModifiers(data.accent)} />
          <Text
            modifiers={[
              font({ size: compact ? 14 : 12, weight: "bold" }),
              foregroundStyle(primaryText),
              lineLimit(1),
            ]}
          >
            {data.title}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: compact ? 11 : 10, weight: "semibold" }),
              foregroundStyle(data.enabled ? data.accent : secondaryText),
              lineLimit(1),
            ]}
          >
            {data.status}
          </Text>
        </HStack>

        <Text
          modifiers={[
            font({ size: compact ? 24 : 12, weight: compact ? "bold" : "medium" }),
            foregroundStyle(compact ? primaryText : secondaryText),
            lineLimit(1),
          ]}
        >
          {data.used}
        </Text>

        {compact && data.enabled && !isAccented ? (
          <ProgressView
            value={Math.max(0, Math.min(1, data.progress))}
            modifiers={[progressViewStyle("linear"), tint(data.accent)]}
          />
        ) : null}
      </VStack>
    );
  };

  const renderLoginCard = () => (
    <VStack
      alignment="leading"
      spacing={7}
      modifiers={[
        ...(isFullColor ? [background("#142B4C")] : []),
        clipShape("roundedRectangle", 16),
        padding({ all: isSmall ? 12 : 14 }),
      ]}
    >
      <HStack spacing={8}>
        <Image
          systemName="person.crop.circle.badge.arrow.right"
          modifiers={imageModifiers("#4DA3FF")}
        />
        <Text
          modifiers={[
            font({ size: isSmall ? 16 : 18, weight: "bold" }),
            foregroundStyle(primaryText),
            lineLimit(1),
          ]}
        >
          Inicia sesión
        </Text>
      </HStack>
      <Text
        modifiers={[
          font({ size: isSmall ? 11 : 12, weight: "medium" }),
          foregroundStyle(secondaryText),
          lineLimit(2),
        ]}
      >
        Abre VIDKAR para consultar tu consumo.
      </Text>
    </VStack>
  );

  const renderActivity = () => {
    const service = selectedService;
    const data = getService(service);
    const points = props.dailyUsage.slice(-7);
    const maxValue = Math.max(
      1,
      ...points.map((point) => Math.max(0, Number(point[service]) || 0)),
    );

    return (
      <VStack
        alignment="leading"
        spacing={9}
        modifiers={[
          ...(isFullColor ? [background("#0E2037")] : []),
          clipShape("roundedRectangle", 16),
          padding({ all: 13 }),
        ]}
      >
        <HStack spacing={6}>
          <VStack alignment="leading" spacing={2}>
            <Text
              modifiers={[
                font({ size: 15, weight: "bold" }),
                foregroundStyle(primaryText),
                lineLimit(1),
              ]}
            >
              Actividad reciente
            </Text>
            <Text
              modifiers={[
                font({ size: 10, weight: "medium" }),
                foregroundStyle(secondaryText),
                lineLimit(1),
              ]}
            >
              Consumo de {data.title.toLowerCase()} · últimos 7 bloques
            </Text>
          </VStack>
          <Spacer />
          <Image systemName={data.icon} modifiers={imageModifiers(data.accent)} />
        </HStack>

        {points.length > 0 ? (
          <VStack alignment="leading" spacing={7}>
            {points.map((point, index) => {
              const value = Math.max(0, Number(point[service]) || 0);
              const ratio = Math.max(0, Math.min(1, value / maxValue));

              return (
                <VStack key={`${point.label}-${index}`} alignment="leading" spacing={3}>
                  <HStack spacing={6}>
                    <Text
                      modifiers={[
                        font({ size: 10, weight: "semibold" }),
                        foregroundStyle(secondaryText),
                        lineLimit(1),
                      ]}
                    >
                      {point.label}
                    </Text>
                    <Spacer />
                    <Text
                      modifiers={[
                        font({ size: 10, weight: "bold" }),
                        foregroundStyle(primaryText),
                        lineLimit(1),
                      ]}
                    >
                      {value.toFixed(2)} MB
                    </Text>
                  </HStack>
                  <ProgressView
                    value={ratio}
                    modifiers={[
                      progressViewStyle("linear"),
                      tint(data.accent),
                    ]}
                  />
                </VStack>
              );
            })}
          </VStack>
        ) : (
          <Text
            modifiers={[
              font({ size: 11, weight: "medium" }),
              foregroundStyle(secondaryText),
            ]}
          >
            Todavía no hay datos de consumo para mostrar.
          </Text>
        )}
      </VStack>
    );
  };

  const renderLargeContent = () => (
    <VStack alignment="leading" spacing={10}>
      <VStack alignment="leading" spacing={2}>
        <Text
          modifiers={[
            font({ size: 17, weight: "bold" }),
            foregroundStyle(primaryText),
            lineLimit(1),
          ]}
        >
          Tus servicios
        </Text>
        <Text
          modifiers={[
            font({ size: 10, weight: "medium" }),
            foregroundStyle(secondaryText),
            lineLimit(1),
          ]}
        >
          Estado y consumo actual
        </Text>
      </VStack>

      <HStack spacing={9}>
        <VStack modifiers={[frame({ maxWidth: Infinity })]}>
          {renderServiceCard("proxy", true)}
        </VStack>
        <VStack modifiers={[frame({ maxWidth: Infinity })]}>
          {renderServiceCard("vpn", true)}
        </VStack>
      </HStack>

      {renderActivity()}
    </VStack>
  );

  const renderAuthenticatedContent = () => {
    if (isSmall) return renderServiceCard(selectedService, true);

    if (isMedium) {
      return (
        <HStack spacing={8}>
          {renderServiceCard("proxy", true)}
          {renderServiceCard("vpn", true)}
        </HStack>
      );
    }

    if (isLarge) return renderLargeContent();

    return renderServiceCard(selectedService, true);
  };

  return (
    <ZStack
      alignment="leading"
      modifiers={[
        containerBackground(isFullColor ? "#081524" : "#000000", "widget"),
        clipShape("containerRelativeShape"),
      ]}
    >
      <VStack
        alignment="leading"
        spacing={isSmall ? 10 : isMedium ? 11 : 12}
        modifiers={[padding({ all: isSmall ? 12 : isMedium ? 14 : 16 })]}
      >
        <HStack spacing={7}>
          <Image systemName="network" modifiers={imageModifiers("#4DA3FF")} />
          <Text
            modifiers={[
              font({ size: isSmall ? 13 : 15, weight: "bold" }),
              foregroundStyle(primaryText),
              lineLimit(1),
            ]}
          >
            VIDKAR
          </Text>
          <Spacer />
          {!isSmall ? (
            <Link
              destination="vidkar://?widgetRefresh=1"
              label="↻"
              modifiers={[
                font({ size: 17, weight: "bold" }),
                foregroundStyle("#90CAF9"),
              ]}
            />
          ) : null}
        </HStack>

        {!props.authenticated ? renderLoginCard() : renderAuthenticatedContent()}

        <HStack spacing={4}>
          <Text
            modifiers={[
              font({ size: 9, weight: "medium" }),
              foregroundStyle(secondaryText),
              lineLimit(1),
            ]}
          >
            Actualizado {props.updatedAt}
          </Text>
          <Spacer />
          {!isSmall ? (
            <Text
              modifiers={[
                font({ size: 9, weight: "semibold" }),
                foregroundStyle(secondaryText),
                lineLimit(1),
              ]}
            >
              Toca para actualizar
            </Text>
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
