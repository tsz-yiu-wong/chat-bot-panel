import { useState, useEffect } from 'react';

/**
 * A custom hook that returns `true` once the component has mounted on the client.
 * This is useful for preventing hydration mismatches when rendering client-only UI.
 *
 * @returns {boolean} `true` if the component is mounted, otherwise `false`.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
