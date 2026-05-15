import { useEffect, useState } from 'react';

export default function useAutoClearMessage(initialValue = '', delay = 3000) {
  const [message, setMessage] = useState(initialValue);

  useEffect(() => {
    if (!message) return undefined;

    const timeoutId = window.setTimeout(() => {
      setMessage('');
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [delay, message]);

  return [message, setMessage];
}
