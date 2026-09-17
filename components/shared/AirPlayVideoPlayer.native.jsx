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
    nextPlayer.timeUpdateEventInterval = 0.25;
    nextPlayer.showNowPlayingNotification = true;
    nextPlayer.staysActiveInBackground = true;
    if (startAtSeconds > 0) nextPlayer.currentTime = startAtSeconds;
    if (autoplay && !paused) nextPlayer.play();
  });

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
    const subscription = player.addListener("sourceLoad", selectSubtitleTrack);
    if (paused) player.pause();
    else if (autoplay) player.play();
    return () => subscription.remove();
  }, [autoplay, paused, player, subtitlesEnabled, textTracks]);

  React.useEffect(() => {
    const subscriptions = [
      player.addListener("sourceLoad", () => {
        onLoad?.({ duration: player.duration * 1000 });
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
        else onPaused?.();
      }),
      player.addListener("playToEnd", () => onEnd?.()),
      player.addListener("statusChange", ({ status, error }) => {
        if (status === "error") onError?.(error);
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [onEnd, onError, onLoad, onPaused, onPlaying, onProgress, player]);

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        nativeControls
        allowsFullscreen
        allowsPictureInPicture
      />
      {player.status === "loading" ? (
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
