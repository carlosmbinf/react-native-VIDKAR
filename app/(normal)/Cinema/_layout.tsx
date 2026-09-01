import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function CinemaLayout() {
  return (
    <NativeTabs disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="Peliculas">
        <NativeTabs.Trigger.Label>Películas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="film" md="movie" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="Series">
        <NativeTabs.Trigger.Label>Series</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tv" md="tv" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
