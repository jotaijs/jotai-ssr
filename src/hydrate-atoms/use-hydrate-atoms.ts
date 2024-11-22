import { atom, useStore } from 'jotai';
import type { AnyWritableAtom, InferAtomTuples } from './types.js';
import { useCallback, useEffect, useRef } from 'react';

export function useHydrateAtoms<
  T extends (readonly [AnyWritableAtom, ...unknown[]])[],
>(hydrateAtoms: InferAtomTuples<T>) {
  const isHydratedRef = useRef(false);
  const lastHydrateAtoms = useRef(hydrateAtoms);
  const store = useStore();

  const hydrate = useCallback(() => {
    store.set(isHydratingPrimitiveAtom, true);
    for (const [atom, ...args] of hydrateAtoms) {
      store.set(atom, ...args);
    }
    store.set(isHydratingPrimitiveAtom, false);
    isHydratedRef.current = true;
  }, [store, hydrateAtoms]);

  if (!isHydratedRef.current) {
    hydrate();
  }

  useEffect(() => {
    if (lastHydrateAtoms.current !== hydrateAtoms) {
      lastHydrateAtoms.current = hydrateAtoms;
      hydrate();
    }
  }, [hydrate, hydrateAtoms]);
}

const isHydratingPrimitiveAtom = atom(false);

export const isHydratingAtom = atom((get) => get(isHydratingPrimitiveAtom));
