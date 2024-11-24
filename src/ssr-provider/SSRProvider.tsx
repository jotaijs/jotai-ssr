'use client';

import { Provider } from 'jotai';
import type { PropsWithChildren } from 'react';
import { useCreateStore } from './use-create-store.js';
import type { Store } from '../shared.js';

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
