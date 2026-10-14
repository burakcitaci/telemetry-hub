import type { MonitorSeries } from './model';

export function historyInRange(series: MonitorSeries, from: number, to: number, maxGapMs = 90_000) {
  const points = series.points.filter(point => Number.isFinite(point.t) && point.t >= from && point.t <= to)
    .map(point => ({ t: point.t, value: Number.isFinite(point.v) ? point.v : null })).sort((a, b) => a.t - b.t);
  const data: Array<{ t: number; value: number | null }> = [{ t: from, value: null }];
  points.forEach((point, index) => {
    if (index && point.t - points[index - 1].t > maxGapMs) data.push({ t: points[index - 1].t + 30_000, value: null });
    data.push(point);
  });
  data.push({ t: to, value: null });
  return data;
}
