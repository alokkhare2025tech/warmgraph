import type { PersonDetail } from '../../shared/types';
import { useReportTraces } from '../App';
import { AsyncBoundary, SkeletonRows } from '../components/states';
import { usePersona } from '../lib/persona';
import { navigate } from '../lib/router';
import { useApi } from '../lib/useApi';

const STRENGTH_CLASS: Record<string, string> = {
  strong: 'badge badge--ok',
  medium: 'badge badge--warning',
  weak: 'badge',
};

export function PersonPage({ id }: { id: string }) {
  const state = useApi<PersonDetail>('person', { id });
  const { persona, setPersona } = usePersona();
  useReportTraces(state.traces);

  return (
    <AsyncBoundary state={state} skeleton={<SkeletonRows count={8} />}>
      {(data) => {
        const isMe = persona?.id === data.person.id;
        return (
          <>
            <div className="page-head">
              <div className="row row--between row--wrap" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div className="stack">
                  <h1>{data.person.name}</h1>
                  <p style={{ marginTop: 4 }}>{data.person.headline}</p>
                  <div className="row row--wrap" style={{ gap: 6, marginTop: 8 }}>
                    <span className="badge badge--person">{data.person.city}</span>
                    <span className="badge">{data.contacts.length} direct contacts</span>
                    {isMe ? <span className="badge badge--lead">This is you</span> : null}
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {!isMe ? (
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => {
                        setPersona({
                          id: data.person.id,
                          name: data.person.name,
                          headline: data.person.headline,
                          city: data.person.city,
                          companies: data.founded.map((entry) => entry.name),
                          directContacts: data.contacts.length,
                        });
                        navigate('#/intro');
                      }}
                    >
                      Explore as {data.person.name.split(' ')[0]}
                    </button>
                  ) : null}
                  <a className="btn btn--sm" href={`#/explore/${data.person.id}`}>
                    Explore graph
                  </a>
                </div>
              </div>
            </div>

            {data.founded.length > 0 ? (
              <>
                <div className="section-head">
                  <h2>Founded</h2>
                </div>
                <div className="grid grid--3">
                  {data.founded.map((entry) => (
                    <a key={entry.id} className="card card--link" href={`#/company/${entry.id}`}>
                      <div className="stack">
                        <strong>{entry.name}</strong>
                        <span className="muted" style={{ fontSize: 12.5 }}>
                          {entry.role} · {entry.year}
                        </span>
                        <span className="badge badge--company" style={{ alignSelf: 'flex-start', marginTop: 6 }}>
                          {entry.stage}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            ) : null}

            {data.firms.length > 0 ? (
              <>
                <div className="section-head">
                  <h2>Invests through</h2>
                </div>
                <div className="row row--wrap" style={{ gap: 8 }}>
                  {data.firms.map((firm) => (
                    <a key={firm.id} className="badge badge--investor" href={`#/investor/${firm.id}`}>
                      {firm.name}
                    </a>
                  ))}
                </div>
              </>
            ) : null}

            <div className="section-head">
              <h2>Career</h2>
              <span>Shared employers are where most warm paths come from</span>
            </div>
            {data.employment.length === 0 ? (
              <p className="muted">No employment history recorded.</p>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Role</th>
                      <th>Years</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.employment
                      .slice()
                      .sort((a, b) => b.fromYear - a.fromYear)
                      .map((entry) => (
                        <tr key={`${entry.id}-${entry.fromYear}`} onClick={() => navigate(`#/company/${entry.id}`)} style={{ cursor: 'pointer' }}>
                          <td>
                            <strong style={{ fontWeight: 500 }}>{entry.name}</strong>
                          </td>
                          <td className="muted">{entry.role}</td>
                          <td className="mono faint">
                            {entry.fromYear}–{entry.toYear ?? 'present'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.education.length > 0 ? (
              <>
                <div className="section-head">
                  <h2>Education</h2>
                </div>
                <div className="row row--wrap" style={{ gap: 8 }}>
                  {data.education.map((entry) => (
                    <span key={`${entry.name}-${entry.gradYear}`} className="badge badge--school">
                      {entry.name} · {entry.degree} · {entry.gradYear}
                    </span>
                  ))}
                </div>
              </>
            ) : null}

            <div className="section-head">
              <h2>Direct contacts</h2>
              <span>{data.contacts.length} people, strongest ties first</span>
            </div>
            {data.contacts.length === 0 ? (
              <p className="muted">No direct contacts recorded.</p>
            ) : (
              <div className="grid grid--2">
                {data.contacts.map((contact) => (
                  <a key={contact.id} className="card card--link" href={`#/person/${contact.id}`}>
                    <div className="row row--between" style={{ alignItems: 'flex-start', gap: 10 }}>
                      <div className="stack">
                        <strong>{contact.name}</strong>
                        <span className="muted" style={{ fontSize: 12.5 }}>
                          {contact.headline}
                        </span>
                        <span className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                          {contact.context} · since {contact.since}
                        </span>
                      </div>
                      <span className={STRENGTH_CLASS[contact.strength] ?? 'badge'}>{contact.strength}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        );
      }}
    </AsyncBoundary>
  );
}
