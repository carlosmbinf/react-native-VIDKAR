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
        spacing={compact ? 9 : 6}
        modifiers={[
          // Padding comes before the background so the content gets real
          // breathing room inside the colored surface.
          padding({ all: compact ? 14 : 10 }),
          ...(isFullColor ? [background(data.backgroundColor)] : []),
          clipShape("roundedRectangle", compact ? 18 : 13),
        ]}
      >
        <HStack spacing={7}>
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
          <HStack spacing={4}>
            <Image
              systemName="circle.fill"
              modifiers={imageModifiers(data.enabled ? data.accent : "#7E8CA3")}
            />
            <Text
              modifiers={[
                font({ size: compact ? 10 : 9, weight: "semibold" }),
                foregroundStyle(data.enabled ? data.accent : secondaryText),
                lineLimit(1),
              ]}
            >
              {data.status}
            </Text>
          </HStack>
        </HStack>

        <Text
          modifiers={[
            font({ size: compact ? 25 : 12, weight: compact ? "bold" : "medium" }),
            foregroundStyle(primaryText),
            lineLimit(1),
          ]}
        >
          {data.used}
        </Text>

        {compact && !isAccented ? (
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
        padding({ all: isSmall ? 12 : 14 }),
        ...(isFullColor ? [background("#142B4C")] : []),
        clipShape("roundedRectangle", 16),
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
        spacing={10}
        modifiers={[
          padding({ all: 14 }),
          ...(isFullColor ? [background("#0E2037")] : []),
          clipShape("roundedRectangle", 18),
        ]}
      >
        <HStack spacing={7}>
          <VStack alignment="leading" spacing={2}>
            <Text
              modifiers={[
                font({ size: 14, weight: "bold" }),
                foregroundStyle(primaryText),
                lineLimit(1),
              ]}
            >
              Actividad reciente
            </Text>
            <Text
              modifiers={[
                font({ size: 9, weight: "medium" }),
                foregroundStyle(secondaryText),
                lineLimit(1),
              ]}
            >
              {data.title} · últimos 7 bloques
            </Text>
          </VStack>
          <Spacer />
          <Image systemName={data.icon} modifiers={imageModifiers(data.accent)} />
        </HStack>

        {points.length > 0 ? (
          <VStack alignment="leading" spacing={6}>
            {points.map((point, index) => {
              const value = Math.max(0, Number(point[service]) || 0);
              const ratio = Math.max(0, Math.min(1, value / maxValue));

              return (
                <HStack key={`${point.label}-${index}`} spacing={7}>
                  <Text
                    modifiers={[
                      frame({ width: 22 }),
                      font({ size: 9, weight: "semibold" }),
                      foregroundStyle(secondaryText),
                      lineLimit(1),
                    ]}
                  >
                    {point.label}
                  </Text>
                  <VStack modifiers={[frame({ maxWidth: Infinity })]}>
                    <ProgressView
                      value={ratio}
                      modifiers={[
                        progressViewStyle("linear"),
                        tint(data.accent),
                      ]}
                    />
                  </VStack>
                  <Text
                    modifiers={[
                      frame({ width: 48 }),
                      font({ size: 9, weight: "bold" }),
                      foregroundStyle(primaryText),
                      lineLimit(1),
                    ]}
                  >
                    {value.toFixed(2)} MB
                  </Text>
                </HStack>
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
    <VStack alignment="leading" spacing={11}>
      <HStack spacing={6}>
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
        <Spacer />
        <Image systemName="chart.bar.fill" modifiers={imageModifiers("#90CAF9")} />
      </HStack>

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
