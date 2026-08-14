import type { GraphEdge, GraphNode, Subgraph } from '../../shared/types.js';
import { GRAPH_CENTER, NEIGHBOURHOOD_QUERIES } from '../cypher.js';
import { badRequest, notFound } from '../errors.js';
import type { Tracer } from '../execute.js';
import { displayNameOf, formatUsdShort, kindOf, toNumber, type RawNode } from '../mappers.js';

const MAX_PATHS = 400;

function subtitleOf(node: RawNode): string {
  const props = node.props;
  switch (kindOf(node.labels)) {
    case 'Person':
      return String(props.headline ?? props.city ?? '');
    case 'Company':
      return [props.stage, props.city].filter(Boolean).join(' · ');
    case 'Investor':
      return [props.type, props.hq].filter(Boolean).join(' · ');
    case 'Round':
      return `${props.stage ?? ''} ${formatUsdShort(toNumber(props.amountUsd))}`.trim();
    case 'Sector':
      return 'Sector';
    case 'School':
      return 'School';
    default:
      return '';
  }
}

function toGraphNode(node: RawNode): GraphNode {
  return {
    id: String(node.props.id ?? ''),
    kind: kindOf(node.labels),
    label: displayNameOf(node),
    sublabel: subtitleOf(node),
    degree: 0,
  };
}

/**
 * Returns the 1- or 2-hop neighbourhood of any entity, deduplicated and sized
 * for a force-directed layout in the browser.
 */
export async function getNeighbourhood(tracer: Tracer, id: string, depth: number): Promise<Subgraph> {
  // The depth is used to pick a *pre-written* statement, never to build one.
  const statement = NEIGHBOURHOOD_QUERIES[depth];
  if (!statement) {
    throw badRequest(`Unsupported depth "${depth}".`, 'The explorer supports depth 1 or 2.');
  }

  const [centerRow, neighbourhood] = await Promise.all([
    tracer.row(GRAPH_CENTER, { id }),
    tracer.row(statement, { id, limit: MAX_PATHS }),
  ]);

  if (!centerRow?.id) {
    throw notFound(`No entity with id "${id}".`);
  }

  const center = toGraphNode({ labels: centerRow.labels as string[], props: centerRow.props });

  const nodes = new Map<string, GraphNode>();
  nodes.set(center.id, center);

  for (const raw of (neighbourhood?.nodes ?? []) as Array<{ id: string; labels: string[]; props: Record<string, any> }>) {
    const node = toGraphNode({ labels: raw.labels, props: raw.props });
    if (node.id && !nodes.has(node.id)) nodes.set(node.id, node);
  }

  const edges = new Map<string, GraphEdge>();
  for (const raw of (neighbourhood?.rels ?? []) as Array<{ type: string; fromId: string; toId: string }>) {
    if (!raw.fromId || !raw.toId) continue;
    // Node ids are our own stable business keys, so this composite key is a
    // reliable identity for an edge without relying on internal element ids.
    const key = `${raw.fromId}|${raw.type}|${raw.toId}`;
    if (!edges.has(key)) {
      edges.set(key, { id: key, source: raw.fromId, target: raw.toId, type: raw.type });
    }
  }

  for (const edge of edges.values()) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (source) source.degree += 1;
    if (target) target.degree += 1;
  }

  // Drop edges whose endpoints fell outside the returned node set — a path
  // limit can truncate one side and leave a dangling reference.
  const validEdges = [...edges.values()].filter((edge) => nodes.has(edge.source) && nodes.has(edge.target));

  return { nodes: [...nodes.values()], edges: validEdges, center };
}
