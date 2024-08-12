import { type ReactNode } from 'react';
import { RenderingBoundary } from './RenderingBoundary.js';

export function SuspenseBoundary({ children }: { children?: ReactNode }) {
  return (
    <RenderingBoundary performanceImpactingUseUpperStore>
      {children}
    </RenderingBoundary>
  );
}
