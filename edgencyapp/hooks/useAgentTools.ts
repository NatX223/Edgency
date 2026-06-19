import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as SMS from 'expo-sms';
import { useMemo } from 'react';
import { Vibration } from 'react-native';
import { z } from 'zod';
import type { UserRecord } from './useDatabase';

interface AgentToolDeps {
  getUser: () => Promise<UserRecord | null>;
  onCheckinScheduled: (delaySecs: number, message: string) => void;
}

export function useAgentTools({ getUser, onCheckinScheduled }: AgentToolDeps) {
  return useMemo(() => {
    // ── Tool 1: Send emergency report via SMS ─────────────────────────────────
    const sendEmergencyReport = {
      name: 'send_emergency_report',
      description:
        "Compile the user's medical profile and current GPS location into an emergency SMS and open the device SMS composer pre-filled, ready to send to emergency services (112) or their personal emergency contact. " +
        "Call this WITHOUT waiting to be asked when the user is trapped, bleeding severely, unconscious, or in any life-threatening condition where external rescue is needed.",
      parameters: z.object({
        condition: z
          .string()
          .describe(
            "Brief factual description of the user's current condition, " +
            "e.g. 'trapped under collapsed wall with suspected head injury and active bleeding'"
          ),
        recipient: z
          .enum(['emergency_services', 'emergency_contact'])
          .describe(
            "'emergency_services' targets 112; " +
            "'emergency_contact' targets the contact saved in the user's profile"
          ),
      }),
      handler: async (args: Record<string, unknown>) => {
        const condition = args.condition as string;
        const recipient = args.recipient as 'emergency_services' | 'emergency_contact';
        try {
          const user = await getUser();

          let locationLine = 'Location unavailable';
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              const { latitude, longitude } = pos.coords;
              locationLine = `https://maps.google.com/?q=${latitude},${longitude}`;
            }
          } catch (_) {}

          const lines: string[] = ['🚨 EMERGENCY ALERT 🚨'];
          if (user?.full_name) lines.push(`Person: ${user.full_name}`);
          lines.push(`Condition: ${condition}`);
          lines.push(`Location: ${locationLine}`);
          if (user?.medical_history?.trim())
            lines.push(`Medical history: ${user.medical_history}`);
          if (user?.health_conditions?.trim())
            lines.push(`Known conditions: ${user.health_conditions}`);
          if (user?.disabilities?.trim())
            lines.push(`Disabilities: ${user.disabilities}`);
          lines.push('— Sent via Edgency Emergency App');

          const message = lines.join('\n');
          const isAvailable = await SMS.isAvailableAsync();
          if (!isAvailable) return { error: 'SMS not available on this device.' };

          const address =
            recipient === 'emergency_contact' && user?.emergency_contact
              ? user.emergency_contact
              : '112';

          // Return a pending payload — the UI will show a card with a send button
          return { pending: true, address, message };
        } catch (e: any) {
          return { error: `Could not send report: ${e?.message ?? String(e)}` };
        }
      },
    };

    // ── Tool 2: Schedule a check-in ───────────────────────────────────────────
    const scheduleCheckin = {
      name: 'schedule_checkin',
      description:
        "Schedule an automatic follow-up to check if the user is still conscious and able to respond. " +
        "Fires a device push notification (works even when the app is in the background or closed) AND " +
        "an in-app message after the given delay. " +
        "If the user does not respond to the check-in, the device will automatically vibrate to alert them. " +
        "Call this after EVERY critical or serious response.",
      parameters: z.object({
        delay_seconds: z
          .number()
          .int()
          .min(30)
          .max(600)
          .describe(
            'Seconds to wait before checking in. Use 60–120 for active emergencies, 180–300 for stable-but-monitored situations.'
          ),
        message: z
          .string()
          .describe(
            "The check-in message to show the user, e.g. 'Still with me? Tap here or type anything to let me know you're okay.'"
          ),
      }),
      handler: async (args: Record<string, unknown>) => {
        const delay_seconds = args.delay_seconds as number;
        const message = args.message as string;
        try {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === 'granted') {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '⚠️ Edgency – Are you okay?',
                body: message,
                sound: true,
                data: { type: 'checkin' },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: delay_seconds,
                repeats: false,
              },
            });
          }
          onCheckinScheduled(delay_seconds, message);
          return { success: true, checking_in_after_seconds: delay_seconds };
        } catch (e: any) {
          return { error: `Could not schedule check-in: ${e?.message ?? String(e)}` };
        }
      },
    };

    // ── Tool 3: Alert the user physically ────────────────────────────────────
    const alertUser = {
      name: 'alert_user',
      description:
        "Immediately vibrate the device to physically alert the user when they have not responded to messages. " +
        "Use 'moderate' when the scheduled check-in message went unanswered for a short while; " +
        "use 'urgent' when you suspect the user may be unconscious or in imminent danger.",
      parameters: z.object({
        intensity: z
          .enum(['moderate', 'urgent'])
          .describe(
            "'moderate' = 3 spaced heavy pulses; " +
            "'urgent' = SOS vibration pattern (···---···) plus 5 rapid haptic strikes"
          ),
      }),
      handler: async (args: Record<string, unknown>) => {
        const intensity = args.intensity as 'moderate' | 'urgent';
        try {
          if (intensity === 'urgent') {
            Vibration.vibrate(
              [100, 100, 100, 100, 100, 100, 300, 100, 300, 100, 300, 100, 100, 100, 100, 100, 100],
              false
            );
            for (let i = 0; i < 5; i++) {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              if (i < 4) await new Promise(r => setTimeout(r, 200));
            }
          } else {
            Vibration.vibrate([200, 300, 200, 300, 200], false);
            for (let i = 0; i < 3; i++) {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              if (i < 2) await new Promise(r => setTimeout(r, 400));
            }
          }
          return { success: true };
        } catch (e: any) {
          return { error: `Alert failed: ${e?.message ?? String(e)}` };
        }
      },
    };

    return [sendEmergencyReport, scheduleCheckin, alertUser];
  }, [getUser, onCheckinScheduled]);
}
