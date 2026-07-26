import MeteorBase from "@meteorrn/core";
import { LinearGradient } from "expo-linear-gradient";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, Image, Modal as NativeModal, Pressable, ScrollView, StatusBar, StyleSheet, UIManager, View } from "react-native";
import { ActivityIndicator, Button, Divider, Icon, IconButton, Surface, Text, useTheme } from "react-native-paper";

import AppHeader, { useAppHeaderContentInset } from "../Header/AppHeader";
import { CursosCollection, LeccionesCursoCollection, SuscripcionesCursoCollection } from "../collections/collections";

const { VLCPlayer } = require("react-native-vlc-media-player");
const Meteor = MeteorBase;
const isVlcPlayerAvailable = Boolean(
  UIManager.getViewManagerConfig?.("RCTVLCPlayer"),
);
const VLC_BUFFER_OPTIONS = Object.freeze([
  "--network-caching=1500",
  "--live-caching=1500",
  "--file-caching=1200",
  "--disc-caching=1200",
  "--http-reconnect",
  "--avcodec-fast",
]);
const COURSE_PLAYBACK_CACHE_KEY = "vidkar.coursePlaybackCache.v1";
const COURSE_RESUME_MIN_SECONDS = 15;
const COURSE_PROGRESS_SAVE_INTERVAL_SECONDS = 5;

const callMethod = (name, ...args) => new Promise((resolve, reject) => {
  Meteor.call(name, ...args, (error, result) => (error ? reject(error) : resolve(result)));
});

const readCoursePlaybackCache = async () => {
  try {
    const rawValue = await SecureStore.getItemAsync(COURSE_PLAYBACK_CACHE_KEY);
    return rawValue ? JSON.parse(rawValue) : {};
  } catch (_error) {
    return {};
  }
};

const getCoursePlayback = async (lessonId) => {
  const cache = await readCoursePlaybackCache();
  return cache?.[lessonId]?.playback || { completed: false, currentTime: 0, duration: 0 };
};

const saveCoursePlayback = async (lessonId, playback) => {
  if (!lessonId) return;
  const cache = await readCoursePlaybackCache();
  await SecureStore.setItemAsync(COURSE_PLAYBACK_CACHE_KEY, JSON.stringify({
    ...cache,
    [lessonId]: { playback: { ...playback, updatedAt: new Date().toISOString() } },
  })).catch(() => undefined);
};

const selectCourseStartAt = async (lessonId) => {
  const cachedPlayback = await getCoursePlayback(lessonId);
  const currentTime = Number(cachedPlayback.currentTime || 0);
  const duration = Number(cachedPlayback.duration || 0);
  const canResume = !cachedPlayback.completed
    && currentTime > COURSE_RESUME_MIN_SECONDS
    && (!duration || currentTime < Math.max(0, duration - COURSE_RESUME_MIN_SECONDS));

  if (!canResume) return 0;

  return new Promise((resolve) => {
    Alert.alert(
      "Continuar reproducción",
      `Encontramos un punto guardado en ${formatPlaybackTime(currentTime * 1000)}.`,
      [
        { text: "Empezar de nuevo", onPress: () => resolve(0) },
        { text: "Continuar", onPress: () => resolve(Math.floor(currentTime)) },
      ],
      { cancelable: false },
    );
  });
};

const formatPlaybackTime = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const CourseVideoPlayer = ({ durationSeconds, lesson, sourceUrl, startAtSeconds, onClose, onRetry }) => {
  const [paused, setPaused] = React.useState(false);
  const [playerError, setPlayerError] = React.useState(null);
  const [buffering, setBuffering] = React.useState(true);
  const [hasRenderedFrame, setHasRenderedFrame] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [playback, setPlayback] = React.useState({ currentTime: 0, duration: 0, position: 0 });
  const playerRef = React.useRef(null);
  const interruptionTimerRef = React.useRef(null);
  const persistedPlaybackSecondsRef = React.useRef(Number(startAtSeconds || 0));

  const clearInterruptionTimer = React.useCallback(() => {
    if (interruptionTimerRef.current) clearTimeout(interruptionTimerRef.current);
    interruptionTimerRef.current = null;
  }, []);

  React.useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => null);
    return () => {
      clearInterruptionTimer();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch(() => null);
    };
  }, [clearInterruptionTimer]);

  React.useEffect(() => {
    setPaused(false);
    setPlayerError(null);
    setBuffering(true);
    setHasRenderedFrame(false);
    setIsPlaying(false);
    setPlayback({ currentTime: Number(startAtSeconds || 0) * 1000, duration: Number(durationSeconds || 0) * 1000, position: 0 });
    persistedPlaybackSecondsRef.current = Number(startAtSeconds || 0);
    clearInterruptionTimer();
  }, [clearInterruptionTimer, durationSeconds, sourceUrl, startAtSeconds]);

  React.useEffect(() => {
    if (!sourceUrl || hasRenderedFrame || playerError) return undefined;
    interruptionTimerRef.current = setTimeout(() => {
      setBuffering(false);
      setIsPlaying(false);
      setPlayerError("El video está tardando demasiado en iniciar.");
    }, 30000);
    return clearInterruptionTimer;
  }, [clearInterruptionTimer, hasRenderedFrame, playerError, sourceUrl]);

  React.useEffect(() => {
    if (!isPlaying || paused || !chromeVisible || playerError) return undefined;
    const timer = setTimeout(() => setChromeVisible(false), 4200);
    return () => clearTimeout(timer);
  }, [chromeVisible, isPlaying, paused, playerError]);

  const handleProgress = React.useCallback((event) => {
    const duration = Number(durationSeconds || 0) * 1000 || Number(event?.duration || 0);
    const currentTime = Number(event?.currentTime || 0);
    setPlayback({
      currentTime,
      duration,
      position: duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : Number(event?.position || 0),
    });
    if (currentTime > 0) {
      clearInterruptionTimer();
      setHasRenderedFrame(true);
    }
    const currentTimeSeconds = Math.floor(currentTime / 1000);
    if (Math.abs(currentTimeSeconds - persistedPlaybackSecondsRef.current) >= COURSE_PROGRESS_SAVE_INTERVAL_SECONDS) {
      persistedPlaybackSecondsRef.current = currentTimeSeconds;
      saveCoursePlayback(lesson?._id, {
        completed: false,
        currentTime: currentTimeSeconds,
        duration: Math.floor(duration / 1000),
      });
    }
  }, [clearInterruptionTimer, durationSeconds, lesson?._id, startAtSeconds]);

  const handlePlaying = React.useCallback(() => {
    clearInterruptionTimer();
    setBuffering(false);
    setPaused(false);
    setIsPlaying(true);
    setHasRenderedFrame(true);
    setPlayerError(null);
  }, [clearInterruptionTimer]);

  const handleError = React.useCallback(() => {
    setIsPlaying(false);
    if (!hasRenderedFrame) return;
    clearInterruptionTimer();
    setBuffering(false);
    setPlayerError("No se pudo reproducir esta lección.");
  }, [clearInterruptionTimer, hasRenderedFrame]);

  const handleSeek = (seconds) => {
    if (!playback.duration) return;
    const nextTime = Math.max(0, Math.min(playback.duration, playback.currentTime + seconds * 1000));
    playerRef.current?.seek?.(playback.duration > 0 ? nextTime / playback.duration : 0);
  };

  const source = React.useMemo(() => ({
    uri: sourceUrl,
    initType: 2,
    initOptions: VLC_BUFFER_OPTIONS,
    acceptInvalidCertificates: false,
  }), [sourceUrl]);
  const progressRatio = playback.duration > 0 ? Math.max(0, Math.min(1, playback.position)) : 0;
  const playerSurface = (isFullscreen) => (
    <View style={[styles.videoFrame, isFullscreen && styles.videoFrameFullscreen]}>
      <VLCPlayer
        key={`${lesson?._id || "lesson"}:${sourceUrl}:${isFullscreen ? "fullscreen" : "inline"}`}
        ref={playerRef}
        style={styles.video}
        source={source}
        autoplay
        paused={paused}
        videoAspectRatio="16:9"
        resizeMode="contain"
        acceptInvalidCertificates={false}
        onLoad={(event) => {
          setBuffering(false);
          const duration = Number(durationSeconds || 0) * 1000 || Number(event?.duration || 0);
          setPlayback((current) => ({ ...current, duration }));
          if (startAtSeconds > 0 && duration > 0) {
            playerRef.current?.seek?.(Math.min(1, startAtSeconds * 1000 / duration));
          }
        }}
        onProgress={handleProgress}
        onBuffering={() => setBuffering(true)}
        onPlaying={handlePlaying}
        onPaused={() => { setBuffering(false); setIsPlaying(false); }}
        onEnd={() => {
          setPaused(true);
          setIsPlaying(false);
          setBuffering(false);
          persistedPlaybackSecondsRef.current = 0;
          saveCoursePlayback(lesson?._id, { completed: true, currentTime: 0, duration: Math.floor(playback.duration / 1000) });
        }}
        onError={handleError}
      />
      <Pressable style={styles.videoTapLayer} onPress={() => setChromeVisible((current) => !current)} accessibilityRole="button" accessibilityLabel="Mostrar u ocultar controles" />
      {!hasRenderedFrame && !playerError ? (
        <View pointerEvents="none" style={styles.playerLoadingOverlay}><ActivityIndicator color="#fff" /><Text style={styles.posterLoading}>{buffering ? "Preparando streaming" : "Preparando reproducción"}</Text></View>
      ) : null}
      {playerError ? (
        <View style={styles.playerOverlayCenter}><Surface style={styles.playerErrorBox} elevation={0}><IconButton icon="alert-circle-outline" size={38} iconColor="#f43f5e" /><Text style={styles.playerErrorTitle}>Servicio no disponible</Text><Text style={styles.playerErrorCopy}>{playerError}</Text><Button mode="contained" icon="refresh" onPress={onRetry}>Reintentar</Button></Surface></View>
      ) : null}
      {chromeVisible ? (
        <View style={styles.netflixControls} pointerEvents="box-none">
          <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} /><View style={[styles.progressKnob, { left: `${progressRatio * 100}%` }]} /></View><Text style={styles.progressTimeText}>{formatPlaybackTime(playback.duration)}</Text></View>
          <View style={styles.netflixControlRow}>
            <View style={styles.controlCluster}><IconButton icon={paused ? "play" : "pause"} size={34} iconColor="#fff" onPress={() => setPaused((current) => !current)} accessibilityLabel={paused ? "Reproducir" : "Pausar"} /><IconButton icon="rewind-10" size={30} iconColor="#fff" disabled={!playback.duration} onPress={() => handleSeek(-10)} accessibilityLabel="Retroceder diez segundos" /><IconButton icon="fast-forward-10" size={30} iconColor="#fff" disabled={!playback.duration} onPress={() => handleSeek(10)} accessibilityLabel="Adelantar diez segundos" /></View>
            <Text style={styles.netflixMovieTitle} numberOfLines={1}>{lesson?.titulo || "Lección"}</Text>
            <View style={[styles.controlCluster, styles.controlClusterRight]}><IconButton icon={isFullscreen ? "fullscreen-exit" : "fullscreen"} size={32} iconColor="#fff" onPress={() => setFullscreen((current) => !current)} accessibilityLabel={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"} /></View>
          </View>
        </View>
      ) : <IconButton icon="gesture-tap" size={24} mode="contained-tonal" containerColor="rgba(15, 23, 42, 0.38)" iconColor="#fff" style={styles.playerChromeRevealButton} onPress={() => setChromeVisible(true)} accessibilityLabel="Mostrar controles" />}
    </View>
  );

  return (
    <View style={styles.playerScreen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {playerSurface(false)}
      <IconButton icon="arrow-left" size={24} iconColor="#fff" style={styles.playerBackButton} onPress={onClose} accessibilityLabel="Cerrar reproductor" />
      <NativeModal visible={fullscreen} animationType="fade" presentationStyle="fullScreen" supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]} onRequestClose={() => setFullscreen(false)}>
        <StatusBar hidden />
        <View style={styles.fullscreenRoot}>{playerSurface(true)}</View>
      </NativeModal>
    </View>
  );
};

export default function CourseDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { courseId } = useLocalSearchParams();
  const headerInset = useAppHeaderContentInset();
  const [working, setWorking] = React.useState(false);
  const [player, setPlayer] = React.useState(null);
  const normalizedCourseId = Array.isArray(courseId) ? courseId[0] : courseId;
  const palette = {
    accent: theme.dark ? "#67e8f9" : "#0e7490",
    background: theme.dark ? "#071018" : "#edf5f7",
    border: theme.dark ? "rgba(103,232,249,0.16)" : "rgba(14,116,144,0.14)",
    card: theme.dark ? "#0d1b25" : "#ffffff",
    muted: theme.dark ? "#a5b7c0" : "#5b707a",
    primary: theme.dark ? "#fbbf24" : "#b45309",
    text: theme.dark ? "#f8fafc" : "#10232e",
  };

  const data = Meteor.useTracker(() => {
    if (!normalizedCourseId || !Meteor.userId()) return { course: null, lessons: [], loading: true, subscription: null };
    const catalog = Meteor.subscribe("cursos.catalogo");
    const management = Meteor.subscribe("cursos.gestion");
    const lessons = Meteor.subscribe("cursos.lecciones", normalizedCourseId);
    const subscriptions = Meteor.subscribe("cursos.suscripciones.propias");
    return {
      course: CursosCollection.findOne(normalizedCourseId),
      lessons: LeccionesCursoCollection.find({ cursoId: normalizedCourseId }, { sort: { orden: 1 } }).fetch(),
      loading: !catalog.ready() || !management.ready() || !lessons.ready() || !subscriptions.ready(),
      subscription: SuscripcionesCursoCollection.findOne({ cursoId: normalizedCourseId, userId: Meteor.userId() }),
    };
  }, [normalizedCourseId]);

  React.useEffect(() => {
    if (data.course?.portadaUrl) {
      console.log("[COURSE_COVER] URL recibida en detalle:", data.course._id, data.course.portadaUrl);
    }
  }, [data.course]);

  const currentUser = Meteor.user();
  const isManager = data.course && (
    data.course.profesorId === Meteor.userId() ||
    currentUser?.username === "carlosmbinf" ||
    (currentUser?.profile?.role === "admin" && data.course.adminId === Meteor.userId())
  );
  const active = data.subscription?.estado === "ACTIVA" && new Date(data.subscription.fechaFin) > new Date();

  const addToCart = async () => {
    setWorking(true);
    try {
      await callMethod("cursos.agregarAlCarrito", normalizedCourseId);
      Alert.alert("Curso añadido", active ? "La renovación mensual está en el carrito." : "La suscripción mensual está en el carrito.", [
        { text: "Continuar", onPress: () => router.replace("/(normal)/Main") },
      ]);
    } catch (error) {
      Alert.alert("No se pudo continuar", error?.reason || error?.message || "Inténtalo nuevamente.");
    } finally {
      setWorking(false);
    }
  };

  const playLesson = async (lesson) => {
    if (!isVlcPlayerAvailable) {
      Alert.alert(
        "Reproductor no disponible",
        "Esta instalación no incluye el módulo nativo de VLC. Recompila e instala el development build de VIDKAR; Expo Go no admite este reproductor.",
      );
      return;
    }

    setWorking(true);
    try {
      const result = await callMethod("cursos.media.solicitarReproduccion", lesson._id);
      const startAtSeconds = await selectCourseStartAt(lesson._id);
      setPlayer({
        durationSeconds: Number(lesson?.video?.durationSeconds || 0),
        lesson,
        sourceUrl: result.url,
        startAtSeconds,
        title: lesson.titulo,
        url: result.url,
      });
    } catch (error) {
      Alert.alert("Video no disponible", error?.reason || error?.message || "No se pudo iniciar la reproducción.");
    } finally {
      setWorking(false);
    }
  };

  const closePlayer = () => {
    setPlayer(null);
  };

  if (data.loading && !data.course) {
    return <View style={[styles.center, { backgroundColor: palette.background }]}><ActivityIndicator /></View>;
  }
  if (!data.course) {
    return <View style={[styles.center, { backgroundColor: palette.background }]}><Text>Curso no encontrado.</Text></View>;
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <AppHeader title="Detalle del curso" subtitle={data.course.profesorNombre} showBackButton backHref="/(normal)/Cursos" overlapContent />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerInset + 12 }]}>
        <View style={[styles.hero, { borderColor: palette.border }]}>
          {data.course.portadaUrl ? <Image source={{ uri: data.course.portadaUrl }} style={styles.cover} /> : <LinearGradient colors={theme.dark ? ["#113344", "#172554", "#3b2a0d"] : ["#cffafe", "#dbeafe", "#fef3c7"]} style={styles.coverFallback}><Icon source="book-education-outline" color={palette.accent} size={72} /></LinearGradient>}
          <LinearGradient colors={["rgba(2,8,13,0.02)", "rgba(2,8,13,0.32)", "rgba(2,8,13,0.94)"]} locations={[0, 0.46, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroContent}>
            <View style={styles.tagRow}>
              <View style={styles.heroTag}><Icon source="shape-outline" color="#ffffff" size={14} /><Text style={styles.heroTagText}>{data.course.categoria}</Text></View>
              <View style={styles.heroTag}><Icon source="signal" color="#ffffff" size={14} /><Text style={styles.heroTagText}>{data.course.nivel}</Text></View>
            </View>
            <Text variant="headlineMedium" style={styles.heroTitle}>{data.course.titulo}</Text>
            <View style={styles.professorRow}><View style={styles.professorAvatar}><Text style={styles.professorInitial}>{data.course.profesorNombre?.slice(0, 1)?.toUpperCase() || "V"}</Text></View><View><Text style={styles.professorLabel}>Impartido por</Text><Text style={styles.professorName}>{data.course.profesorNombre}</Text></View></View>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.sectionEyebrow, { color: palette.accent }]}>SOBRE ESTE CURSO</Text>
          <Text style={[styles.description, { color: palette.muted }]}>{data.course.descripcion}</Text>
        </View>

        {!isManager ? (
          <LinearGradient colors={active ? (theme.dark ? ["#0d2c24", "#10271f"] : ["#e6f8ee", "#ffffff"]) : (theme.dark ? ["#102b3a", "#211d0e"] : ["#e0f4fb", "#fff7df"])} style={[styles.subscriptionPanel, { borderColor: palette.border }]}>
            <View style={styles.subscriptionCopy}>
              <View style={styles.subscriptionLabelRow}><Icon source={active ? "check-decagram" : "calendar-sync"} color={active ? "#22c55e" : palette.accent} size={19} /><Text style={[styles.subscriptionLabel, { color: palette.text }]}>{active ? "Acceso vigente" : "Suscripción mensual"}</Text></View>
              <Text style={{ color: palette.muted }}>
                {active
                  ? `Disponible hasta ${new Date(data.subscription.fechaFin).toLocaleDateString("es-ES")}`
                  : "30 días de acceso a todas las clases"}
              </Text>
              {!active ? <View style={styles.priceRow}><Text style={[styles.detailPrice, { color: palette.primary }]}>{Number(data.course.precioMensual).toFixed(2)}</Text><View><Text style={[styles.currency, { color: palette.text }]}>{data.course.moneda}</Text><Text style={[styles.pricePeriod, { color: palette.muted }]}>por mes</Text></View></View> : null}
            </View>
            {!active ? (
              <Button mode="contained" contentStyle={styles.subscribeButtonContent} icon={data.subscription ? "calendar-refresh" : "cart-plus"} onPress={addToCart} loading={working} disabled={working}>
                {data.subscription ? "Renovar" : "Suscribirme"}
              </Button>
            ) : null}
          </LinearGradient>
        ) : null}

        <View style={styles.sectionHeader}>
          <View><Text style={[styles.sectionEyebrow, { color: palette.accent }]}>PROGRAMA</Text><Text variant="titleLarge" style={[styles.sectionTitle, { color: palette.text }]}>Contenido del curso</Text></View>
          <View style={[styles.classCount, { backgroundColor: theme.dark ? "rgba(103,232,249,0.09)" : "rgba(14,116,144,0.08)" }]}><Text style={[styles.classCountText, { color: palette.accent }]}>{data.lessons.length} clases</Text></View>
        </View>
        <Surface style={[styles.lessonList, { backgroundColor: palette.card, borderColor: palette.border }]} elevation={0}>
          {data.lessons.map((lesson, index) => (
            <React.Fragment key={lesson._id}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.lessonRow}>
                <View style={[styles.orderBadge, { backgroundColor: theme.dark ? "rgba(103,232,249,0.09)" : "rgba(14,116,144,0.08)" }]}><Text style={{ color: palette.accent, fontWeight: "900" }}>{String(lesson.orden).padStart(2, "0")}</Text></View>
                <View style={styles.lessonCopy}>
                  <Text style={[styles.lessonTitle, { color: palette.text }]}>{lesson.titulo}</Text>
                  <Text style={{ color: palette.muted }} numberOfLines={2}>{lesson.descripcion || "Clase en video"}</Text>
                </View>
                <IconButton mode="contained-tonal" icon={active || isManager ? "play" : "lock"} accessibilityLabel={active || isManager ? `Reproducir ${lesson.titulo}` : "Lección bloqueada"} disabled={working || (!active && !isManager)} onPress={() => playLesson(lesson)} />
              </View>
            </React.Fragment>
          ))}
          {data.lessons.length === 0 ? <Text style={[styles.empty, { color: palette.muted }]}>Aún no hay clases publicadas.</Text> : null}
        </Surface>
      </ScrollView>

      {player?.url ? (
        <CourseVideoPlayer
          durationSeconds={player.durationSeconds}
          lesson={player.lesson}
          sourceUrl={player.url}
          startAtSeconds={player.startAtSeconds}
          onClose={closePlayer}
          onRetry={() => playLesson(player.lesson)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, center: { alignItems: "center", flex: 1, justifyContent: "center" },
  content: { padding: 16, paddingBottom: 40 }, hero: { aspectRatio: 16 / 10, borderRadius: 8, borderWidth: 1, overflow: "hidden", position: "relative", width: "100%" }, cover: { height: "100%", width: "100%" }, coverFallback: { alignItems: "center", height: "100%", justifyContent: "center", width: "100%" }, heroContent: { bottom: 0, gap: 9, left: 0, padding: 18, position: "absolute", right: 0 }, tagRow: { flexDirection: "row", gap: 7 }, heroTag: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.13)", borderColor: "rgba(255,255,255,0.18)", borderRadius: 6, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 8, paddingVertical: 5 }, heroTagText: { color: "#ffffff", fontSize: 10, fontWeight: "800" }, heroTitle: { color: "#ffffff", fontWeight: "900", lineHeight: 34 }, professorRow: { alignItems: "center", flexDirection: "row", gap: 9 }, professorAvatar: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8, height: 34, justifyContent: "center", width: 34 }, professorInitial: { color: "#ffffff", fontWeight: "900" }, professorLabel: { color: "rgba(255,255,255,0.62)", fontSize: 9 }, professorName: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  titleBlock: { gap: 7, paddingTop: 19 }, sectionEyebrow: { fontSize: 10, fontWeight: "900" }, description: { fontSize: 15, lineHeight: 23 },
  subscriptionPanel: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 20, padding: 16 },
  subscriptionCopy: { flex: 1, gap: 6 }, subscriptionLabelRow: { alignItems: "center", flexDirection: "row", gap: 7 }, subscriptionLabel: { fontSize: 16, fontWeight: "900" }, priceRow: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 4 }, detailPrice: { fontSize: 27, fontWeight: "900" }, currency: { fontSize: 12, fontWeight: "900" }, pricePeriod: { fontSize: 9 }, subscribeButtonContent: { minHeight: 44 }, sectionHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 28 },
  sectionTitle: { fontWeight: "850" }, classCount: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 6 }, classCountText: { fontSize: 11, fontWeight: "800" }, lessonList: { borderRadius: 8, borderWidth: 1, overflow: "hidden" },
  lessonRow: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 82, padding: 12 }, orderBadge: { alignItems: "center", borderRadius: 8, height: 38, justifyContent: "center", width: 38 },
  lessonCopy: { flex: 1, gap: 3 }, lessonTitle: { fontSize: 15, fontWeight: "800" }, empty: { padding: 24, textAlign: "center" },
  playerScreen: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", zIndex: 20 },
  playerBackButton: { position: "absolute", left: 8, top: 8, zIndex: 6, backgroundColor: "rgba(15, 23, 42, 0.34)" },
  videoFrame: { flex: 1, width: "100%", minHeight: 0, backgroundColor: "#000", overflow: "hidden", position: "relative" },
  videoFrameFullscreen: { flex: 1, width: "100%", minHeight: 0 },
  video: { flex: 1, width: "100%", height: "100%" },
  videoTapLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  playerLoadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(0, 0, 0, 0.18)", zIndex: 2 },
  posterLoading: { color: "#fff", fontWeight: "700" },
  playerOverlayCenter: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, zIndex: 5 },
  playerErrorBox: { width: 420, maxWidth: "92%", alignSelf: "center", borderRadius: 20, padding: 16, gap: 10, alignItems: "center", backgroundColor: "rgba(9, 17, 31, 0.9)" },
  playerErrorTitle: { color: "#fff", fontWeight: "800", textAlign: "center" },
  playerErrorCopy: { color: "rgba(255,255,255,0.8)", lineHeight: 18, textAlign: "center" },
  netflixControls: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, backgroundColor: "rgba(0,0,0,0.44)", zIndex: 3 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  progressTrack: { flex: 1, height: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.34)", position: "relative" },
  progressFill: { height: 3, borderRadius: 999, backgroundColor: "#e50914" },
  progressKnob: { position: "absolute", top: -4, width: 11, height: 11, marginLeft: -5, borderRadius: 999, backgroundColor: "#e50914" },
  progressTimeText: { minWidth: 46, color: "rgba(255,255,255,0.82)", textAlign: "right", fontWeight: "700" },
  netflixControlRow: { minHeight: 52, alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  controlCluster: { width: 168, alignItems: "center", flexDirection: "row", justifyContent: "flex-start" },
  controlClusterRight: { justifyContent: "flex-end" },
  netflixMovieTitle: { color: "rgba(255,255,255,0.92)", flex: 1, fontWeight: "800", textAlign: "center", paddingHorizontal: 12 },
  playerChromeRevealButton: { position: "absolute", top: 12, right: 12, zIndex: 4 },
  fullscreenRoot: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
});