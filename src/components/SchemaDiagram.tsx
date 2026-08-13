import type { NodeKind } from '../../shared/types';
import { KIND_COLOR } from '../lib/format';

/**
 * The data model, drawn to scale.
 *
 * This is hand-placed rather than force-laid-out on purpose: a schema diagram
 * should look identical every time it is opened, and it is exported as-is into
 * the README.
 */

const BOX_W = 152;
const BOX_H = 52;

const BOXES: Array<{ kind: NodeKind; x: number; y: number }> = [
  { kind: 'School', x: 40, y: 40 },
  { kind: 'Person', x: 300, y: 180 },
  { kind: 'Company', x: 648, y: 58 },
  { kind: 'Investor', x: 56, y: 398 },
  { kind: 'Round', x: 648, y: 300 },
  { kind: 'Sector', x: 392, y: 440 },
];

function Box({ kind, x, y }: { kind: NodeKind; x: number; y: number }) {
  const color = KIND_COLOR[kind];
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={BOX_W}
        height={BOX_H}
        rx={10}
        fill="var(--surface-2)"
        stroke={color}
        strokeWidth={1.4}
      />
      <circle cx={x + 18} cy={y + BOX_H / 2} r={5} fill={color} />
      <text x={x + 32} y={y + BOX_H / 2 + 4.5} fill="var(--text)" fontSize={14} fontWeight={600}>
        {kind}
      </text>
    </g>
  );
}

function Edge({
  from,
  to,
  label,
  labelX,
  labelY,
  curve,
}: {
  from: [number, number];
  to: [number, number];
  label: string;
  labelX: number;
  labelY: number;
  curve?: [number, number];
}) {
  const d = curve
    ? `M ${from[0]} ${from[1]} Q ${curve[0]} ${curve[1]} ${to[0]} ${to[1]}`
    : `M ${from[0]} ${from[1]} L ${to[0]} ${to[1]}`;

  return (
    <g>
      <path d={d} fill="none" stroke="var(--border-strong)" strokeWidth={1.3} markerEnd="url(#arrow)" />
      <rect
        x={labelX - label.length * 3.5 - 5}
        y={labelY - 9}
        width={label.length * 7 + 10}
        height={16}
        rx={4}
        fill="var(--surface)"
      />
      <text
        x={labelX}
        y={labelY + 3}
        textAnchor="middle"
        fontSize={10.5}
        fill="var(--text-muted)"
        fontFamily="var(--mono)"
        letterSpacing="0.02em"
      >
        {label}
      </text>
    </g>
  );
}

export function SchemaDiagram() {
  return (
    <svg viewBox="0 0 960 540" width="100%" role="img" aria-label="WarmGraph data model">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
        </marker>
      </defs>

      {/* Person → School */}
      <Edge from={[318, 180]} to={[168, 96]} label="STUDIED_AT" labelX={244} labelY={128} />

      {/* Person → Company, three distinct relationship types */}
      <Edge from={[452, 190]} to={[644, 74]} label="FOUNDED" labelX={520} labelY={124} />
      <Edge from={[452, 206]} to={[644, 92]} label="WORKED_AT" labelX={556} labelY={152} />
      <Edge from={[452, 222]} to={[644, 110]} label="ADVISES" labelX={590} labelY={181} />

      {/* Person → Investor */}
      <Edge from={[326, 234]} to={[176, 396]} label="PARTNER_AT" labelX={228} labelY={330} />

      {/* Person KNOWS Person */}
      <path
        d="M 340 180 C 320 128, 432 128, 412 180"
        fill="none"
        stroke="var(--warm-line)"
        strokeWidth={1.5}
        markerEnd="url(#arrow)"
      />
      <rect x={340} y={131} width={74} height={16} rx={4} fill="var(--surface)" />
      <text x={377} y={143} textAnchor="middle" fontSize={10.5} fill="var(--warm)" fontFamily="var(--mono)">
        KNOWS
      </text>

      {/* Company RAISED Round */}
      <Edge from={[724, 112]} to={[724, 298]} label="RAISED" labelX={724} labelY={206} />

      {/* Investor PARTICIPATED_IN Round */}
      <Edge from={[210, 412]} to={[644, 336]} label="PARTICIPATED_IN" labelX={430} labelY={362} />

      {/* Company OPERATES_IN Sector */}
      <Edge
        from={[652, 112]}
        to={[536, 442]}
        label="OPERATES_IN"
        labelX={628}
        labelY={300}
        curve={[652, 300]}
      />

      {/* Investor FOCUSES_ON Sector */}
      <Edge from={[210, 438]} to={[388, 462]} label="FOCUSES_ON" labelX={300} labelY={438} />

      {/* Company COMPETES_WITH Company */}
      <path
        d="M 800 58 C 856 24, 906 74, 852 110"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth={1.3}
        markerEnd="url(#arrow)"
      />
      <rect x={806} y={18} width={112} height={16} rx={4} fill="var(--surface)" />
      <text x={862} y={30} textAnchor="middle" fontSize={10.5} fill="var(--text-muted)" fontFamily="var(--mono)">
        COMPETES_WITH
      </text>

      {BOXES.map((box) => (
        <Box key={box.kind} {...box} />
      ))}
    </svg>
  );
}
