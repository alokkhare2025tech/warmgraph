import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { QueryTrace } from '../../shared/types';
import { CypherBlock } from './Cypher';

/**
 * "Query behind this screen".
 *
 * Each API response carries the execution log that produced it, so this drawer
 * is not documentation that can go stale — it is the queries that just ran,
 * with their bound parameters and timings. It is also the clearest way to show
 * that nothing is string-concatenated: the Cypher is constant, the parameters
 * sit in a separate block.
 */
export function QueryDrawer({ traces, onClose }: { traces: QueryTrace[]; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const totalMs = traces.reduce((sum, trace) => sum + trace.tookMs, 0);

  async function copy(trace: QueryTrace) {
    const payload = `${trace.cypher}\n\n/* parameters */\n${JSON.stringify(trace.params, null, 2)}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(trace.name);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  // Rendered into <body> rather than in place. The trigger button lives in the
  // top bar, which uses `backdrop-filter` — and that creates a containing block
  // for fixed-position descendants, so an inline drawer would be clipped to the
  // 60px-tall header instead of covering the viewport.
  return createPortal(
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Queries behind this screen">
        <header className="drawer__head">
          <div className="stack">
            <strong>Query behind this screen</strong>
            <span className="faint" style={{ fontSize: 12.5 }}>
              {traces.length} statement{traces.length === 1 ? '' : 's'} · {totalMs} ms total
            </span>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            Close ✕
          </button>
        </header>

        <div className="drawer__body">
          {traces.length === 0 ? (
            <p className="muted">No queries ran for this view.</p>
          ) : (
            traces.map((trace, index) => (
              <section className="query-block" key={`${trace.name}-${index}`}>
                <div className="query-block__head">
                  <div className="stack">
                    <span className="query-block__name">{trace.name}</span>
                    <span className="faint" style={{ fontSize: 12 }}>
                      {trace.purpose}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="badge">{trace.rows} rows</span>
                    <span className="badge">{trace.tookMs} ms</span>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => copy(trace)}>
                      {copied === trace.name ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <CypherBlock source={trace.cypher} />

                <pre className="params">
                  <span className="faint">parameters </span>
                  {JSON.stringify(trace.params)}
                </pre>
              </section>
            ))
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}

/** The button that opens the drawer. Rendered in the top bar on every screen. */
export function QueryButton({ traces }: { traces: QueryTrace[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn--sm"
        onClick={() => setOpen(true)}
        disabled={traces.length === 0}
        title="See the exact Cypher that produced this screen"
      >
        <span className="mono" style={{ color: 'var(--warm)' }}>
          {'{ }'}
        </span>
        Cypher
        {traces.length > 0 ? <span className="faint">· {traces.length}</span> : null}
      </button>
      {open ? <QueryDrawer traces={traces} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
