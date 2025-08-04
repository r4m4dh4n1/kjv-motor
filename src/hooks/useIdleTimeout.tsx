import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimeoutProps {
  timeout: number; // in milliseconds
  onTimeout: () => void;
  enabled?: boolean;
}

export const useIdleTimeout = ({ timeout, onTimeout, enabled = true }: UseIdleTimeoutProps) => {
  const timeoutRef = useRef<number>();
  const callbackRef = useRef(onTimeout);
  const isTabActiveRef = useRef(true);
  const tabInactiveStartRef = useRef<number | null>(null);

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

    const resetTimer = () => {
      // Only reset timer if tab is active
      if (isTabActiveRef.current) {
        resetTimeout();
      }
    };

    // Handle tab/window visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became inactive - record the time
        isTabActiveRef.current = false;
        tabInactiveStartRef.current = Date.now();
        clearIdleTimeout(); // Stop the current timer
      } else {
        // Tab became active again
        isTabActiveRef.current = true;
        
        if (tabInactiveStartRef.current) {
          const inactiveTime = Date.now() - tabInactiveStartRef.current;
          
          // If inactive time exceeds timeout, logout immediately
          if (inactiveTime >= timeout) {
            callbackRef.current();
            return;
          }
        }
        
        // Reset timer when tab becomes active again
        resetTimeout();
        tabInactiveStartRef.current = null;
      }
    };

    // Handle window focus/blur events (fallback for older browsers)
    const handleWindowFocus = () => {
      if (!document.hidden) {
        handleVisibilityChange();
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden) {
        isTabActiveRef.current = false;
        tabInactiveStartRef.current = Date.now();
        clearIdleTimeout();
      }
    };

    // Start the timer
    resetTimeout();

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Add event listeners for tab/window visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      // Cleanup
      clearIdleTimeout();
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [resetTimeout, clearIdleTimeout, enabled, timeout]);

  return { resetTimeout, clearIdleTimeout };
};