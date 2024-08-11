'use client';

import { createStore, Provider } from 'jotai';
import { type ReactNode, useEffect, useState } from 'react';

export function RenderingBoundary({
  children,
  performanceImpactingUseUpperStore,
}: {
  children?: ReactNode;
  performanceImpactingUseUpperStore?: boolean;
}) {
  const [isRefUpperStore, setIsRefUpperStore] = useState(false);
  const [firstRenderStore] = useState(() => createStore());

  useEffect(() => {
    if (performanceImpactingUseUpperStore && !isRefUpperStore) {
      setIsRefUpperStore(true);
    }
  }, [isRefUpperStore, performanceImpactingUseUpperStore]);

  if (isRefUpperStore) {
    return <>{children}</>;
  }

  return <Provider store={firstRenderStore}>{children}</Provider>;
}
