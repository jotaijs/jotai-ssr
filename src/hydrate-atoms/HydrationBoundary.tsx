'use client';

import type { PropsWithChildren } from 'react';
import type { AnyWritableAtom, InferAtomTuples } from './types.js';
import { useHydrateAtoms } from './use-hydrate-atoms.js';

export function HydrationBoundary<
  T extends (readonly [AnyWritableAtom, ...unknown[]])[],
>({
  children,
  hydrateAtoms,
}: PropsWithChildren<{ hydrateAtoms: InferAtomTuples<T> }>) {
  useHydrateAtoms(hydrateAtoms);

  return <>{children}</>;
}
