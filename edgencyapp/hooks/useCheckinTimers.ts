import { useRef, useCallback, useEffect } from "react";
import * as Haptics from 'expo-haptics';
import { Vibration } from "react-native";
import type { Message } from "@/components/chat";
import { makeId } from "@/utils/chatUtils";

interface CheckinTimersOptions {
  appendMsg: (msg: Message) => void;
}

export function useCheckinTimers({ appendMsg }: CheckinTimersOptions) {
  const lastUserActivityRef = useRef<number>(Date.now());
  const checkinTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCheckinTimers = useCallback(() => {
    if (checkinTimerRef.current) { clearTimeout(checkinTimerRef.current); checkinTimerRef.current = null; }
    if (alertTimerRef.current)   { clearTimeout(alertTimerRef.current);   alertTimerRef.current   = null; }
  }, []);

  const triggerPhysicalAlert = useCallback(async () => {
    // SOS morse vibration pattern then haptic reinforcement
    Vibration.vibrate(
      [100,100,100,100,100,100,300,100,300,100,300,100,100,100,100,100,100],
      false
    );
    for (let i = 0; i < 5; i++) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (i < 4) await new Promise(r => setTimeout(r, 200));
    }
    appendMsg({
      id: makeId(),
      sender: 'ai',
      text: '⚠️ I haven\'t heard from you. Your device is alerting nearby people. Call 112 immediately if you are able.',
    });
  }, [appendMsg]);

  // Called by the schedule_checkin tool handler; wires up the foreground timer
  const handleCheckinScheduled = useCallback((delaySecs: number, message: string) => {
    clearCheckinTimers();
    checkinTimerRef.current = setTimeout(() => {
      // Only fire if user hasn't been active in the meantime
      const idleSecs = (Date.now() - lastUserActivityRef.current) / 1000;
      if (idleSecs < delaySecs - 10) return;

      appendMsg({ id: makeId(), sender: 'ai', text: message });

      // Give the user 90 more seconds before physically alerting
      alertTimerRef.current = setTimeout(() => {
        triggerPhysicalAlert();
      }, 90_000);
    }, delaySecs * 1000);
  }, [clearCheckinTimers, triggerPhysicalAlert, appendMsg]);

  useEffect(() => () => clearCheckinTimers(), [clearCheckinTimers]);

  return { lastUserActivityRef, clearCheckinTimers, handleCheckinScheduled };
}
