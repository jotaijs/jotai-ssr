'use client';

import type { PropsWithChildren } from 'react';
import type {
  AnyWritableAtom,
  HydrateAtomOptions,
  InferAtomTuples,
} from './types.js';
import { useHydrateAtoms } from './use-hydrate-atoms.js';

export function HydrationBoundary<
  T extends (readonly [AnyWritableAtom, ...unknown[]])[],
>({
  children,
  hydrateAtoms,
  options,
}: PropsWithChildren<{
  hydrateAtoms: InferAtomTuples<T>;
  options?: HydrateAtomOptions | undefined;
}>) {
  useHydrateAtoms(hydrateAtoms, options);

  return <>{children}</>;
}
