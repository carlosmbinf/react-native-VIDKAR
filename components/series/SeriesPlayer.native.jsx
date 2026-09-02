import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SecureStore from "expo-secure-store";
import React from "react";
import { Modal, Pressable, StatusBar, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, IconButton, Surface, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getHlsServerUrl } from "../../services/meteor/client.native";
import { useCurrentSession } from "../../services/meteor/session";
import { addChapterView, prepareChapterPlayback } from "../../services/series/seriesPlayback.native";

const { VLCPlayer } = require("react-native-vlc-media-player");

const CACHE_KEY = "vidkar.seriesPlaybackCache.v1";
const RESUME_MIN_SECONDS = 15;
const SAVE_INTERVAL_SECONDS = 5;
const HLS_POLL_MS = 2500;
const PLAYER_ERROR = "El servicio de video no está disponible en este momento.";
const BUFFER_OPTIONS = ["--network-caching=1500", "--live-caching=1500", "--file-caching=1200", "--disc-caching=1200", "--http-reconnect", "--avcodec-fast"];
const SUBTITLE_SIZE_OPTIONS = [
  { id: "sm", label: "Pequeños", relativeFontSize: 11, textScale: 65 },
  { id: "md", label: "Medianos", relativeFontSize: 14, textScale: 82 },
  { id: "lg", label: "Grandes", relativeFontSize: 18, textScale: 100 },
];

const getId = (value) => Array.isArray(value) ? value[0] : value;
const joinUrl = (base, path) => { const normalized = String(base || "").replace(/\/$/, ""); return normalized ? `${normalized}${path.startsWith("/") ? path : `/${path}`}` : path; };
const createSessionId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
const encode = (value) => encodeURIComponent(String(value || ""));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const titleOf = (chapter) => chapter?.nombre || chapter?.titulo || "Capítulo";
const numberOf = (chapter) => chapter?.capitulo || chapter?.numeroCapitulo || "";
const formatTime = (milliseconds) => { const total = Math.floor(Math.max(0, Number(milliseconds) || 0) / 1000); const hours = Math.floor(total / 3600); const minutes = Math.floor((total % 3600) / 60); const seconds = total % 60; return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${minutes}:${String(seconds).padStart(2, "0")}`; };
const readCache = async () => { try { const value = await SecureStore.getItemAsync(CACHE_KEY); return value ? JSON.parse(value) : {}; } catch (_error) { return {}; } };
const saveProgress = async (id, playback, chapter) => { try { const cache = await readCache(); cache[id] = { ...cache[id], chapter: { _id: id, nombre: titleOf(chapter) }, playback: { ...playback, updatedAt: new Date().toISOString() } }; await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(cache)); } catch (_error) { /* El progreso local no debe interrumpir la reproducción. */ } };

const SeriesPlayer = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const chapterId = getId(params.id);
  const { user, userReady } = useCurrentSession();
  const hlsOrigin = getHlsServerUrl();
  const [chapter, setChapter] = React.useState(null);
  const [series, setSeries] = React.useState(null);
  const [season, setSeason] = React.useState(null);
  const [token, setToken] = React.useState("");
  const [loading, setLoading] = React.useState(Boolean(chapterId));
  const [error, setError] = React.useState("");
  const [resume, setResume] = React.useState(null);
  const [resumeReady, setResumeReady] = React.useState(false);
  const [startAtMs, setStartAtMs] = React.useState(0);
  const [playlistUrl, setPlaylistUrl] = React.useState(null);
  const [streamError, setStreamError] = React.useState("");
  const [streamReload, setStreamReload] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [hasFrame, setHasFrame] = React.useState(false);
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const [subtitleSizeId, setSubtitleSizeId] = React.useState("md");
  const [subtitleDialogVisible, setSubtitleDialogVisible] = React.useState(false);
  const [externalSubtitleEnabled] = React.useState(true);
  const currentTimeRef = React.useRef(0);
  const durationRef = React.useRef(0);
  const lastSavedRef = React.useRef(0);
  const cancelUrlRef = React.useRef("");
  const cancelledSessionUrlsRef = React.useRef(new Set());
  const playerRef = React.useRef(null);
  const viewRegisteredRef = React.useRef(false);
  const pollTimerRef = React.useRef(null);

  const cancelSeriesHlsSession = React.useCallback((cancelUrl) => {
    const normalizedUrl = String(cancelUrl || "");
    if (!normalizedUrl || cancelledSessionUrlsRef.current.has(normalizedUrl)) return;
    cancelledSessionUrlsRef.current.add(normalizedUrl);
    if (cancelUrlRef.current === normalizedUrl) cancelUrlRef.current = "";
    fetch(normalizedUrl, { method: "POST", keepalive: true }).catch(() => null);
  }, []);

  const handleBack = React.useCallback(() => { cancelSeriesHlsSession(cancelUrlRef.current); if (router.canGoBack()) router.back(); else router.replace("/Cinema/Series"); }, [cancelSeriesHlsSession, router]);
  const loadPlayback = React.useCallback(() => {
    if (!chapterId) { setLoading(false); setError("No se recibió un capítulo válido."); return; }
    setLoading(true); setError(""); setStreamError(""); setPlaylistUrl(null); setToken(""); setHasFrame(false); setPaused(false); viewRegisteredRef.current = false;
    prepareChapterPlayback(chapterId).then((result) => { if (!result?.chapter) throw new Error("No se pudo obtener el capítulo."); setChapter(result.chapter); setSeries(result.series || null); setSeason(result.season || null); setToken(""); }).catch((nextError) => setError(nextError?.reason || nextError?.message || "No se pudo preparar el capítulo.")).finally(() => setLoading(false));
  }, [chapterId]);

  React.useEffect(() => { loadPlayback(); }, [loadPlayback]);
  React.useEffect(() => {
    let cancelled = false;
    if (!chapterId) { setResumeReady(true); return undefined; }
    setResumeReady(false);
    readCache().then((cache) => { if (cancelled) return; const entry = cache?.[chapterId]?.playback || {}; const current = Number(entry.currentTime || 0) * 1000; const savedDuration = Number(entry.duration || 0) * 1000; const canResume = !entry.completed && current > RESUME_MIN_SECONDS * 1000 && (!savedDuration || current < savedDuration - RESUME_MIN_SECONDS * 1000); setResume(canResume ? { currentTime: current, duration: savedDuration } : null); setResumeReady(true); });
    return () => { cancelled = true; };
  }, [chapterId]);

  React.useEffect(() => {
    if (!chapterId || !resumeReady || resume) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    const sessionId = createSessionId();
    const base = `/series/hls/${encode(chapterId)}`;
    const query = `sessionId=${encode(sessionId)}${startAtMs > 0 ? `&startAt=${Math.floor(startAtMs / 1000)}` : ""}`;
    const prepareUrl = joinUrl(hlsOrigin, `${base}/prepare?${query}`);
    const statusUrl = joinUrl(hlsOrigin, `${base}/status?sessionId=${encode(sessionId)}`);
    const cancelUrl = joinUrl(hlsOrigin, `${base}/${encode(sessionId)}/cancel`);
    const fallbackPlaylist = joinUrl(hlsOrigin, `${base}/${encode(sessionId)}/index.m3u8`);
    cancelUrlRef.current = cancelUrl;
    const clearPoll = () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); pollTimerRef.current = null; };
    const applyStatus = (status) => { if (cancelled) return; if (status?.playlistReady || status?.ready) setPlaylistUrl(status.playlistUrl ? joinUrl(hlsOrigin, status.playlistUrl) : fallbackPlaylist); if (Number(status?.durationSeconds) > 0) { setDuration(Number(status.durationSeconds) * 1000); durationRef.current = Number(status.durationSeconds) * 1000; } };
    const poll = async () => { if (cancelled) return; try { const response = await fetch(statusUrl, { signal: controller.signal }); const status = await response.json(); if (!response.ok || status?.success === false || status?.status === "error") throw new Error(status?.error || PLAYER_ERROR); applyStatus(status); if (!status?.playlistReady && status?.status !== "ready") pollTimerRef.current = setTimeout(poll, HLS_POLL_MS); } catch (nextError) { if (!cancelled) setStreamError(nextError?.message || PLAYER_ERROR); } };
    setPlaylistUrl(null); setStreamError("");
    fetch(prepareUrl, { method: "POST", signal: controller.signal }).then(async (response) => { const status = await response.json(); if (!response.ok || status?.success === false) throw new Error(status?.error || PLAYER_ERROR); applyStatus(status); if (!status?.playlistReady && status?.status !== "ready") pollTimerRef.current = setTimeout(poll, HLS_POLL_MS); }).catch((nextError) => { if (!cancelled) setStreamError(nextError?.message || PLAYER_ERROR); });
    return () => { cancelled = true; controller.abort(); clearPoll(); cancelSeriesHlsSession(cancelUrl); };
  }, [cancelSeriesHlsSession, chapterId, hlsOrigin, resume, resumeReady, startAtMs, streamReload, token]);

  React.useEffect(() => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => null); return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch(() => null); }; }, []);
  React.useEffect(() => () => { cancelSeriesHlsSession(cancelUrlRef.current); }, [cancelSeriesHlsSession]);
  React.useEffect(() => { currentTimeRef.current = currentTime; durationRef.current = duration; const seconds = Math.floor(currentTime / 1000); if (chapterId && seconds >= RESUME_MIN_SECONDS && Math.abs(seconds - lastSavedRef.current) >= SAVE_INTERVAL_SECONDS) { lastSavedRef.current = seconds; saveProgress(chapterId, { completed: false, currentTime: seconds, duration: Math.floor(duration / 1000) }, chapter); } }, [chapter, chapterId, currentTime, duration]);

  const selectedSubtitleSize = SUBTITLE_SIZE_OPTIONS.find((item) => item.id === subtitleSizeId) || SUBTITLE_SIZE_OPTIONS[1];
  const subtitleUrl = chapterId ? joinUrl(hlsOrigin, `/getsubtitleSeries?idCapitulo=${encode(chapterId)}`) : undefined;
  const source = playlistUrl ? { uri: playlistUrl, initType: 2, initOptions: [...BUFFER_OPTIONS, `--freetype-rel-fontsize=${selectedSubtitleSize.relativeFontSize}`, `--sub-text-scale=${selectedSubtitleSize.textScale}`], acceptInvalidCertificates: false } : null;
  const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  const retry = React.useCallback(() => { setStartAtMs(0); setPlaylistUrl(null); setStreamError(""); setHasFrame(false); setStreamReload((value) => value + 1); loadPlayback(); }, [loadPlayback]);
  const selectResume = (continuePlayback) => { setStartAtMs(continuePlayback ? Number(resume?.currentTime || 0) : 0); setResume(null); };

  if (!userReady || !user) return <View style={styles.center}><ActivityIndicator color="#6366f1" size="large" /><Text style={styles.muted}>Preparando la sesión...</Text></View>;
  if (user.subscipcionPelis !== true) return <View style={styles.center}><Text style={styles.title}>Suscripción requerida</Text><Text style={styles.muted}>Necesitas una suscripción activa para ver Series.</Text><Button onPress={handleBack}>Volver</Button></View>;
  if (loading) return <View style={styles.center}><ActivityIndicator color="#6366f1" size="large" /><Text style={styles.muted}>Preparando capítulo...</Text></View>;
  if (error || !chapter) return <View style={styles.center}><Text style={styles.error}>{error || "El capítulo no está disponible."}</Text><Button mode="contained" onPress={retry}>Reintentar</Button><Button onPress={handleBack}>Volver</Button></View>;

  return (<><View style={styles.screen}><StatusBar hidden /><View style={styles.videoFrame}>{source ? <VLCPlayer key={`${chapterId}:${streamReload}`} ref={playerRef} style={styles.video} source={source} autoplay paused={paused} subtitleUri={externalSubtitleEnabled ? subtitleUrl : undefined} videoAspectRatio="16:9" resizeMode="contain" acceptInvalidCertificates={false} onLoad={(event) => { const nextDuration = Math.max(durationRef.current, Number(event?.duration || 0)); setDuration(nextDuration); setHasFrame(true); setStreamError(""); if (!viewRegisteredRef.current) { viewRegisteredRef.current = true; addChapterView(chapterId); } }} onProgress={(event) => { const relative = Number(event?.currentTime || 0); const next = Math.max(0, relative + startAtMs); setCurrentTime(next); if (relative > 0) setHasFrame(true); }} onPlaying={() => setHasFrame(true)} onPaused={() => setPaused(true)} onEnd={() => { setPaused(true); saveProgress(chapterId, { completed: true, currentTime: 0, duration: Math.floor(duration / 1000) }, chapter); }} onError={() => { if (hasFrame) setStreamError(PLAYER_ERROR); }} /> : <View style={styles.center}><ActivityIndicator color="#fff" /><Text style={styles.muted}>{streamError || "Preparando streaming seguro..."}</Text></View>}{streamError ? <View style={styles.overlay}><Surface style={styles.errorCard} elevation={3}><Text style={styles.error}>{streamError}</Text><Button mode="contained" onPress={retry}>Reintentar</Button></Surface></View> : null}<View style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 10) }]}><IconButton icon="arrow-left" iconColor="#fff" onPress={handleBack} /><View style={styles.topCopy}><Text numberOfLines={1} style={styles.topTitle}>{titleOf(chapter)}</Text><Text numberOfLines={1} style={styles.topMeta}>{series?.nombre || "Series"} · T{season?.numeroTemporada || 1} · E{numberOf(chapter) || "—"}</Text></View></View><Pressable onPress={() => setControlsVisible((value) => !value)} style={styles.tapLayer} accessibilityRole="button" accessibilityLabel="Mostrar controles" />{controlsVisible ? <View style={styles.controls}><View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View><Text style={styles.time}>{formatTime(duration)}</Text></View><View style={styles.controlRow}><IconButton icon={paused ? "play" : "pause"} iconColor="#fff" onPress={() => setPaused((value) => !value)} /><IconButton icon="rewind-10" iconColor="#fff" onPress={() => { setStartAtMs(Math.max(0, currentTime - 10000)); setPlaylistUrl(null); setHasFrame(false); setStreamReload((value) => value + 1); }} /><IconButton icon="fast-forward-10" iconColor="#fff" onPress={() => { setStartAtMs(Math.min(duration, currentTime + 10000)); setPlaylistUrl(null); setHasFrame(false); setStreamReload((value) => value + 1); }} /><Text numberOfLines={1} style={styles.controlTitle}>{titleOf(chapter)}</Text><IconButton disabled={!subtitleUrl} icon="subtitles-outline" iconColor="#fff" onPress={() => setSubtitleDialogVisible(true)} /></View></View> : null}</View></View><Modal animationType="fade" transparent visible={resume !== null} onRequestClose={() => selectResume(false)}><View style={styles.modalBackdrop}><Surface style={styles.resumeCard} elevation={4}><Text style={styles.title}>Continuar capítulo</Text><Text style={styles.muted}>Te quedaste en {formatTime(resume?.currentTime || 0)}.</Text><View style={styles.modalActions}><Button onPress={() => selectResume(false)}>Desde el inicio</Button><Button mode="contained" buttonColor="#6366f1" textColor="#fff" onPress={() => selectResume(true)}>Continuar</Button></View></Surface></View></Modal><Modal animationType="fade" transparent visible={subtitleDialogVisible} onRequestClose={() => setSubtitleDialogVisible(false)}><View style={styles.modalBackdrop}><Surface style={styles.resumeCard} elevation={4}><Text style={styles.title}>Subtítulos</Text>{SUBTITLE_SIZE_OPTIONS.map((option) => <Button key={option.id} mode={option.id === subtitleSizeId ? "contained" : "outlined"} buttonColor={option.id === subtitleSizeId ? "#6366f1" : undefined} textColor="#fff" onPress={() => { setSubtitleSizeId(option.id); setPlaylistUrl(null); setHasFrame(false); setStreamReload((value) => value + 1); }}>{option.label}</Button>)}<Button onPress={() => setSubtitleDialogVisible(false)}>Cerrar</Button></Surface></View></Modal></>);
};

export default SeriesPlayer;

const styles = StyleSheet.create({
  screen: { backgroundColor: "#000", flex: 1 }, videoFrame: { backgroundColor: "#000", flex: 1, overflow: "hidden", position: "relative" }, video: { height: "100%", width: "100%" }, center: { alignItems: "center", backgroundColor: "#020617", flex: 1, gap: 12, justifyContent: "center", padding: 24 }, title: { color: "#fff", fontSize: 23, fontWeight: "900", textAlign: "center" }, muted: { color: "#b8c2d6", fontSize: 16, lineHeight: 23, textAlign: "center" }, error: { color: "#fecdd3", fontSize: 17, lineHeight: 24, textAlign: "center" }, topOverlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.42)", flexDirection: "row", left: 0, paddingHorizontal: 10, position: "absolute", right: 0, top: 0, zIndex: 5 }, topCopy: { flex: 1, marginLeft: 4 }, topTitle: { color: "#fff", fontSize: 16, fontWeight: "900" }, topMeta: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 }, tapLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 }, controls: { backgroundColor: "rgba(0,0,0,0.5)", bottom: 0, left: 0, paddingBottom: 10, paddingHorizontal: 14, paddingTop: 14, position: "absolute", right: 0, zIndex: 4 }, progressRow: { alignItems: "center", flexDirection: "row", gap: 10 }, progressTrack: { backgroundColor: "rgba(255,255,255,0.35)", borderRadius: 999, flex: 1, height: 3 }, progressFill: { backgroundColor: "#e11d48", borderRadius: 999, height: 3 }, time: { color: "#fff", fontSize: 12, minWidth: 48, textAlign: "right" }, controlRow: { alignItems: "center", flexDirection: "row", minHeight: 50 }, controlTitle: { color: "#fff", flex: 1, fontSize: 14, fontWeight: "800", paddingHorizontal: 8, textAlign: "center" }, overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 6 }, errorCard: { alignItems: "center", backgroundColor: "rgba(9,17,31,0.94)", borderRadius: 18, gap: 12, maxWidth: 400, padding: 22 }, modalBackdrop: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", flex: 1, justifyContent: "center", padding: 24 }, resumeCard: { backgroundColor: "#111827", borderColor: "#334155", borderRadius: 18, gap: 12, maxWidth: 420, padding: 24, width: "100%" }, modalActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", marginTop: 8 },
});
