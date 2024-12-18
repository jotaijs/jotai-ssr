import { atom, useStore } from 'jotai';
import type {
  AnyWritableAtom,
  HydrateAtomOptions,
  InferAtomTuples,
} from './types.js';
import { useCallback, useEffect, useRef } from 'react';

export function useHydrateAtoms<
  T extends (readonly [AnyWritableAtom, ...unknown[]])[],
>(hydrateAtoms: InferAtomTuples<T>, options?: HydrateAtomOptions) {
  const isHydratedRef = useRef(false);
  const lastHydrateAtoms = useRef(hydrateAtoms);
  const store = useStore(
    options?.store != null ? { store: options?.store } : undefined,
  );

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
    if (!options?.enableReHydrate) {
      return;
    }
    if (hydrateAtoms !== lastHydrateAtoms.current) {
      lastHydrateAtoms.current = hydrateAtoms;
      hydrate();
    }
  }, [hydrate, options?.enableReHydrate, hydrateAtoms]);
}

const isHydratingPrimitiveAtom = atom(false);

export const isHydratingAtom = atom((get) => get(isHydratingPrimitiveAtom));
