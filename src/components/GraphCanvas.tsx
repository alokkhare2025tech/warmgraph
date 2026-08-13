import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { GraphNode, NodeKind, Subgraph } from '../../shared/types';
import { KIND_COLOR } from '../lib/format';

interface LayoutNode extends SimulationNodeDatum, GraphNode {
  radius: number;
}

type LayoutLink = SimulationLinkDatum<LayoutNode> & { id: string; type: string };

const WIDTH = 1000;
const HEIGHT = 620;

/**
 * The layout is computed once per dataset, synchronously, rather than animated.
 *
 * A settled graph appears instantly instead of writhing for two seconds, it
 * costs no frames while the user reads it, and — because we seed the starting
 * positions deterministically — the same subgraph always lays out the same way,
 * so the README screenshots match what a reviewer sees.
 */
function layout(subgraph: Subgraph): { nodes: LayoutNode[]; links: LayoutLink[] } {
  const nodes: LayoutNode[] = subgraph.nodes.map((node, index) => {
    const angle = (index / Math.max(subgraph.nodes.length, 1)) * Math.PI * 2;
    const ring = node.id === subgraph.center?.id ? 0 : 160 + (index % 5) * 34;
    return {
      ...node,
      radius: node.id === subgraph.center?.id ? 15 : Math.min(11, 5 + Math.sqrt(node.degree) * 1.9),
      x: WIDTH / 2 + Math.cos(angle) * ring,
      y: HEIGHT / 2 + Math.sin(angle) * ring,
    };
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const links: LayoutLink[] = subgraph.edges
    .filter((edge) => byId.has(edge.source) && byId.has(edge.target))
    .map((edge) => ({ id: edge.id, type: edge.type, source: byId.get(edge.source)!, target: byId.get(edge.target)! }));

  const centerNode = subgraph.center ? byId.get(subgraph.center.id) : undefined;
  if (centerNode) {
    centerNode.fx = WIDTH / 2;
    centerNode.fy = HEIGHT / 2;
  }

  const simulation = forceSimulation(nodes)
    .force('link', forceLink<LayoutNode, LayoutLink>(links).id((node) => node.id).distance(74).strength(0.45))
    .force('charge', forceManyBody().strength(-230).distanceMax(460))
    .force('center', forceCenter(WIDTH / 2, HEIGHT / 2))
    .force('collide', forceCollide<LayoutNode>().radius((node) => node.radius + 12))
    .force('x', forceX(WIDTH / 2).strength(0.035))
    .force('y', forceY(HEIGHT / 2).strength(0.06))
    .stop();

  simulation.tick(320);
  return { nodes, links };
}

export function GraphCanvas({
  subgraph,
  onSelect,
  height = 560,
}: {
  subgraph: Subgraph;
  onSelect?: (node: GraphNode) => void;
  height?: number;
}) {
  const { nodes, links } = useMemo(() => layout(subgraph), [subgraph]);
  const [hovered, setHovered] = useState<LayoutNode | null>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Reset the viewport whenever we centre on a different entity.
  useEffect(() => setTransform({ k: 1, x: 0, y: 0 }), [subgraph.center?.id]);

  const onWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    setTransform((current) => {
      const next = Math.min(2.8, Math.max(0.35, current.k * (event.deltaY < 0 ? 1.12 : 0.89)));
      return { ...current, k: next };
    });
  }, []);

  function onPointerDown(event: React.PointerEvent) {
    dragState.current = { startX: event.clientX, startY: event.clientY, originX: transform.x, originY: transform.y };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;
    setTransform((current) => ({
      ...current,
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    }));
  }

  function onPointerUp() {
    dragState.current = null;
  }

  const kinds = useMemo(() => {
    const present = new Set<NodeKind>();
    for (const node of subgraph.nodes) present.add(node.kind);
    return [...present];
  }, [subgraph.nodes]);

  const tipPosition = hovered
    ? {
        left: Math.max(8, ((hovered.x ?? 0) * transform.k + transform.x) / WIDTH * 100),
        top: ((hovered.y ?? 0) * transform.k + transform.y) / HEIGHT * 100,
      }
    : null;

  return (
    <div className="canvas-wrap" style={{ height }}>
      <div className="graph-controls">
        <button type="button" className="btn btn--sm" onClick={() => setTransform((t) => ({ ...t, k: Math.min(2.8, t.k * 1.2) }))} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="btn btn--sm" onClick={() => setTransform((t) => ({ ...t, k: Math.max(0.35, t.k * 0.83) }))} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="btn btn--sm" onClick={() => setTransform({ k: 1, x: 0, y: 0 })}>
          Reset
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        role="img"
        aria-label={`Graph of ${subgraph.nodes.length} entities around ${subgraph.center?.label ?? 'the selection'}`}
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {links.map((link) => {
            const source = link.source as LayoutNode;
            const target = link.target as LayoutNode;
            const touched = hovered && (source.id === hovered.id || target.id === hovered.id);
            return (
              <line
                key={link.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={touched ? 'var(--warm)' : 'var(--border-strong)'}
                strokeWidth={touched ? 1.6 : 0.9}
                strokeOpacity={hovered && !touched ? 0.25 : 0.75}
              />
            );
          })}

          {nodes.map((node) => {
            const dimmed =
              hovered &&
              hovered.id !== node.id &&
              !links.some(
                (link) =>
                  ((link.source as LayoutNode).id === hovered.id && (link.target as LayoutNode).id === node.id) ||
                  ((link.target as LayoutNode).id === hovered.id && (link.source as LayoutNode).id === node.id),
              );

            return (
              <g
                key={node.id}
                transform={`translate(${node.x ?? 0} ${node.y ?? 0})`}
                opacity={dimmed ? 0.3 : 1}
                onMouseEnter={() => setHovered(node)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect?.(node)}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              >
                <circle
                  r={node.radius}
                  fill={KIND_COLOR[node.kind]}
                  fillOpacity={node.id === subgraph.center?.id ? 1 : 0.85}
                  stroke={node.id === subgraph.center?.id ? 'var(--text)' : 'var(--bg)'}
                  strokeWidth={node.id === subgraph.center?.id ? 2.5 : 1.5}
                />
                {node.radius >= 9 || node.id === subgraph.center?.id ? (
                  <text
                    y={node.radius + 13}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--text-muted)"
                    style={{ pointerEvents: 'none', fontFamily: 'var(--sans)' }}
                  >
                    {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && tipPosition ? (
        <div
          className="graph-tip"
          style={{ left: `${Math.min(78, tipPosition.left)}%`, top: `${Math.min(84, Math.max(2, tipPosition.top))}%` }}
        >
          <div className="row" style={{ gap: 6 }}>
            <span className="dot" style={{ background: KIND_COLOR[hovered.kind] }} aria-hidden />
            <strong>{hovered.label}</strong>
          </div>
          <div className="faint" style={{ fontSize: 11.5 }}>
            {hovered.kind}
            {hovered.sublabel ? ` · ${hovered.sublabel}` : ''}
          </div>
        </div>
      ) : null}

      <div className="legend">
        {kinds.map((kind) => (
          <span key={kind} className="row" style={{ gap: 5 }}>
            <span className="dot" style={{ background: KIND_COLOR[kind] }} aria-hidden />
            {kind}
          </span>
        ))}
        <span className="faint">· scroll to zoom, drag to pan, click a node to centre on it</span>
      </div>
    </div>
  );
}
