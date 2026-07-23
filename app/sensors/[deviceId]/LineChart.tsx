interface Point {
  temperature: number;
  humidity: number;
  fetchedAt: string;
}

interface Props {
  points: Point[];
}

const CHART_WIDTH = 300;
const CHART_HEIGHT = 60;

function buildPath(values: number[]): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = values.length > 1 ? CHART_WIDTH / (values.length - 1) : 0;

  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = CHART_HEIGHT - ((v - min) / range) * CHART_HEIGHT;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function LineChart({ points }: Props) {
  if (points.length === 0) {
    return <p>データがまだありません</p>;
  }

  const temperatures = points.map((p) => p.temperature);
  const humidities = points.map((p) => p.humidity);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: '0.8125rem', opacity: 0.75, marginBottom: 4 }}>
          温度 ({Math.min(...temperatures)}℃ 〜 {Math.max(...temperatures)}℃)
        </div>
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} width="100%" height={CHART_HEIGHT} preserveAspectRatio="none">
          <path d={buildPath(temperatures)} fill="none" stroke="#e5484d" strokeWidth={2} />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: '0.8125rem', opacity: 0.75, marginBottom: 4 }}>
          湿度 ({Math.min(...humidities)}% 〜 {Math.max(...humidities)}%)
        </div>
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} width="100%" height={CHART_HEIGHT} preserveAspectRatio="none">
          <path d={buildPath(humidities)} fill="none" stroke="#3b82f6" strokeWidth={2} />
        </svg>
      </div>
    </div>
  );
}
