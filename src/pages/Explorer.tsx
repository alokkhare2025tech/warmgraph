import { useEffect, useState } from 'react';
import type { InvestorListItem, Subgraph } from '../../shared/types';
import { useReportTraces } from '../App';
import { GraphCanvas } from '../components/GraphCanvas';
import { AsyncBoundary, EmptyState, Skeleton } from '../components/states';
import { routeFor } from '../lib/format';
import { navigate } from '../lib/router';
import { useApi } from '../lib/useApi';

/**
 * Free-form exploration. Pick any entity, see one or two hops around it, click
 * a node to re-centre. The URL carries the centre so a view is shareable.
 */
export function ExplorerPage({ id }: { id: string | null }) {
  const [depth, setDepth] = useState(1);
  const seed = useApi<InvestorListItem[]>('investors', { limit: 6 }, { enabled: !id });

  // Land on something interesting rather than an empty canvas.
  useEffect(() => {
    if (!id && seed.data && seed.data.length > 0) {
      navigate(`#/explore/${seed.data[0].id}`);
    }
  }, [id, seed.data]);

  const graph = useApi<Subgraph>('graph', { id: id ?? undefined, depth }, { enabled: Boolean(id) });
  useReportTraces(graph.traces);

  if (!id) {
    return (
      <>
        <div className="page-head">
          <h1>Graph explorer</h1>
          <p>Every node and edge, laid out with a force simulation. Click anything to re-centre on it.</p>
        </div>
        <Skeleton height={520} radius={12} />
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="row row--between row--wrap" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div className="stack">
            <h1>{graph.data?.center?.label ?? 'Graph explorer'}</h1>
            <p style={{ marginTop: 4 }}>
              {graph.data
                ? `${graph.data.nodes.length} entities and ${graph.data.edges.length} relationships within ${depth} hop${depth === 1 ? '' : 's'}.`
                : 'Loading the neighbourhood…'}
            </p>
          </div>
          <div className="row row--wrap" style={{ gap: 8 }}>
            <div className="segmented">
              {[1, 2].map((option) => (
                <button key={option} type="button" aria-pressed={depth === option} onClick={() => setDepth(option)}>
                  {option} hop{option === 1 ? '' : 's'}
                </button>
              ))}
            </div>
            {graph.data?.center ? (
              <a className="btn btn--sm" href={routeFor(graph.data.center.kind, graph.data.center.id)}>
                Open profile
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <AsyncBoundary
        state={graph}
        skeleton={<Skeleton height={560} radius={12} />}
        isEmpty={(data) => data.nodes.length <= 1}
        empty={
          <EmptyState
            title="Nothing connected here"
            body="This entity has no relationships within the selected depth. Try two hops, or pick another node."
            icon="◌"
            action={
              depth === 1 ? (
                <button type="button" className="btn btn--sm" onClick={() => setDepth(2)}>
                  Try two hops
                </button>
              ) : undefined
            }
          />
        }
      >
        {(data) => (
          <GraphCanvas subgraph={data} onSelect={(node) => navigate(`#/explore/${node.id}`)} height={560} />
        )}
      </AsyncBoundary>

      <p className="faint" style={{ marginTop: 12, fontSize: 12.5 }}>
        Two hops from a well-connected firm can return several hundred nodes; the query caps the number of paths it
        expands so the free-tier instance stays responsive.
      </p>
    </>
  );
}
