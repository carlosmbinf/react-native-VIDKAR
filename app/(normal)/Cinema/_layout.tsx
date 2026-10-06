import { Tabs } from "expo-router";

export default function CinemaWebLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Peliculas" options={{ title: "Películas" }} />
      <Tabs.Screen name="Series" options={{ title: "Series" }} />
    </Tabs>
  );
}
