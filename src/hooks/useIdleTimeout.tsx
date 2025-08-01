import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeoutProps {
  timeout: number; // in milliseconds
  onTimeout: () => void;
  enabled?: boolean;
}

export const useIdleTimeout = ({ timeout, onTimeout, enabled = true }: UseIdleTimeoutProps) => {
  const timeoutRef = useRef<number>();
  const callbackRef = useRef(onTimeout);

  // Update callback ref when onTimeout changes
  useEffect(() => {
    callbackRef.current = onTimeout;
  }, [onTimeout]);

  const resetTimeout = useCallback(() => {
    if (!enabled) return;
    
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      callbackRef.current();
    }, timeout);
  }, [timeout, enabled]);

  const clearIdleTimeout = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearIdleTimeout();
      return;
    }

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const resetTimer = () => resetTimeout();

    // Start the timer
    resetTimeout();

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    return () => {
      // Cleanup
      clearIdleTimeout();
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [resetTimeout, clearIdleTimeout, enabled]);

  return { resetTimeout, clearIdleTimeout };
};