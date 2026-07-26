import styles from './LineChart.module.css';

interface Point {
  temperature: number;
  humidity: number;
  fetchedAt: string;
}

type Range = '24h' | '7d' | '30d';

interface Props {
  points: Point[];
  range: Range;
}

const WIDTH = 320;
const HEIGHT = 180;
const PADDING = { top: 12, right: 34, bottom: 22, left: 34 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const TICK_COUNT = 4;

function niceRange(min: number, max: number): [number, number] {
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.15;
  return [min - pad, max + pad];
}

function formatXTick(date: Date, range: Range): string {
  if (range === '24h') {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function LineChart({ points, range }: Props) {
  if (points.length === 0) {
    return <p>データがまだありません</p>;
  }

  const times = points.map((p) => new Date(p.fetchedAt).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = maxTime - minTime || 1;

  const [tempMin, tempMax] = niceRange(
    Math.min(...points.map((p) => p.temperature)),
    Math.max(...points.map((p) => p.temperature))
  );
  const [humMin, humMax] = niceRange(
    Math.min(...points.map((p) => p.humidity)),
    Math.max(...points.map((p) => p.humidity))
  );

  const xScale = (t: number) => PADDING.left + ((t - minTime) / timeSpan) * PLOT_WIDTH;
  const yScale = (v: number, min: number, max: number) =>
    PADDING.top + PLOT_HEIGHT - ((v - min) / (max - min)) * PLOT_HEIGHT;

  const buildPath = (key: 'temperature' | 'humidity', min: number, max: number) =>
    points
      .map((p, i) => {
        const x = xScale(new Date(p.fetchedAt).getTime());
        const y = yScale(p[key], min, max);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const gridRows = Array.from({ length: TICK_COUNT }, (_, i) => {
    const frac = i / (TICK_COUNT - 1);
    const y = PADDING.top + PLOT_HEIGHT * (1 - frac);
    const tempValue = tempMin + (tempMax - tempMin) * frac;
    const humValue = humMin + (humMax - humMin) * frac;
    return { y, tempValue, humValue };
  });

  const xTicks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const frac = i / (TICK_COUNT - 1);
    const t = minTime + timeSpan * frac;
    return { x: PADDING.left + PLOT_WIDTH * frac, label: formatXTick(new Date(t), range) };
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--color-danger)' }} />
          温度 ({Math.round(Math.min(...points.map((p) => p.temperature)))}〜
          {Math.round(Math.max(...points.map((p) => p.temperature)))}℃)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--color-accent)' }} />
          湿度 ({Math.round(Math.min(...points.map((p) => p.humidity)))}〜
          {Math.round(Math.max(...points.map((p) => p.humidity)))}%)
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={styles.svg} role="img" aria-label="温湿度の推移グラフ">
        {gridRows.map((row, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={row.y}
              y2={row.y}
              className={styles.gridline}
            />
            <text x={PADDING.left - 6} y={row.y + 3} textAnchor="end" className={styles.axisLabel}>
              {row.tempValue.toFixed(0)}
            </text>
            <text x={WIDTH - PADDING.right + 6} y={row.y + 3} textAnchor="start" className={styles.axisLabel}>
              {row.humValue.toFixed(0)}
            </text>
          </g>
        ))}

        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={HEIGHT - PADDING.bottom}
          y2={HEIGHT - PADDING.bottom}
          className={styles.xAxisLine}
        />
        {xTicks.map((tick, i) => (
          <text key={i} x={tick.x} y={HEIGHT - PADDING.bottom + 14} textAnchor="middle" className={styles.axisLabel}>
            {tick.label}
          </text>
        ))}

        <path d={buildPath('temperature', tempMin, tempMax)} fill="none" stroke="var(--color-danger)" strokeWidth={2} />
        <path d={buildPath('humidity', humMin, humMax)} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
      </svg>
    </div>
  );
}
