import {
  Chart,
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
  padding,
  progressViewStyle,
  tint,
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

const COLORS = {
  blue: "#42A5F5",
  blueSoft: "#1A2196F3",
  green: "#66BB6A",
  greenSoft: "#1A4CAF50",
  muted: "#B8C8E3",
  panel: "#16FFFFFF",
  text: "#FFFFFF",
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

const dailyTotal = (props: ProxyVpnUsageWidgetProps, service: ServiceKey) =>
  props.dailyUsage.reduce(
    (total, point) => total + Number(point?.[service] || 0),
    0,
  );

const ProxyVpnUsageWidget = (
  props: ProxyVpnUsageWidgetProps,
  environment: WidgetEnvironment<WidgetConfiguration>,
) => {
  "widget";

  const family = environment.widgetFamily;
  const isSmall = family === "systemSmall";
  const isMedium = family === "systemMedium";
  const selectedService =
    environment.configuration?.service === "vpn" ? "vpn" : "proxy";
  const isFullColor =
    environment.widgetRenderingMode == null ||
    environment.widgetRenderingMode === "fullColor";
  const primaryText = isFullColor
    ? "#FFFFFF"
    : { type: "hierarchical" as const, style: "primary" as const };
  const secondaryText = isFullColor
    ? "#B8C8E3"
    : { type: "hierarchical" as const, style: "secondary" as const };

  const getService = (service: ServiceKey) =>
    service === "proxy"
      ? {
          accent: "#42A5F5",
          backgroundColor: "#1A2196F3",
          enabled: props.proxyEnabled,
          icon: "globe" as SFSymbol,
          progress: props.proxyProgress,
          status: props.proxyStatus,
          title: "Proxy",
          used: props.proxyUsed,
        }
      : {
          accent: "#66BB6A",
          backgroundColor: "#1A4CAF50",
          enabled: props.vpnEnabled,
          icon: "shield.lefthalf.filled" as SFSymbol,
          progress: props.vpnProgress,
          status: props.vpnStatus,
          title: "VPN",
          used: props.vpnUsed,
        };

  const renderServiceCard = (service: ServiceKey, compact = false) => {
    const data = getService(service);

    return (
      <VStack
        alignment="leading"
        spacing={compact ? 7 : 5}
        modifiers={[
          background(data.backgroundColor),
          clipShape("roundedRectangle", compact ? 14 : 11),
          padding({ all: compact ? 12 : 9 }),
        ]}
      >
        <HStack spacing={6}>
          <Image
            systemName={data.icon}
            modifiers={[foregroundStyle(data.accent)]}
          />
          <Text
            modifiers={[
              font({ size: compact ? 14 : 12, weight: "bold" }),
              foregroundStyle(primaryText),
            ]}
          >
            {data.title}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: compact ? 11 : 10, weight: "semibold" }),
              foregroundStyle(data.enabled ? data.accent : secondaryText),
            ]}
          >
            {data.status}
          </Text>
        </HStack>

        <Text
          modifiers={[
            font({ size: compact ? 22 : 11, weight: compact ? "bold" : "medium" }),
            foregroundStyle(compact ? primaryText : secondaryText),
          ]}
        >
          {compact ? data.used : `Consumido: ${data.used}`}
        </Text>

        {data.enabled ? (
          <ProgressView
            value={data.progress}
            modifiers={[progressViewStyle("linear"), tint(data.accent)]}
          />
        ) : null}
      </VStack>
    );
  };

  const renderChartPanel = () => {
    const chartData = props.dailyUsage.flatMap((point) => [
      {
        color: COLORS.blue,
        x: point.label,
        y: Math.max(0, Number(point.proxy || 0)),
      },
      {
        color: COLORS.green,
        x: point.label,
        y: Math.max(0, Number(point.vpn || 0)),
      },
    ]);
    const proxyTotal = dailyTotal(props, "proxy");
    const vpnTotal = dailyTotal(props, "vpn");

    return (
      <VStack
        alignment="leading"
        spacing={3}
        modifiers={[
          background("#16FFFFFF"),
          clipShape("roundedRectangle", 10),
          frame({ maxWidth: Infinity }),
          padding({ all: 8 }),
        ]}
      >
        <HStack spacing={4}>
          <Text
            modifiers={[
              font({ size: 11, weight: "bold" }),
              foregroundStyle(primaryText),
            ]}
          >
            Consumo de hoy
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 10, weight: "semibold" }),
              foregroundStyle(secondaryText),
            ]}
          >
            {props.dailyUsage.length > 0 ? "12 bloques" : "Sin datos"}
          </Text>
        </HStack>
        <HStack spacing={10}>
          <Text
            modifiers={[font({ size: 9, weight: "semibold" }), foregroundStyle(COLORS.blue)]}
          >
            ● Proxy {proxyTotal.toFixed(2)} MB
          </Text>
          <Text
            modifiers={[font({ size: 9, weight: "semibold" }), foregroundStyle(COLORS.green)]}
          >
            ● VPN {vpnTotal.toFixed(2)} MB
          </Text>
        </HStack>
        <Chart
          animate={false}
          barStyle={{ cornerRadius: 3, width: 4 }}
          data={
            chartData.length > 0
              ? chartData
              : [
                  { color: COLORS.blue, x: "—", y: 0 },
                  { color: COLORS.green, x: "—", y: 0 },
                ]
          }
          modifiers={[frame({ height: 76, maxWidth: Infinity })]}
          showGrid
          showLegend={false}
          type="bar"
        />
      </VStack>
    );
  };

  return (
    <ZStack
      alignment="leading"
      modifiers={[
        containerBackground(isFullColor ? "#091526" : "#000000", "widget"),
        clipShape("containerRelativeShape"),
      ]}
    >
      <VStack
        alignment="leading"
        spacing={isSmall ? 9 : 8}
        modifiers={[padding({ all: isSmall ? 13 : 14 })]}
      >
        <HStack spacing={7}>
          <Image systemName="network" modifiers={[foregroundStyle("#42A5F5")]} />
          <Text
            modifiers={[
              font({ size: isSmall ? 13 : 14, weight: "bold" }),
              foregroundStyle(primaryText),
            ]}
          >
            Consumo VIDKAR
          </Text>
          <Spacer />
          {!isSmall ? (
            <Link
              destination="vidkar://?widgetRefresh=1"
              label="Actualizar"
              modifiers={[
                font({ size: 10, weight: "semibold" }),
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
              background("#16FFFFFF"),
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
        ) : isSmall ? (
          renderServiceCard(
            environment.configuration?.service === "vpn" ? "vpn" : "proxy",
            true,
          )
        ) : isMedium ? (
          <VStack alignment="leading" spacing={7}>
            {renderServiceCard("proxy")}
            {renderServiceCard("vpn")}
          </VStack>
        ) : props.isAdmin ? (
          <VStack alignment="leading" spacing={8}>
            <Text modifiers={[font({ size: 16, weight: "bold" }), foregroundStyle(primaryText)]}>
              Proxy + VPN
            </Text>
            {renderChartPanel()}
          </VStack>
        ) : (
          renderServiceCard(selectedService, true)
        )}

        <HStack>
          <Text modifiers={[font({ size: 9, weight: "medium" }), foregroundStyle(secondaryText)]}>
            Actualizado {props.updatedAt}
          </Text>
          <Spacer />
          <Link
            destination="vidkar://?widgetRefresh=1"
            label="Actualizar"
            modifiers={[font({ size: 9, weight: "semibold" }), foregroundStyle("#90CAF9")]}
          />
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
