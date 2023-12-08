import type { Metaplex } from '@metaplex-foundation/js';
import { createContext, useContext } from 'react';

interface MetaplexContext {
  metaplex: Metaplex | null;
}

const DEFAULT_CONTEXT: MetaplexContext = {
  metaplex: null
};

export const MetaplexContext = createContext(DEFAULT_CONTEXT);

export function useMetaplex() {
  const { metaplex } = useContext(MetaplexContext);
  if (!metaplex) {
    throw new Error(
      'Metaplex context was not initialized. ' +
        'Did you forget to wrap your app with <MetaplexProvider />?'
    );
  }
  return metaplex;
}
