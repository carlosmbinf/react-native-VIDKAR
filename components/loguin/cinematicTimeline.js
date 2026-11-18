export const CINEMATIC_DURATION = 1540;

export function phase(time, start, end) {
  "worklet";
  return Math.max(0, Math.min(1, (time - start) / (end - start)));
}

function smooth(progress) {
  "worklet";
  return progress * progress * (3 - 2 * progress);
}

function settle(progress) {
  "worklet";
  if (progress >= 1) return 1;
  const angle = progress * 8;
  return 1 - Math.exp(-progress * 8) * (Math.cos(angle) + Math.sin(angle));
}

export function screenPoses(time) {
  "worklet";
  const lift = smooth(phase(time, 0, 235));
  const separation = smooth(phase(time, 175, 625));
  const pull = smooth(phase(time, 475, 1120));
  const approach = settle(phase(time, 960, 1320));
  return {
    loginX: -0.22 * separation - 1.06 * pull,
    loginY: -13 * lift + 18 * pull,
    loginScale: 1 - 0.07 * lift - 0.13 * separation - 0.09 * pull,
    loginYaw: 23 * separation + 10 * pull,
    loginPitch: 4 * lift - 9 * pull,
    menuX: 1.08 - 0.23 * separation - 0.85 * pull,
    menuY: (1 - approach) * 16,
    menuScale: 0.77 + 0.23 * approach,
    menuYaw: -26 * (1 - approach),
    menuPitch: 7 * (1 - approach),
    rim: separation * (1 - smooth(phase(time, 940, 1330))),
    mist: smooth(phase(time, 220, 620)) * (1 - smooth(phase(time, 850, 1140))),
  };
}

export function menuEntrance(time, offset) {
  "worklet";
  return settle(phase(time, 1070 + offset, 1350 + offset));
}
