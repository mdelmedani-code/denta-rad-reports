import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 2 * 60 * 1000; // 2 minutes warning

export function useSessionTimeout() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [warningId, setWarningId] = useState<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutId) clearTimeout(timeoutId);
    if (warningId) clearTimeout(warningId);
    setShowWarning(false);

    // Set warning timer (28 minutes)
    const newWarningId = setTimeout(() => {
      setShowWarning(true);
      toast({
        title: 'Session Expiring Soon',
        description: 'Your session will expire in 2 minutes due to inactivity. Move your mouse or click to stay logged in.',
        duration: 120000, // 2 minutes
      });
    }, TIMEOUT_DURATION - WARNING_BEFORE);

    // Set logout timer (30 minutes)
    const newTimeoutId = setTimeout(async () => {
      toast({
        title: 'Session Expired',
        description: 'You have been logged out due to inactivity',
        variant: 'destructive',
      });
      await signOut();
    }, TIMEOUT_DURATION);

    setWarningId(newWarningId);
    setTimeoutId(newTimeoutId);
  }, [signOut, toast, timeoutId, warningId]);

  useEffect(() => {
    // Activity events that reset the timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Initial timer
    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (warningId) clearTimeout(warningId);
    };
  }, [resetTimer]);

  return { showWarning };
}
