import { useEffect, useState } from 'react';

/**
 * A ~30-line hash router.
 *
 * Hash routing means the app is a genuinely static bundle: no server rewrite
 * rules, no 404s on refresh, works on any host. For an app with eight screens
 * that is a better trade than pulling in a routing library.
 */
export interface Route {
  name: string;
  param: string | null;
}

function parse(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  if (!clean) return { name: 'home', param: null };
  const [name, param] = clean.split('/');
  return { name: name || 'home', param: param ? decodeURIComponent(param) : null };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(to: string): void {
  window.location.hash = to.startsWith('#') ? to.slice(1) : to;
}
