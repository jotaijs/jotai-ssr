'use client';

import { Provider, type createStore } from 'jotai';
import type { PropsWithChildren } from 'react';
import { useCreateStore } from './use-create-store.js';

type Store = ReturnType<typeof createStore>;

function SSRProviderWithGivenStore({
  store,
  children,
}: PropsWithChildren<{ store: Store }>) {
  return <Provider store={store}>{children}</Provider>;
}

function SSRProviderWithNewStore({ children }: PropsWithChildren) {
  const store = useCreateStore();
  return <Provider store={store}>{children}</Provider>;
}

export function SSRProvider({
  store,
  children,
}: PropsWithChildren<{ store?: Store }>) {
  if (store) {
    return (
      <SSRProviderWithGivenStore store={store}>
        {children}
      </SSRProviderWithGivenStore>
    );
  } else {
    return <SSRProviderWithNewStore>{children}</SSRProviderWithNewStore>;
  }
}
