# jotai-ssr

**jotai-ssr** is a utility library for [Jotai](https://jotai.org/) to facilitate server-side rendering (SSR). It provides helpers for:

- Creating an **isolated store per request** (to avoid data leak between users).
- **Hydrating** atom values from server to client (and optionally re-hydrating).
- Handling SSR scenarios, including **React Server Components** and soft navigations in frameworks like Next.js, Remix, and Waku.

This library extends or wraps the existing Jotai SSR utilities to provide a more seamless integration with modern SSR setups.

---

## Table of Contents

1. [Installation](#installation)  
2. [Creating a Safe Store for Each Request](#creating-a-safe-store-for-each-request)  
   1. [`useCreateStore`](#usecreatestore)  
   2. [`SSRProvider`](#ssrprovider)  
3. [Hydration](#hydration)  
   1. [What is Hydration?](#what-is-hydration)  
   2. [How to Hydrate an Atom](#how-to-hydrate-an-atom)  
   3. [`HydrationBoundary`](#hydrationboundary)  
   4. [Important Notes on Hydration Logic](#important-notes-on-hydration-logic)  
4. [Soft Navigation in SSR Frameworks](#soft-navigation-in-ssr-frameworks)  
5. [Re-Hydration](#re-hydration)  

---

## Installation

```bash
npm install jotai-ssr
# or
yarn add jotai-ssr
# or
pnpm add jotai-ssr
```

---

## Creating a Safe Store for Each Request

When using Jotai in an SSR environment, **you must ensure each request has its own store**. Relying on a shared, global store (e.g. `defaultStore`) across requests can lead to data leakage between different users.

### Using the `useCreateStore` Hook

If you create a store manually, you typically do it like this in a Client Component:

```tsx
'use client';
import { createStore, Provider } from 'jotai';
import { useState } from 'react';

const Page = () => {
  // Ensure a new store is created per request
  const [store] = useState(() => createStore());
  return <Provider store={store}>{/* your content */}</Provider>;
};
```

**jotai-ssr** offers a convenient `useCreateStore` hook to simplify this pattern:

```tsx
'use client';
import { Provider } from 'jotai';
import { useCreateStore } from 'jotai-ssr';

const Page = () => {
  const store = useCreateStore();
  return <Provider store={store}>{/* your content */}</Provider>;
};
```

> **Note:** `useCreateStore` internally uses `useState`, so the component that calls `useCreateStore` must be a React Client Component (i.e., have the `'use client'` directive if you're in an RSC setup).

### Using the `SSRProvider`

Alternatively, you can use the higher-level `SSRProvider` component from **jotai-ssr**. It can be used in either a React Client Component or a React Server Component:

```tsx
import { SSRProvider } from 'jotai-ssr';

const Page = () => {
  return <SSRProvider>{/* your content */}</SSRProvider>;
};
```

Internally, `SSRProvider` will create an isolated store for each request. You can also supply your own store:

```tsx
'use client';
import { SSRProvider, useCreateStore } from 'jotai-ssr';

const Page = () => {
  const store = useCreateStore();
  return (
    <SSRProvider store={store}>
      {/* your content */}
    </SSRProvider>
  );
};
```

---

## Hydration

When data is fetched on the server and passed to the client, you may want to initialize Jotai atoms with those server-side values. This process is called **hydration**.

### What is Hydration?

Hydration sets up atoms with initial values so that:

- The server-rendered HTML uses the correct initial state.
- Once the client side finishes React hydration, the atom is already in the correct state without causing extra re-renders.

### How to Hydrate an Atom

When dealing with SSR, you often have data fetched on the server that needs to be passed to your components and stored in Jotai atoms. To accomplish this, **jotai-ssr** provides a `useHydrateAtoms` hook similar to the one in Jotai’s [`jotai/utils`](https://jotai.org/docs/utilities/ssr#usage), with a few small differences:

1. **No** `dangerouslyForceHydrate` **option**  
2. Exported from **`jotai-ssr`** rather than `jotai/utils`  

Apart from these differences, the usage is nearly the same as the official Jotai version. This means you can hydrate your atoms with data like so:

```tsx
'use client'; // If you're using React Server Components (RSC), ensure the file is a Client Component

import { atom, useAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai-ssr';

// Example atom
export const countAtom = atom(0);

interface PageProps {
  countFromServer: number;
}

export function Page({ countFromServer }: PageProps) {
  // 1. Hydrate the atom with a value fetched on the server
  useHydrateAtoms([[countAtom, countFromServer]]);
  
  // 2. Now you can safely use the atom in your component
  const [count] = useAtom(countAtom);

  return <div>Count: {count}</div>;
}
```

Here’s what you need to know:

1. **Client-Side Usage**:  
   Despite the term “SSR” in its name, `useHydrateAtoms` must be called in client code (i.e., a component with `'use client'` at the top if you’re using React Server Components).

2. **Optional `store` Parameter**:  
   Just like the Jotai version, you can target a specific store by providing the `store` option. For example:
   ```tsx
   import { createStore } from 'jotai';

   const myStore = createStore();
   useHydrateAtoms([[countAtom, 42]], { store: myStore });
   ```

3. **No `dangerouslyForceHydrate`**:  
   Unlike the original Jotai hook, the **jotai-ssr** version does **not** provide a `dangerouslyForceHydrate` option. If you need more advanced re-hydration behavior, see [Re-Hydration](#re-hydration).

> **Tip:** Hydrating an atom **does not** cause additional re-renders if you do it **before** using the atom in your component. Make sure to call `useHydrateAtoms` at the top level of your component (or inside its parent) so that the initial render already has the right atom values.

### `HydrationBoundary`

For React Server Components (RSC) and for a clearer boundary-based approach, **jotai-ssr** provides a `HydrationBoundary` component:

```tsx
import { HydrationBoundary } from 'jotai-ssr';
import { countAtom } from './atoms'; // "use client" inside this file

const ServerComponent = async () => {
  const countFromServer = await fetchCount();
  return (
    <HydrationBoundary hydrateAtoms={[[countAtom, countFromServer]]}>
      {/* Components that consume countAtom */}
    </HydrationBoundary>
  );
};
```

You can pass an optional `options` prop, such as `{ store: myStore }`, if you want to hydrate into a specific store.

> **Note**: `HydrationBoundary` can be used in both Client and Server Components. However, when using it in a Server Component, the atom definitions must be marked with `'use client'`. Also, any value you pass for hydration **must be serializable**. This is because `HydrationBoundary` itself is a React Client Component.

---

## Important Notes on Hydration Logic

### 1. Hydrate Before Using the Atom

Hydration sets atom **initial values**. Thus, you should not use the atom in a component **before** calling `useHydrateAtoms`. Instead, do something like this:

**Correct usage**:
```tsx
const Component = ({ countFromServer }) => {
  useHydrateAtoms([[countAtom, countFromServer]]);
  const [count] = useAtom(countAtom);
  return <div>{count}</div>;
};
```
or
```tsx
const Component = async ({ countFromServer }) => {
  return (
    <HydrationBoundary hydrateAtoms={[[countAtom, countFromServer]]}>
      <CountComponent />
    </HydrationBoundary>
  );
};
```

**Incorrect usage** (atom used before hydration):
```tsx
// Don't do this
const Component = ({ countFromServer }) => {
  const [count] = useAtom(countAtom);
  useHydrateAtoms([[countAtom, countFromServer]]);
  return <div>{count}</div>;
};
```
or
```tsx
// Don't do this
const Component = async ({ countFromServer }) => {
  const [count] = useAtom(countAtom);
  return (
    <HydrationBoundary hydrateAtoms={[[countAtom, countFromServer]]}>
      <div>{count}</div>
    </HydrationBoundary>
  );
};
```

### 2. Do Not Hydrate the Same Atom in Multiple Places Within the Same Provider

A single Jotai `Provider` shares atom states across its entire tree. Hydrating the same atom in multiple child components can lead to unexpected re-renders. Instead, hydrate each atom once. If you really need separate hydration for the same atom, place them in **different** providers or use [jotai-scope](https://jotai.org/docs/extensions/scope#jotai-scope) to scope them.

### 3. Hydration Only Occurs on Initial Mount

Hydration sets the atom value **only** on the first render (just like a `useState` initial value in React). Subsequent props changes do **not** cause re-hydration. If a component unmounts and remounts, it will re-hydrate at that time.

---

## Soft Navigation in SSR Frameworks

In frameworks like **Next.js**, **Remix**, and **Waku**, soft navigation means some part of your layout or component tree does **not** unmount between page transitions. For instance:

- **Next.js App Router**: `layout.jsx` might persist across routes.
- **Remix**: `root.jsx` can persist across routes.
- **Waku**: `layout.jsx` can persist across pages.

> **Note**: A similar example is when the path includes a slug, and navigation occurs between pages with different slugs. In such cases, particularly in Remix and Waku, the page component itself tends to persist.

When using soft navigation:

- If your Jotai `Provider` is in a **layout** that persists, its store does **not** get recreated on page transitions. Data from previous pages is carried over.
- If your Jotai `Provider` is placed in a **page** component, it will be recreated on each navigation, effectively isolating state per page.

Therefore, be mindful where you place the `Provider` or the hydration logic. If a persistent layout hydrates the same atom across different routes, you could trigger unwanted re-renders on route changes. Generally, **avoid hydrating atoms in a page** if the `Provider` is in a layout that persists.

---

## Re-Hydration

By default, **hydration happens only once**: on the initial mount. Even if you pass new values to `useHydrateAtoms` or `HydrationBoundary` after that, the atom values remain as they were set the first time.

However, if you need to **re-hydrate** (e.g., to sync with the latest server data after a route refresh), you can enable re-hydration:

- With `useHydrateAtoms`:

  ```tsx
  import { useHydrateAtoms } from 'jotai-ssr';

  const Component = ({ countFromServer }) => {
    useHydrateAtoms([[countAtom, countFromServer]], { enableReHydrate: true });
    const [count] = useAtom(countAtom);
    return <div>{count}</div>;
  };
  ```

- With `HydrationBoundary`:

  ```tsx
  const ServerComponent = async () => {
    const countFromServer = await fetchCount();
    return (
      <HydrationBoundary
        hydrateAtoms={[[countAtom, countFromServer]]}
        options={{ enableReHydrate: true }}
      >
        <CountComponent />
      </HydrationBoundary>
    );
  };
  ```

When `enableReHydrate` is `true`, the component compares the new hydration values (via `Object.is`) and re-hydrates if they differ.

### Route Refresh Considerations

In Next.js App Router, calling `router.refresh()` or `revalidatePath()` triggers server code to re-fetch data, but the same client component instance persists. Normally, `useState` or Jotai hydration wouldn’t reset values. By turning on re-hydration, you can ensure your atoms get updated with the newest fetched data.

The same principle applies in Remix or Waku if the layout is partially reused during a slug-based soft navigation.

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

---

## Feedback
This is a new package and we would love to hear your feedback.
Related discussion: https://github.com/pmndrs/jotai/discussions/2692

---
