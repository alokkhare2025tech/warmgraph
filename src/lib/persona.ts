import { useCallback, useEffect, useState } from 'react';
import type { Persona } from '../../shared/types';

const STORAGE_KEY = 'warmgraph.persona';

/**
 * "Who am I?" is the one piece of state the whole app hangs off — every warm
 * path is computed *from* someone. It is kept in localStorage so a reviewer who
 * opens the hosted demo, picks a founder and shares the URL still lands
 * somewhere sensible.
 */
export function usePersona(): {
  persona: Persona | null;
  setPersona: (persona: Persona | null) => void;
} {
  const [persona, setPersonaState] = useState<Persona | null>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Persona) : null;
    } catch {
      return null;
    }
  });

  const setPersona = useCallback((next: Persona | null) => {
    setPersonaState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private browsing can reject writes; the app still works for the session.
    }
    window.dispatchEvent(new CustomEvent('warmgraph:persona'));
  }, []);

  // Keep every mounted copy of this hook in step.
  useEffect(() => {
    const sync = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        setPersonaState(raw ? (JSON.parse(raw) as Persona) : null);
      } catch {
        setPersonaState(null);
      }
    };
    window.addEventListener('warmgraph:persona', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('warmgraph:persona', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { persona, setPersona };
}
