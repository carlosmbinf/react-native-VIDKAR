import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PixelRatio, Platform, StyleSheet, View } from 'react-native';
import { Canvas, Fill, ImageShader, Shader, Skia } from '@shopify/react-native-skia';
import { captureRef } from 'react-native-view-shot';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { getGenieCaptureSize } from './genieCapture';
export { createGenieCoordinator } from './genieCoordinator';

// Inverse mapping: each scanline expands around a moving origin, like fabric.
const genieEffect = (() => {
  try {
    return Skia.RuntimeEffect.Make(`
uniform shader content;
uniform float2 size;
uniform float progress;
uniform float origin;
uniform float originY;
uniform float intensity;
half4 main(float2 p) {
  float t = clamp(progress, 0.001, 1.02);
  float opening = clamp(0.018 + 0.982 * t, 0.0, 1.0);
  bool fromBottom = originY > 0.5;
  float y = fromBottom
    ? (p.y - size.y * (1.0 - opening)) / opening
    : p.y / opening;
  if (y < 0.0 || y > size.y) return half4(0.0);
  float fraction = clamp(fromBottom ? 1.0 - y / size.y : y / size.y, 0.0, 1.0);
  float edgeTaper = 0.88 + 0.12 * (1.0 - sqrt(fraction));
  float pinch = (1.0 - t) * edgeTaper * intensity;
  float minimumWidth = mix(0.22, 0.04, intensity);
  float width = clamp(minimumWidth + (1.0 - minimumWidth) * pow(t, 0.78), minimumWidth, 1.0);
  float center = mix(0.5, origin, pinch) * size.x;
  float curve = sin(fraction * 3.14159265) * (1.0 - t) * intensity * 0.12;
  float x = (p.x - center) / width + size.x * 0.5 + curve * size.x;
  if (x < 0.0 || x > size.x) return half4(0.0);
  return content.eval(float2(x, y));
}`);
  } catch {
    return null;
  }
})();

const DURATION = 420;
const CAPTURE_TIMEOUT = 600;
const MAX_CAPTURE_HEIGHT = 720;

export default function GenieEntrance({
  children,
  id,
  active = true,
  origin = 0.25,
  direction = 'bottom',
  intensity = 0.85,
  duration = DURATION,
  delay = 0,
  strategy = 'auto',
  revision = "",
  scrollY,
  viewportHeight,
  scrollActive,
  coordinator,
}) {
  const targetRef = useRef(null);
  const stateRef = useRef('idle');
  const aliveRef = useRef(true);
  const generation = useRef(0);
  const frame = useRef({ width: 0, height: 0 });
  const timer = useRef(null);
  const previousRevision = useRef(revision);
  const [image, setImage] = useState(null);
  const [mode, setMode] = useState('idle');
  const motionReduced = useReducedMotion();
  const top = useSharedValue(-100000);
  const height = useSharedValue(0);
  const progress = useSharedValue(1);
  const dimensions = useSharedValue([0, 0]);
  const shaderUniforms = useDerivedValue(() => ({
    size: dimensions.value,
    progress: progress.value,
    origin: Math.max(0, Math.min(1, origin)),
    originY: direction === 'top' ? 0 : 1,
    intensity: Math.max(0, Math.min(1, intensity)),
  }));
  const fallbackStyle = useAnimatedStyle(() => {
    const progressValue = progress.value;
    const fallbackActive = mode === 'fallback';
    const normalizedOrigin = Math.max(0, Math.min(1, origin));
    return {
      opacity: fallbackActive ? 0.9 + 0.1 * progressValue : 1,
      transformOrigin: `${Math.round(normalizedOrigin * 100)}% ${direction === 'top' ? 'top' : 'bottom'}`,
      transform: [
        { scaleX: fallbackActive ? 0.92 + 0.08 * progressValue : 1 },
        { scaleY: fallbackActive ? 0.7 + 0.3 * progressValue : 1 },
      ],
    };
  }, [direction, mode, origin]);

  const finish = useCallback(() => {
    if (stateRef.current === 'done') return;
    generation.current += 1;
    clearTimeout(timer.current);
    cancelAnimation(progress);
    progress.value = 1;
    stateRef.current = 'done';
    if (aliveRef.current) { setMode('done'); setImage(null); }
  }, [progress]);

  const startFallback = useCallback(() => {
    if (!aliveRef.current || stateRef.current === 'done') return;
    clearTimeout(timer.current);
    stateRef.current = 'fallback';
    progress.value = 0;
    setMode('fallback');
    progress.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) scheduleOnRN(finish);
    });
  }, [finish, progress]);

  const start = useCallback(async () => {
    if (!aliveRef.current || stateRef.current !== 'idle') return;
    if (!active) return;
    if (motionReduced || coordinator.seen.has(id)) { finish(); return; }
    coordinator.seen.add(id);
    const { width, height: blockHeight } = frame.current;
    if (strategy === 'approximation' || !genieEffect || !width || !blockHeight || blockHeight > MAX_CAPTURE_HEIGHT || !coordinator.acquire()) {
      startFallback();
      return;
    }
    stateRef.current = 'capturing';
    setMode('capturing');
    const token = ++generation.current;
    timer.current = setTimeout(startFallback, CAPTURE_TIMEOUT);
    try {
      const captureSize = getGenieCaptureSize(width, blockHeight, Platform.OS, PixelRatio.get());
      const encoded = await captureRef(targetRef, {
        format: 'png', result: 'base64', ...captureSize,
      });
      if (!aliveRef.current || generation.current !== token || stateRef.current !== 'capturing') return;
      const data = Skia.Data.fromBase64(encoded);
      const nextImage = Skia.Image.MakeImageFromEncoded(data);
      if (!nextImage) throw new Error('Snapshot could not be decoded');
      clearTimeout(timer.current);
      dimensions.value = [width, blockHeight];
      progress.value = 0;
      stateRef.current = 'genie';
      setImage(nextImage);
      setMode('genie');
    } catch (error) {
      if (__DEV__) console.warn('[GenieEntrance] Snapshot failed; using the native transition.', id, error);
      if (aliveRef.current && generation.current === token && stateRef.current === 'capturing') startFallback();
    } finally {
      coordinator.release();
    }
  }, [active, coordinator, dimensions, finish, id, motionReduced, progress, startFallback, strategy]);

  useAnimatedReaction(
    () => active && !scrollActive.value && height.value > 0 && viewportHeight.value > 0 && top.value < scrollY.value + viewportHeight.value && top.value + height.value > scrollY.value,
    (visible, wasVisible) => { if (visible && !wasVisible) scheduleOnRN(start); },
    [active, start],
  );

  useEffect(() => {
    aliveRef.current = true;
    const unregister = coordinator.register(() => {
      if (stateRef.current !== 'idle' && stateRef.current !== 'done') finish();
    });
    return () => {
      unregister();
      aliveRef.current = false;
      generation.current += 1;
      clearTimeout(timer.current);
      cancelAnimation(progress);
    };
  }, [coordinator, finish, progress]);

  useEffect(() => {
    if (previousRevision.current !== revision && stateRef.current !== 'idle' && stateRef.current !== 'done') finish();
    previousRevision.current = revision;
  }, [finish, revision]);

  useEffect(() => {
    if (!active && stateRef.current !== 'idle' && stateRef.current !== 'done') finish();
  }, [active, finish]);

  useEffect(() => {
    if (mode !== 'genie' || !image) return;
    const safeDuration = Math.max(120, Math.min(820, duration));
    const safeDelay = Math.max(0, Math.min(180, delay));
    progress.value = withDelay(safeDelay, withTiming(1, { duration: safeDuration, easing: Easing.out(Easing.back(0.95)) }, (finished) => {
      if (finished) scheduleOnRN(finish);
    }));
  }, [delay, duration, finish, image, mode, progress]);

  const onLayout = useCallback(({ nativeEvent: { layout } }) => {
    const previous = frame.current;
    if ((previous.width && previous.width !== layout.width) || (previous.height && previous.height !== layout.height)) {
      if (stateRef.current !== 'idle') finish();
    }
    frame.current = { width: layout.width, height: layout.height };
    top.value = layout.y;
    height.value = layout.height;
  }, [finish, height, top]);

  return (
    <View onLayout={onLayout} onTouchStartCapture={mode === 'capturing' || mode === 'genie' || mode === 'fallback' ? finish : undefined}>
      <Animated.View style={fallbackStyle}>
        <View
          ref={targetRef}
          collapsable={false}
          style={mode === 'genie' ? styles.hidden : undefined}
          pointerEvents={mode === 'genie' ? 'none' : 'auto'}
          accessibilityElementsHidden={mode === 'genie'}
          importantForAccessibility={mode === 'genie' ? 'no-hide-descendants' : 'auto'}
        >
          {children}
        </View>
      </Animated.View>
      {mode === 'genie' && image && (
        <Canvas
          collapsable={false}
          opaque={false}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: frame.current.width,
            height: frame.current.height,
          }}
        >
          <Fill>
            <Shader source={genieEffect} uniforms={shaderUniforms}>
              <ImageShader image={image} fit="fill" rect={{ x: 0, y: 0, width: frame.current.width, height: frame.current.height }} />
            </Shader>
          </Fill>
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
});
