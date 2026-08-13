import { Fragment, type ReactNode } from 'react';

/**
 * A small Cypher highlighter.
 *
 * Pulling in a full syntax-highlighting library for one language would add
 * more bytes than the rest of the app; a single tokenising regex is enough to
 * make the queries readable, which is the whole point of showing them.
 */

const KEYWORDS = new Set([
  'MATCH', 'OPTIONAL', 'WHERE', 'RETURN', 'WITH', 'UNWIND', 'ORDER', 'BY', 'LIMIT', 'SKIP', 'AS',
  'AND', 'OR', 'NOT', 'IN', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'MERGE', 'CREATE',
  'SET', 'DELETE', 'DETACH', 'NULL', 'IS', 'ASC', 'DESC', 'CONSTRAINT', 'INDEX', 'FOR', 'REQUIRE',
  'UNIQUE', 'ON', 'EXISTS', 'CALL', 'YIELD', 'UNION', 'FOREACH',
]);

const FUNCTIONS = new Set([
  'count', 'sum', 'min', 'max', 'avg', 'collect', 'coalesce', 'toLower', 'toUpper', 'size',
  'labels', 'properties', 'type', 'nodes', 'relationships', 'startNode', 'endNode', 'reduce',
  'all', 'any', 'none', 'single', 'length', 'keys', 'range', 'toInteger', 'toFloat', 'id',
]);

// Order matters: strings and comments first so their contents are not re-tokenised.
const TOKEN = /(\/\/[^\n]*)|('(?:[^'\\]|\\.)*')|(\$[A-Za-z_][A-Za-z0-9_]*)|(:[A-Z][A-Za-z0-9_]*(?:\|[A-Z][A-Za-z0-9_]*)*)|([A-Za-z_][A-Za-z0-9_]*)/g;

export function highlightCypher(source: string): ReactNode[] {
  const output: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of source.matchAll(TOKEN)) {
    const [text, comment, str, param, labelOrRel, word] = match;
    const index = match.index ?? 0;

    if (index > lastIndex) output.push(source.slice(lastIndex, index));
    lastIndex = index + text.length;

    if (comment) {
      output.push(<span key={key++} className="cy-comment">{comment}</span>);
    } else if (str) {
      output.push(<span key={key++} className="cy-str">{str}</span>);
    } else if (param) {
      output.push(<span key={key++} className="cy-param">{param}</span>);
    } else if (labelOrRel) {
      output.push(<span key={key++} className="cy-rel">{labelOrRel}</span>);
    } else if (word) {
      const upper = word.toUpperCase();
      if (KEYWORDS.has(upper)) output.push(<span key={key++} className="cy-kw">{word}</span>);
      else if (FUNCTIONS.has(word)) output.push(<span key={key++} className="cy-fn">{word}</span>);
      else output.push(word);
    }
  }

  if (lastIndex < source.length) output.push(source.slice(lastIndex));
  return output;
}

export function CypherBlock({ source }: { source: string }) {
  return (
    <pre className="cypher">
      <code>
        {highlightCypher(source).map((node, index) => (
          <Fragment key={index}>{node}</Fragment>
        ))}
      </code>
    </pre>
  );
}
