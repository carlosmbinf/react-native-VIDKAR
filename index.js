console.info("[AppEntry] Cargando entrypoint global antes de expo-router");

import "./services/location/cadeteBackgroundLocation.native";
import "./services/notifications/PushMessaging.native";

import "expo-router/entry";
