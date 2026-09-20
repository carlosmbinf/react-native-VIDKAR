import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

/**
 * AVPlayer-backed video surface. On iOS, VideoView exposes the native
 * playback route picker and sends the HLS stream directly to AirPlay.
 */
const AirPlayVideoPlayer = React.forwardRef(({
  source,
  paused = false,
  autoplay = true,
  startAtSeconds = 0,
  autoFullscreen = false,
  preparing = false,
  textTracks = [],
  subtitlesEnabled = true,
  style,
  contentFit = "contain",
  onLoad,
  onProgress,
  onPlaying,
  onPaused,
  onEnd,
  onError,
}, ref) => {
  const player = useVideoPlayer(source, (nextPlayer) => {
    nextPlayer.allowsExternalPlayback = true;
    nextPlayer.bufferOptions = {
      preferredForwardBufferDuration: 12,
      waitsToMinimizeStalling: false,
    };
    nextPlayer.timeUpdateEventInterval = 0.25;
    nextPlayer.showNowPlayingNotification = true;
    nextPlayer.staysActiveInBackground = true;
    if (startAtSeconds > 0) nextPlayer.currentTime = startAtSeconds;
    if (autoplay && !paused) nextPlayer.play();
  });
  const videoViewRef = React.useRef(null);
  const autoFullscreenRequestedRef = React.useRef(false);
  const lastSourceKeyRef = React.useRef(null);
  const sourceKey = JSON.stringify(source ?? null);

  React.useEffect(() => {
    if (!source || sourceKey === lastSourceKeyRef.current) return undefined;
    lastSourceKeyRef.current = sourceKey;
    let cancelled = false;

    player.replaceAsync(source)
      .then(() => {
        if (!cancelled && autoplay && !paused) player.play();
      })
      .catch((error) => {
        if (!cancelled) onError?.(error);
      });

    return () => {
      cancelled = true;
    };
  }, [autoplay, onError, paused, player, source, sourceKey]);

  const requestAutoFullscreen = React.useCallback(() => {
    if (!autoFullscreen || autoFullscreenRequestedRef.current) return;
    autoFullscreenRequestedRef.current = true;
    setTimeout(() => {
      videoViewRef.current?.enterFullscreen?.().catch(() => {
        autoFullscreenRequestedRef.current = false;
      });
    }, 0);
  }, [autoFullscreen]);

  React.useImperativeHandle(ref, () => ({
    seek: (seconds) => {
      player.currentTime = Math.max(0, Number(seconds) || 0);
    },
    seekRatio: (ratio) => {
      player.currentTime = Math.max(0, (Number(ratio) || 0) * (player.duration || 0));
    },
    play: () => player.play(),
    pause: () => player.pause(),
    get player() {
      return player;
    },
  }), [player]);

  React.useEffect(() => {
    player.allowsExternalPlayback = true;
    const requestedTrack = Array.isArray(textTracks) ? textTracks[0] : null;
    const selectSubtitleTrack = () => {
      if (!subtitlesEnabled || !requestedTrack) {
        player.subtitleTrack = null;
        return;
      }

      const availableTracks = Array.isArray(player.availableSubtitleTracks)
        ? player.availableSubtitleTracks
        : [];
      const language = String(requestedTrack.language || "").toLowerCase();
      const title = String(requestedTrack.title || "").toLowerCase();
      const matchingTrack =
        availableTracks.find((track) => {
          const trackLanguage = String(track?.language || "").toLowerCase();
          const trackTitle = String(track?.title || "").toLowerCase();
          return (language && trackLanguage === language) || (title && trackTitle === title);
        }) || availableTracks[0];

      player.subtitleTrack = matchingTrack || null;
    };

    selectSubtitleTrack();
    const sourceSubscription = player.addListener("sourceLoad", selectSubtitleTrack);
    const tracksSubscription = player.addListener("availableSubtitleTracksChange", selectSubtitleTrack);
    if (paused) player.pause();
    else if (autoplay) player.play();
    return () => {
      sourceSubscription.remove();
      tracksSubscription.remove();
    };
  }, [autoplay, paused, player, subtitlesEnabled, textTracks]);

  React.useEffect(() => {
    const subscriptions = [
      player.addListener("sourceLoad", () => {
        onLoad?.({ duration: player.duration * 1000 });
        requestAutoFullscreen();
      }),
      player.addListener("timeUpdate", () => {
        onProgress?.({
          currentTime: player.currentTime * 1000,
          duration: player.duration * 1000,
          position: player.duration > 0 ? player.currentTime / player.duration : 0,
        });
      }),
      player.addListener("playingChange", ({ isPlaying }) => {
        if (isPlaying) onPlaying?.();
        else if (player.status === "readyToPlay") onPaused?.();
      }),
      player.addListener("playToEnd", () => onEnd?.()),
      player.addListener("statusChange", ({ status, error }) => {
        if (status === "readyToPlay" && autoplay && !paused) {
          player.play();
        }
        if (status === "error") onError?.(error);
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [autoplay, onEnd, onError, onLoad, onPaused, onPlaying, onProgress, paused, player, requestAutoFullscreen]);

  return (
    <View style={[styles.container, style]}>
      <VideoView
        ref={videoViewRef}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        nativeControls
        allowsFullscreen
        fullscreenOptions={{ enable: true, orientation: "landscape", autoExitOnRotate: true }}
        allowsPictureInPicture
      />
      {preparing || player.status === "loading" ? (
        <View pointerEvents="none" style={styles.loading}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </View>
  );
});

AirPlayVideoPlayer.displayName = "AirPlayVideoPlayer";

export default AirPlayVideoPlayer;

const styles = StyleSheet.create({
  container: { backgroundColor: "#000", overflow: "hidden" },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
