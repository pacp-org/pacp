import { useCallback, useEffect, useState } from 'react';

export function useUrlState() {
  const [productId, setProductIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('product');
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (productId) params.set('product', productId);
    else params.delete('product');
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  }, [productId]);

  const setProductId = useCallback((id: string | null) => {
    setProductIdState(id);
  }, []);

  return { productId, setProductId };
}
