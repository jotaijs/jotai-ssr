import type { createStore, WritableAtom } from 'jotai';

export type Store = ReturnType<typeof createStore>;

export type AnyWritableAtom = WritableAtom<unknown, never[], unknown>;

export type InferAtomTuples<T> = {
  [K in keyof T]: T[K] extends readonly [infer A, ...unknown[]]
    ? A extends WritableAtom<unknown, infer Args, unknown>
      ? readonly [A, ...Args]
      : T[K]
    : never;
};

export type HydrateAtomOptions = {
  store?: Store | undefined;
  enableReHydrate?: boolean | undefined;
};
