export const canStartDrawerDrag = ({
  atTop,
  enabled,
  isBottom,
  startedAtTop = true,
  dx,
  dy,
}) =>
  Boolean(
    isBottom &&
      enabled &&
      atTop &&
      startedAtTop &&
      dy > 4 &&
      Math.abs(dy) > Math.abs(dx),
  );
