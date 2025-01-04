# jotai-ssr

**jotai-ssr** is a utility library for [Jotai](https://jotai.org/) to facilitate server-side rendering (SSR). It provides helpers for:

- **Hydrating** atom values from server to client (and optionally re-hydrating).
- Handling SSR scenarios, including **React Server Components** and soft navigations in frameworks like Next.js, Remix, and Waku.

This library extends or wraps the existing Jotai SSR utilities to provide a more seamless integration with modern SSR setups.

---

## Table of Contents

1. [Installation](#installation)  
2. [Creating a Safe Store for Each Request](#creating-a-safe-store-for-each-request)
3. [Hydration](#hydration)  
   1. [What is Hydration?](#what-is-hydration)  
   2. [How to Hydrate an Atom](#how-to-hydrate-an-atom)  
   3. [`HydrationBoundary`](#hydrationboundary)  
4. [Streaming Hydration with Async Atoms](#streaming-hydration-with-async-atoms)
5. [Important Notes on Hydration Logic](#important-notes-on-hydration-logic)  
6. [Soft Navigation in SSR Frameworks](#soft-navigation-in-ssr-frameworks)  
7. [Re-Hydration](#re-hydration)  

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

To create an isolated store per request, you should use `Provider` for each layout or page that uses Jotai like so:

```tsx
import { Provider } from 'jotai';

const Page = () => {
  return (
    <Provider>{/* Your content */}</Provider>
  );
};
```

If you need to pass a custom store to the `Provider`, you can do so in one of the following ways:

1. **Using useState**

   ```tsx
   'use client';

   import { createStore, Provider } from 'jotai';
   import { useState } from 'react';

   const Page = () => {
     const [store] = useState(() => createStore());
     return <Provider store={store}>{/* your content */}</Provider>;
   };
   ```

2. **Using useRef**

   ```tsx
   'use client';

   import { createStore, Provider } from 'jotai';
   import { useRef } from 'react';

   const Page = () => {
     const storeRef = useRef(undefined);
     if (!storeRef.current) {
       storeRef.current = createStore();
     }
     return <Provider store={storeRef.current}>{/* your content */}</Provider>;
   };
   ```

Both approaches ensure a new store instance is created for each request, preventing data from leaking between different users.

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

## Streaming Hydration with Async Atoms

Some SSR frameworks (like Next.js) support **streaming responses** so that part of your UI can render before all data is loaded. With Jotai, you can stream data from the server into **async atoms**. This allows your components to start rendering in a suspended state, then reveal when the data arrives. Here’s how you can do it with **jotai-ssr**:

### Defining an Async Atom

First, define an atom that holds a promise:

```tsx
'use client';

import { atom, useAtomValue } from 'jotai';

// Define an async atom that resolves to a number.
export const countAtom = atom<Promise<number>>();

export const CountComponent = () => {
  // Jotai will automatically suspend here until the promise resolves
  const count = useAtomValue(countAtom);
  return <div>{count}</div>;
};
```

> **Note**: Because this is an async atom, **any** component reading it will suspend by default, so you must wrap it with `<Suspense>`.

### Streaming Hydration in the Server/Edge Environment

Next, in your server-side or edge code, you can fetch the data and hydrate the async atom with a **promise**:

```tsx
import { HydrationBoundary } from 'jotai-ssr';
import { Suspense } from 'react';
import { countAtom, CountComponent } from './client';

export const StreamingHydration = () => {
  // Suppose this fetchCount function returns a Promise<number>
  const countPromise = fetchCount();

  return (
    <HydrationBoundary hydrateAtoms={[[countAtom, countPromise]]}>
      <Suspense fallback={<div>loading...</div>}>
        <CountComponent />
      </Suspense>
    </HydrationBoundary>
  );
};
```

1. **Fetch or stream data** (e.g., `fetchCount()`) on the server.  
2. **Hydrate** the async atom by passing `[countAtom, countPromise]` to `HydrationBoundary`.  
3. **Wrap** your async-consuming components (`<CountComponent />`) with a `<Suspense>` boundary to handle the loading state.

This setup ensures that:

- The async atom suspends until the promise resolves.  
- The hydrated value is set **immediately** in the store, allowing the client to continue with the same promise.  
- React’s Suspense boundary displays a fallback (`loading...`) until the atom’s promise settles.

This pattern allows you to combine the power of **async atoms** with server-side streaming, letting Jotai manage data states in a way that feels natural within React’s **Suspense** model.

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
