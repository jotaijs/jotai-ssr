import { createStore } from 'jotai';
import { useState } from 'react';

export const useCreateStore = () => {
  const [store] = useState(() => createStore());
  return store;
};
