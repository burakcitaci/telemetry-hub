/** Units are milliseconds; ClickHouse Duration is converted from nanoseconds by the caller. */
export function spanWaterfall(
  start: number,
  duration: number,
  traceStart: number,
  traceDuration: number,
) {
  if (
    ![start, duration, traceStart, traceDuration].every(Number.isFinite) ||
    traceDuration <= 0
  ) {
    return { offset: 0, width: 0 };
  }
  const offset = Math.min(
    100,
    Math.max(0, ((start - traceStart) / traceDuration) * 100),
  );
  const width = Math.min(
    100 - offset,
    Math.max(0, (duration / traceDuration) * 100),
  );
  return { offset, width };
}
