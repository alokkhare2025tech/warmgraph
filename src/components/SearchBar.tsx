import { useEffect, useRef, useState } from 'react';
import type { SearchHit } from '../../shared/types';
import { KIND_CLASS, routeFor } from '../lib/format';
import { navigate } from '../lib/router';
import { useApi, useDebounced } from '../lib/useApi';

/**
 * One search box for people, companies, investors and sectors — which is only
 * possible because every searchable node shares the :Entity label. Full
 * keyboard support: ⌘K / Ctrl-K to focus, arrows to move, Enter to open.
 */
export function SearchBar() {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debounced = useDebounced(term);
  const { data, loading } = useApi<SearchHit[]>('search', { q: debounced }, { enabled: debounced.trim().length >= 2 });
  const hits = debounced.trim().length >= 2 ? (data ?? []) : [];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => setActive(0), [debounced]);

  function go(hit: SearchHit) {
    navigate(routeFor(hit.kind, hit.id));
    setOpen(false);
    setTerm('');
    inputRef.current?.blur();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (hits.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % hits.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + hits.length) % hits.length);
    } else if (event.key === 'Enter' && hits[active]) {
      event.preventDefault();
      go(hits[active]);
    }
  }

  const showPanel = open && debounced.trim().length >= 2;

  return (
    <div className="search" ref={containerRef}>
      <span className="search__icon" aria-hidden>
        ⌕
      </span>
      <input
        ref={inputRef}
        className="input search__input"
        placeholder="Search founders, companies, funds…"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Search the graph"
        aria-expanded={showPanel}
        role="combobox"
        aria-controls="search-results"
      />
      {term ? null : <span className="search__kbd">⌘K</span>}

      {showPanel ? (
        <div className="search__results" id="search-results" role="listbox">
          {loading && hits.length === 0 ? (
            <div className="search__result faint">Searching…</div>
          ) : hits.length === 0 ? (
            <div className="search__result faint">No matches for “{debounced}”.</div>
          ) : (
            hits.map((hit, index) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                type="button"
                className="search__result"
                data-active={index === active}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(hit)}
              >
                <span className={KIND_CLASS[hit.kind]}>{hit.kind}</span>
                <span className="stack" style={{ flex: 1 }}>
                  <strong style={{ fontWeight: 500 }}>{hit.label}</strong>
                  {hit.sublabel ? (
                    <span className="faint" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {hit.sublabel}
                    </span>
                  ) : null}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
