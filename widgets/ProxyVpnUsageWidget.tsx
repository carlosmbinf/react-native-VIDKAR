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
  const isLarge = family === "systemLarge";
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
    const data = getService(selectedService);
    const chartData = props.dailyUsage.map((point) => ({
      color: data.accent,
      x: point.label,
      y: Math.max(0, Number(point[selectedService] || 0)),
    }));
    const total = dailyTotal(props, selectedService);

    return (
      <VStack
        alignment="leading"
        spacing={7}
        modifiers={[
          background("#14FFFFFF"),
          clipShape("roundedRectangle", 16),
          frame({ maxWidth: Infinity }),
          padding({ all: 12 }),
        ]}
      >
        <HStack spacing={4}>
          <VStack alignment="leading" spacing={2}>
            <Text
              modifiers={[
                font({ size: 12, weight: "bold" }),
                foregroundStyle(primaryText),
              ]}
            >
              Consumo de hoy
            </Text>
            <Text
              modifiers={[
                font({ size: 10, weight: "medium" }),
                foregroundStyle(secondaryText),
              ]}
            >
              {data.title} · últimos bloques
            </Text>
          </VStack>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 18, weight: "bold" }),
              foregroundStyle(data.accent),
            ]}
          >
            {total.toFixed(2)} MB
          </Text>
        </HStack>
        <Chart
          animate={false}
          barStyle={{ cornerRadius: 4, width: 7 }}
          data={
            chartData.length > 0
              ? chartData
              : [{ color: data.accent, x: "—", y: 0 }]
          }
          modifiers={[frame({ height: 112, maxWidth: Infinity })]}
          showGrid
          showLegend={false}
          type="bar"
        />
        <HStack spacing={5}>
          <Image
            systemName={data.icon}
            modifiers={[foregroundStyle(data.accent)]}
          />
          <Text
            modifiers={[
              font({ size: 10, weight: "semibold" }),
              foregroundStyle(secondaryText),
            ]}
          >
            {props.dailyUsage.length > 0
              ? `${props.dailyUsage.length} bloques registrados`
              : "Aún no hay datos de consumo"}
          </Text>
        </HStack>
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
        spacing={isSmall ? 10 : isMedium ? 11 : 12}
        modifiers={[padding({ all: isSmall ? 12 : isMedium ? 14 : 16 })]}
      >
        <HStack spacing={7}>
          <Image systemName="network" modifiers={[foregroundStyle("#42A5F5")]} />
          <Text
            modifiers={[
              font({ size: isSmall ? 13 : 15, weight: "bold" }),
              foregroundStyle(primaryText),
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
          <HStack spacing={8}>
            {renderServiceCard("proxy", true)}
            {renderServiceCard("vpn", true)}
          </HStack>
        ) : isLarge ? (
          renderChartPanel()
        ) : (
          renderServiceCard(selectedService, true)
        )}

        <HStack spacing={4}>
          <Text modifiers={[font({ size: 9, weight: "medium" }), foregroundStyle(secondaryText)]}>
            Actualizado {props.updatedAt}
          </Text>
          <Spacer />
          {!isSmall ? (
            <Text modifiers={[font({ size: 9, weight: "semibold" }), foregroundStyle(secondaryText)]}>
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
