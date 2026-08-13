import { SchemaDiagram } from '../components/SchemaDiagram';
import { KIND_CLASS } from '../lib/format';
import type { NodeKind } from '../../shared/types';

const NODES: Array<{ kind: NodeKind; properties: string; note: string }> = [
  {
    kind: 'Person',
    properties: 'id, name, headline, city, isPersona',
    note: 'Founders, operators and investing partners are all People. Keeping them one label is what lets a single traversal cross from a founder, through a former colleague, to a partner at a fund.',
  },
  {
    kind: 'Company',
    properties: 'id, name, city, stage, foundedYear, description, website, headcount',
    note: 'Doubles as a connector: two people who worked at the same company are two hops apart without needing an explicit edge between them.',
  },
  {
    kind: 'Investor',
    properties: 'id, name, type, hq, thesis, checkSizeUsd',
    note: 'The firm, not the human. You raise from a firm but you get introduced to a Person — modelling both is what makes the intro engine work.',
  },
  {
    kind: 'Round',
    properties: 'id, stage, amountUsd, announcedOn, valuationUsd',
    note: 'A round is a node rather than an edge because it joins one company to many investors. As a relationship it could only ever connect two things.',
  },
  {
    kind: 'Sector',
    properties: 'id, name',
    note: 'Shared by companies (what they do) and investors (what they will fund). That shared node is the whole conflict-of-interest query.',
  },
  {
    kind: 'School',
    properties: 'id, name',
    note: 'The weakest tie we model, and scored accordingly — an alumni link only counts for much when the graduation years line up.',
  },
];

const RELATIONSHIPS = [
  { type: 'KNOWS', from: 'Person', to: 'Person', properties: 'strength, context, since', note: 'The explicit personal network. Stored once and traversed undirected.' },
  { type: 'FOUNDED', from: 'Person', to: 'Company', properties: 'role, year', note: 'Two people who founded the same company are co-founders — the strongest tie in the graph.' },
  { type: 'WORKED_AT', from: 'Person', to: 'Company', properties: 'role, fromYear, toYear', note: 'The years matter: a shared employer only counts if the two people were there at the same time.' },
  { type: 'STUDIED_AT', from: 'Person', to: 'School', properties: 'degree, gradYear', note: 'Same reasoning — a shared campus twelve years apart is not a connection.' },
  { type: 'ADVISES', from: 'Person', to: 'Company', properties: 'since', note: 'A lighter commitment than founding, and scored below it.' },
  { type: 'PARTNER_AT', from: 'Person', to: 'Investor', properties: 'role, since', note: 'The bridge from the people graph into the capital graph.' },
  { type: 'RAISED', from: 'Company', to: 'Round', properties: '—', note: 'Exactly one company per round.' },
  { type: 'PARTICIPATED_IN', from: 'Investor', to: 'Round', properties: 'lead, amountUsd', note: 'Many investors per round; `lead` and the cheque size hang off the edge, which is where they belong.' },
  { type: 'OPERATES_IN', from: 'Company', to: 'Sector', properties: '—', note: 'A company can sit in more than one sector.' },
  { type: 'FOCUSES_ON', from: 'Investor', to: 'Sector', properties: '—', note: 'The firm\'s stated thesis, used to rank recommendations.' },
  { type: 'COMPETES_WITH', from: 'Company', to: 'Company', properties: '—', note: 'Declared rivalry. Upgrades a conflict from "worth noting" to "worth a conversation".' },
];

export function ModelPage() {
  return (
    <>
      <div className="page-head">
        <h1>Data model</h1>
        <p>
          Six node labels, eleven relationship types. Every searchable node also carries a shared{' '}
          <span className="mono">:Entity</span> label, which is what lets one query power the search box and one query
          power the graph explorer.
        </p>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <SchemaDiagram />
      </div>

      <div className="section-head">
        <h2>Nodes</h2>
        <span>and why each one exists</span>
      </div>
      <div className="grid grid--2">
        {NODES.map((node) => (
          <div className="card" key={node.kind}>
            <div className="row row--between" style={{ gap: 8 }}>
              <span className={KIND_CLASS[node.kind]}>{node.kind}</span>
            </div>
            <p className="mono faint" style={{ margin: '10px 0 0', fontSize: 11.5 }}>
              {node.properties}
            </p>
            <p className="muted" style={{ margin: '8px 0 0', fontSize: 12.5 }}>
              {node.note}
            </p>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2>Relationships</h2>
        <span>direction matters; traversal often does not</span>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>From → To</th>
                <th>Properties</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {RELATIONSHIPS.map((relationship) => (
                <tr key={relationship.type}>
                  <td className="mono" style={{ color: 'var(--round)' }}>
                    {relationship.type}
                  </td>
                  <td className="nowrap muted">
                    {relationship.from} → {relationship.to}
                  </td>
                  <td className="mono faint" style={{ fontSize: 11.5 }}>
                    {relationship.properties}
                  </td>
                  <td className="muted" style={{ minWidth: 280 }}>
                    {relationship.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-head">
        <h2>Why a graph database?</h2>
      </div>
      <div className="card">
        <p style={{ marginTop: 0 }}>
          The question this product answers is <em>“what is the shortest credible chain of people between me and this
          investor?”</em> That is a variable-length path query. In a relational schema the number of joins depends on the
          answer — you cannot write the SQL until you know how many hops it takes — so you end up with either a recursive
          CTE that is slow and unreadable, or a fixed join depth that silently misses longer routes.
        </p>
        <p>
          In Cypher the hop count is part of the pattern:{' '}
          <span className="mono">(me)-[:KNOWS|WORKED_AT|FOUNDED|STUDIED_AT*1..4]-(partner)</span>. The traversal cost is
          proportional to the neighbourhood actually explored, not to the size of the tables.
        </p>
        <p style={{ marginBottom: 0 }}>
          The same holds for the conflict query: six hops, one <span className="mono">MATCH</span>, versus a four-way
          self-join over the round-participation table. And the model absorbs change — adding{' '}
          <span className="mono">MENTORS</span> or <span className="mono">SERVED_ON_BOARD</span> is a new relationship
          type and one more name in the traversal, not a migration and a rewritten join.
        </p>
      </div>
    </>
  );
}
