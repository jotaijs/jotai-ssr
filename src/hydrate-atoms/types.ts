import type { WritableAtom } from 'jotai';

export type AnyWritableAtom = WritableAtom<unknown, never[], unknown>;

export type InferAtomTuples<T> = {
  [K in keyof T]: T[K] extends readonly [infer A, ...unknown[]]
    ? A extends WritableAtom<unknown, infer Args, unknown>
      ? readonly [A, ...Args]
      : T[K]
    : never;
};
