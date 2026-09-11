import { useCallback, useRef, useState } from 'react';

export function useToast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setMessage(text);
    setVisible(true);
    timer.current = window.setTimeout(() => setVisible(false), 2600);
  }, []);

  return { message, visible, show };
}
