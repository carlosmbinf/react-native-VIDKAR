import { Chart, HStack, Image, ProgressView, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  background,
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  privacySensitive,
  progressViewStyle,
  tint,
  widgetAccentedRenderingMode,
} from "@expo/ui/swift-ui/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import type { SFSymbol } from "sf-symbols-typescript";

type ServiceKey = "proxy" | "vpn";
type ServiceQuota = { limit: string; exceeded: boolean };
type WidgetConfiguration = { service: ServiceKey };
type WidgetApi = { createWidget: typeof import("expo-widgets").createWidget };

const ExpoWidgets: WidgetApi | null = (() => {
  try {
    return require("expo-widgets") as WidgetApi;
  } catch {
    return null;
  }
})();

export type ProxyVpnUsageWidgetProps = {
  authenticated: boolean;
  dailyUsage: { label: string; proxy: number; vpn: number }[];
  dailyUsageDate?: number;
  isAdmin: boolean;
  mcpRefreshAvailable: boolean;
  mcpOwnerId: string | null;
  proxyEnabled: boolean;
  proxyProgress: number;
  proxyQuota?: ServiceQuota | false;
  proxyStatus: string;
  proxyUsed: string;
  vpnEnabled: boolean;
  vpnProgress: number;
  vpnQuota?: ServiceQuota | false;
  vpnStatus: string;
  vpnUsed: string;
  updatedAt: string;
  refreshMessage?: string;
};

const ProxyVpnUsageWidget = (
  props: ProxyVpnUsageWidgetProps,
  environment: WidgetEnvironment<WidgetConfiguration>,
) => {
  "widget";

  const isSmall = environment.widgetFamily === "systemSmall";
  const isLarge = environment.widgetFamily === "systemLarge";
  const renderingMode = environment.widgetRenderingMode ?? "fullColor";
  const isFullColor = renderingMode === "fullColor";
  const selectedService = environment.configuration?.service === "vpn" ? "vpn" : "proxy";
  const primaryText = isFullColor ? "#F4F7FF" : { type: "hierarchical" as const, style: "primary" as const };
  const secondaryText = isFullColor ? "#ACBCD2" : { type: "hierarchical" as const, style: "secondary" as const };

  const label = (size: number, strong = false) => [
    font({ size, weight: strong ? "semibold" : "medium" }),
    foregroundStyle(strong ? primaryText : secondaryText),
    lineLimit(1),
    minimumScaleFactor(0.75),
  ];

  const symbol = (accent: string) => [
    foregroundStyle(isFullColor ? accent : primaryText),
    ...(renderingMode === "accented" ? [widgetAccentedRenderingMode("accented")] : []),
  ];

  const getService = (service: ServiceKey) => {
    const isVPN = service === "vpn";
    const status = isVPN ? props.vpnStatus : props.proxyStatus;
    const progress = isVPN ? props.vpnProgress : props.proxyProgress;
    const quota = isVPN ? props.vpnQuota : props.proxyQuota;
    const legacyLimit = status?.split(" / ")[1];
    const legacyHasLimit = legacyLimit && Number(legacyLimit.split(" ")[0].replace(",", ".")) > 0;
    return {
      accent: isVPN ? "#69DFCF" : "#82B9FF",
      surface: isVPN ? "#132932" : "#16283F",
      enabled: isVPN ? props.vpnEnabled : props.proxyEnabled,
      icon: (isVPN ? "shield.lefthalf.filled" : "globe") as SFSymbol,
      progress: Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0,
      quota: quota === undefined && legacyHasLimit && legacyLimit
        ? { limit: legacyLimit, exceeded: false }
        : quota,
      status,
      title: isVPN ? "VPN" : "Proxy",
      used: isVPN ? props.vpnUsed : props.proxyUsed,
    };
  };

  const serviceCard = (service: ServiceKey) => {
    const data = getService(service);
    const percent = data.progress > 0 && data.progress < 0.01
      ? "<1 %" : `${Math.floor(data.progress * 100)} %`;
    const quotaLabel = data.quota
      ? (data.quota.exceeded ? "Cuota superada" : `${percent} de ${data.quota.limit}`)
      : (data.status === "Ilimitado" ? "Plan ilimitado" : "Cuota sin datos");
    const barColor = data.quota && data.quota.exceeded ? "#FFBB80" : data.accent;

    return (
      <VStack
        alignment="leading"
        spacing={5}
        modifiers={[
          frame({ maxWidth: Infinity, alignment: "leading" }),
          padding({ all: isSmall ? 9 : 11 }),
          ...(isFullColor ? [background(data.surface)] : []),
          clipShape("roundedRectangle", 14),
          privacySensitive(),
        ]}
      >
        <HStack spacing={4}>
          <Image systemName={data.icon} modifiers={symbol(data.accent)} />
          <Text modifiers={label(12, true)}>{data.title}</Text>
          <Spacer minLength={3} />
          <Text modifiers={label(9)}>{data.enabled ? "Activo" : "Inactivo"}</Text>
        </HStack>

        <Text modifiers={[...label(isLarge ? 25 : 22, true), monospacedDigit()]}>
          {data.used}
        </Text>

        {data.quota ? (
          <ProgressView
            value={data.progress}
            modifiers={[
              progressViewStyle("linear"),
              ...(isFullColor ? [tint(barColor)] : []),
              accessibilityLabel(`${data.title}: ${quotaLabel}`),
            ]}
          />
        ) : null}
        <Text modifiers={label(9)}>{quotaLabel}</Text>
      </VStack>
    );
  };

  const loginCard = () => (
    <VStack alignment="leading" spacing={5} modifiers={[padding({ vertical: 8 })]}>
      <Text modifiers={label(17, true)}>Inicia sesión</Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(secondaryText), lineLimit(2)]}>
        Abre VIDKAR para consultar tu consumo.
      </Text>
    </VStack>
  );

  const activity = () => {
    const data = getService(selectedService);
    const samples = props.dailyUsageDate && new Date(props.dailyUsageDate).toDateString() === new Date().toDateString()
      ? props.dailyUsage ?? [] : [];
    const points = samples.slice(-12).flatMap((point, index) => {
      const value = Number(point[selectedService]);
      return Number.isFinite(value) && value >= 0
        ? [{ x: String(index), y: value, label: point.label, color: isFullColor ? data.accent : "#FFFFFF" }]
        : [];
    });
    const total = points.reduce((sum, point) => sum + point.y, 0);
    const totalLabel = total >= 1024 ? `${(total / 1024).toFixed(2)} GB` : `${total.toFixed(1)} MB`;

    return (
      <VStack
        alignment="leading"
        spacing={7}
        modifiers={[
          frame({ maxWidth: Infinity, alignment: "leading" }),
          padding({ all: 11 }),
          ...(isFullColor ? [background("#101F30")] : []),
          clipShape("roundedRectangle", 14),
          privacySensitive(),
        ]}
      >
        <HStack spacing={6}>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={label(14, true)}>Actividad de hoy</Text>
            <Text modifiers={label(10)}>{data.title} · bloques de 2 horas</Text>
          </VStack>
          <Spacer />
          {points.length ? (
            <Text modifiers={[...label(15, true), monospacedDigit()]}>{totalLabel}</Text>
          ) : null}
        </HStack>

        {total > 0 ? (
          <VStack alignment="leading" spacing={4}>
            <Chart
              type="bar"
              data={points.map(({ x, y, color }) => ({ x, y, color }))}
              showGrid={false}
              showLegend={false}
              animate={false}
              barStyle={{ cornerRadius: 3 }}
              modifiers={[
                frame({ height: 80 }),
                accessibilityLabel(`Consumo de hoy de ${data.title}: ${totalLabel}. ${points.map((point) => `${point.label}: ${point.y} MB`).join(", ")}`),
              ]}
            />
            <HStack spacing={0}>
              {points.map((point, index) => (
                <Text key={point.x} modifiers={[...label(8), frame({ maxWidth: Infinity })]}>
                  {index % 3 === 0 || index === points.length - 1 ? point.label : " "}
                </Text>
              ))}
            </HStack>
          </VStack>
        ) : (
          <Text modifiers={label(11)}>
            {points.length ? "Sin tráfico registrado hoy." : "Historial no disponible."}
          </Text>
        )}
      </VStack>
    );
  };

  return (
    <VStack
      alignment="leading"
      spacing={isLarge ? 10 : 7}
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" }),
        padding({ all: isSmall ? 10 : 13 }),
        containerBackground(isFullColor ? "#0A1525" : "#000000", "widget"),
      ]}
    >
      <HStack spacing={5}>
        <Image systemName="network" modifiers={symbol("#82B9FF")} />
        <Text modifiers={label(12, true)}>VIDKAR</Text>
        <Spacer />
      </HStack>

      {!props.authenticated ? loginCard() : isSmall ? serviceCard(selectedService) : (
        <VStack alignment="leading" spacing={10}>
          <HStack spacing={8}>
            {serviceCard("proxy")}
            {serviceCard("vpn")}
          </HStack>
          {isLarge ? activity() : null}
        </VStack>
      )}

      {props.authenticated ? (
        <Text modifiers={label(9)}>
          {props.refreshMessage ? "Actualización no disponible" : `Actualizado ${props.updatedAt}`}
        </Text>
      ) : null}
    </VStack>
  );
};

const widget = ExpoWidgets
  ? ExpoWidgets.createWidget("ProxyVpnUsageWidget", ProxyVpnUsageWidget)
  : { updateSnapshot: () => undefined };

export default widget;
