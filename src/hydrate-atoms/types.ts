import type { WritableAtom } from 'jotai';
import type { Store } from '../shared.js';

export type AnyWritableAtom = WritableAtom<unknown, never[], unknown>;

export type InferAtomTuples<T> = {
  [K in keyof T]: T[K] extends readonly [infer A, ...unknown[]]
    ? A extends WritableAtom<unknown, infer Args, unknown>
      ? readonly [A, ...Args]
      : T[K]
    : never;
};

export type HydrateAtomOptions = {
  store: Store;
  rehydrateKey?: string | undefined;
};
