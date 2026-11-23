import MeteorBase from "@meteorrn/core";
import { useEffect, useState } from "react";

import { ConfigCollection } from "../components/collections/collections";
import {
  IOS_COURSES_VISIBILITY_CONFIG_ID,
  isIosCoursesVisibilityEnabled,
} from "../services/courses/iosCourseVisibilityConfig";
import { syncIosCourseVisibility } from "../services/courses/iosCourseVisibility";

const Meteor = MeteorBase;

export default function useIosCoursesVisibility() {
  const [nativeSyncError, setNativeSyncError] = useState("");
  const visibility = Meteor.useTracker(() => {
    if (!Meteor.userId()) return { enabled: false, ready: true };

    const subscription = Meteor.subscribe("cursos.iosVisibility");
    const config = ConfigCollection.findOne({ _id: IOS_COURSES_VISIBILITY_CONFIG_ID });

    return {
      enabled: isIosCoursesVisibilityEnabled(config),
      ready: subscription.ready(),
    };
  }, []);

  useEffect(() => {
    if (process.env.EXPO_OS !== "ios" || !visibility.ready) {
      setNativeSyncError("");
      return;
    }

    let active = true;
    syncIosCourseVisibility(visibility.enabled).catch((error) => {
      if (!active) return;
      console.error("[Cursos iOS] No se pudo sincronizar la visibilidad con los accesos del sistema.", error);
      setNativeSyncError("No se pudo sincronizar la visibilidad de cursos con Siri y Spotlight. Actualiza VIDKAR y vuelve a abrirla.");
    }).then(() => {
      if (active) setNativeSyncError("");
    });
    return () => { active = false; };
  }, [visibility.enabled, visibility.ready]);

  return { ...visibility, nativeSyncError };
}
