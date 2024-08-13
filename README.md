# jotai-ssr
Jotai utilities for server-side rendering (SSR)

## Motivation
This package provides a new SSR utility designed to replace [`useHydrateAtoms`](https://jotai.org/docs/utilities/ssr), offering a safer and more flexible way to use Jotai in SSR environments.

This package provides comprehensive support for React Server Components, particularly with the Next.js App Router, addressing several limitations and issues that arise when using Jotai in server-side rendering contexts.

## Feedback
This is a new package and we would love to hear your feedback.
Related discussion: https://github.com/pmndrs/jotai/discussions/2692

## Overview
This package provides 3 boundary components and 1 atom for server-side rendering with Jotai:

- `RenderingBoundary` - A boundary component that should be used at the root of components that will be rendered on the server during navigation, such as Next.js's `page.tsx`, `layout.tsx`, etc.
- `SuspenseBoundary` - A boundary component that should be used at the root of async components wrapped with `React.Suspense`, but only when the component subtree references atoms that have the potential to change while suspended.
- `HydrationBoundary` - A boundary component for hydrating atoms (synchronizing the server-rendered HTML with the client state) on the client side.
- `isHydratingAtom` - An atom that can be used to check if atom hydration is in progress.

## Installation
```bash
npm install jotai-ssr
# or
yarn add jotai-ssr
# or
pnpm add jotai-ssr
```

## Usage
This is a Next.js App Router example:

### Define Rendering Boundary
Wrap the components that will be rendered on the server during navigation with `RenderingBoundary`. 

layout.tsx:
```jsx
import { RenderingBoundary } from 'jotai-ssr'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <RenderingBoundary>
          <LayoutComponent>
            {children}
          </LayoutComponent>
        </RenderingBoundary>
      </body>
    </html>
  )
}
```

page.tsx:
```jsx
import { RenderingBoundary } from 'jotai-ssr'

export default function Page() {
  return (
    <RenderingBoundary>
      <Component />
    </RenderingBoundary>
  )
}
```

> Note: `RenderingBoundary` is used in both React Server Components and React Client Components. `RenderingBoundary` itself is a React Client Component.

`RenderingBoundary` creates a new store for subtree that is isolated from the parent store. For example, above `LayoutComponent` and `Component` will have their own store. In other words, the store is not shared between `layout.tsx` and `page.tsx`.

The store also independent for each request: the store will never be shared between requests.

#### Sharing Stores between layout and page (Advanced Usage)
If you need to share stores between `layout.tsx` and `page.tsx`, you can use the `performanceImpactingUseUpperStore` option in `RenderingBoundary`, which will cause an additional re-render after initial hydration.

#### Why do we need `RenderingBoundary`?
In Next.js, when navigating pages using the `Link` component, `layout.jsx` is not re-rendered, but `page.jsx` is. Because of this structure, if `page.jsx` references a Store that is in `layout.jsx` or is global, there's a possibility of errors occurring during page transitions due to mismatches between server-side rendered HTML and hydration.
Think following case:
1. Create const sampleAtom = atom(0)
2. Set up a Provider in `layout.jsx`, or render without setting up a Provider anywhere
3. Change sampleAtom to 1 in page.jsx
4. Navigate to another page using `Link` component

In this case, the value of sampleAtom on server-side rendered HTML will be 0, but the value of sampleAtom on the client side will be 1. This will cause a mismatch between server-side rendered HTML and hydration, resulting in an error. To prevent this, use `RenderingBoundary` to create a new store for each page.

#### How `performanceImpactingUseUpperStore` option works
Even if `performanceImpactingUseUpperStore` is set to `true`, `RenderingBoundary` will still create a new store for each request. However, after hydration, it will re-render the subtree once to use the store of the parent component. Because of this re-render, it may impact performance.

### Using SuspenseBoundary
**Only when the async component wrapped by `React.Suspense` subtree references atoms that have the potential to change while suspended**, use `SuspenseBoundary`. If there are no atoms that have the potential to change while suspended, you don't need to use `SuspenseBoundary`.

```jsx
import { Suspense } from 'react'
import { SuspenseBoundary } from 'jotai-ssr'

function Component() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuspenseBoundary>
        <AsyncComponent />
      </SuspenseBoundary>
    </Suspense>
  )
}
```
> Note: `SuspenseBoundary` itself is React Server Component.

#### Why do we need `SuspenseBoundary`?
When using `React.Suspense`, if the component subtree references atoms that have the potential to change while suspended, there is a possibility of errors occurring during page transitions due to mismatches between server-side rendered HTML and hydration. To prevent this, use `SuspenseBoundary` to create a new store for the suspended subtree.

### Hydrating Atoms
Use `HydrationBoundary` to hydrate atoms at specific points in your component tree. `hydrateAtoms` props is an array of atom and values to hydrate.

With React Server Components:
```jsx
import { HydrationBoundary } from 'jotai-ssr'
import { dataAtom } from './atoms'

async function Component() {
  const data = await fetch('https://api.example.com/data').then((res) => res.json())
  return (
    <HydrationBoundary hydrateAtoms={[[dataAtom, data]]}>
      <ChildComponent />
    </HydrationBoundary>
  )
}
```
> Note: if you use `HydrationBoundary` in React Server Components, the file that defines a hydrated atom must include the `'use client'` directive, like this:
> ```jsx
> 'use client'
> 
> import { atom } from 'jotai';
> 
> export const someAtom = atom(0);
> ```

With React Client Components:
```jsx
'use client'

import { HydrationBoundary } from 'jotai-ssr'
import { idAtom } from './atoms'

function Component({ id }) {
  return (
    <HydrationBoundary hydrateAtoms={[[idAtom, id]]}>
      <ChildComponent />
    </HydrationBoundary>
  )
}
```

You should use hydrated atoms within the `HydrationBoundary` component. If you use hydrated atoms outside of the `HydrationBoundary` component, it may cause mismatches between server-side rendered HTML and hydration.

You can use multiple `HydrationBoundary` components.
```jsx
import { HydrationBoundary } from 'jotai-ssr'
import { dataA, dataB } from './atoms'

async function HydrationDataABoundary() {
  const dataA = await fetch('https://api.example.com/dataA').then((res) => res.json())
  return (
    <HydrationBoundary hydrateAtoms={[[dataA, dataA]]}>
      <ChildComponent />
    </HydrationBoundary>
  )
}

async function HydrationDataBBoundary() {
  const dataB = await fetch('https://api.example.com/dataB').then((res) => res.json())
  return (
    <HydrationBoundary hydrateAtoms={[[dataB, dataB]]}>
      <ChildComponent />
    </HydrationBoundary>
  )
}

function Component() {
  return (
    <div>
      <HydrationDataABoundary>
        <HydrationDataBBoundary>
          <ChildComponent />
        </HydrationDataBBoundary>
      </HydrationDataABoundary>
    </div>
  )
}
```

#### Checking Hydration Status
You can use the `isHydratingAtom` to check if atom hydration is in progress:

```js
import { atom } from 'jotai'
import { isHydratingAtom } from 'jotai-ssr'

function Component() {
  const samplePrimitiveAtom = atom(0)

  const sampleAtom = atom(
    (get) => get(samplePrimitiveAtom),
    (get, set, update) => {
      set(samplePrimitiveAtom, update)
      if (get(isHydratingAtom)) {
        // Do something when atom is hydrating
      } else {
        // Do something when atom is not hydrating
      }
    }
  )
}
```
