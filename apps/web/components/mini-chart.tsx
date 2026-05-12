type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  className?: string;
};

export function MiniChart({
  data,
  width = 120,
  height = 36,
  color = 'var(--accent-700)',
  fill = 'var(--accent-100)',
  className,
}: Props) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1 || 1);

  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${(pts.at(-1)?.[0] ?? 0).toFixed(2)},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
      role="img"
      aria-label="24h spend trend"
    >
      <path d={areaPath} fill={fill} opacity="0.6" />
      <path d={linePath} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
