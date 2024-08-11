'use client';

import { atom, useStore, type WritableAtom } from 'jotai';
import { type ReactNode, useRef } from 'react';

type AnyWritableAtom = WritableAtom<unknown, never[], unknown>;

type InferAtomTuples<T> = {
  [K in keyof T]: T[K] extends readonly [infer A, ...unknown[]]
    ? A extends WritableAtom<unknown, infer Args, unknown>
      ? readonly [A, ...Args]
      : T[K]
    : never;
};

export function HydrationBoundary<
  T extends (readonly [AnyWritableAtom, ...unknown[]])[],
>({
  children,
  hydrateAtoms,
}: {
  children?: ReactNode;
  hydrateAtoms: InferAtomTuples<T>;
}) {
  const isHydratedRef = useRef(false);
  const store = useStore();

  if (!isHydratedRef.current) {
    store.set(isHydratingPrimitiveAtom, true);
    for (const [atom, ...args] of hydrateAtoms) {
      store.set(atom, ...args);
    }
    store.set(isHydratingPrimitiveAtom, false);
    isHydratedRef.current = true;
  }

  return <>{children}</>;
}

const isHydratingPrimitiveAtom = atom(false);

export const isHydratingAtom = atom((get) => get(isHydratingPrimitiveAtom));
