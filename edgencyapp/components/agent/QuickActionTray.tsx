import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Share, Linking, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Spacing, Radii, Typography } from '@/constants/tokens';
import type { IncidentType } from '@/components/home/IncidentCard';

interface QuickAction {
  label: string;
  icon: string;
  action: 'call_emergency' | 'share_location' | 'sos_flash' | 'call_contact' | 'find_aed' | 'evacuation';
}

const TRAY_ACTIONS: Record<string, QuickAction[]> = {
  medical: [
    { label: 'Call 112',       icon: '📞', action: 'call_emergency' },
    { label: 'Share Location', icon: '📍', action: 'share_location' },
    { label: 'AED Nearby',     icon: '⚡', action: 'find_aed' },
    { label: 'SOS Flash',      icon: '🔦', action: 'sos_flash' },
  ],
  earth: [
    { label: 'Call 112',        icon: '📞', action: 'call_emergency'  },
    { label: 'Share Location',  icon: '📍', action: 'share_location'  },
    { label: 'Emergency Contact', icon: '👤', action: 'call_contact' },
  ],
  flood: [
    { label: 'Call 112',       icon: '📞', action: 'call_emergency' },
    { label: 'Share Location', icon: '📍', action: 'share_location' },
    { label: 'Evacuation',     icon: '🗺️', action: 'evacuation'     },
  ],
  storm: [
    { label: 'Call 112',       icon: '📞', action: 'call_emergency' },
    { label: 'Share Location', icon: '📍', action: 'share_location' },
    { label: 'SOS Flash',      icon: '🔦', action: 'sos_flash'      },
  ],
  default: [
    { label: 'Call 112',        icon: '📞', action: 'call_emergency'  },
    { label: 'Share Location',  icon: '📍', action: 'share_location'  },
    { label: 'Emergency Contact', icon: '👤', action: 'call_contact' },
  ],
};

interface QuickActionTrayProps {
  incidentType: IncidentType | null;
  emergencyContact?: string;
  onFindAED?: () => void;
}

export function QuickActionTray({ incidentType, emergencyContact, onFindAED }: QuickActionTrayProps) {
  const actions = TRAY_ACTIONS[incidentType ?? 'default'] ?? TRAY_ACTIONS.default;

  const [torchOn, setTorchOn]  = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const torchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const stopTorch = () => {
    if (torchIntervalRef.current) clearInterval(torchIntervalRef.current);
    torchIntervalRef.current = null;
    setTorchOn(false);
    setSosActive(false);
  };

  const startTorch = () => {
    setSosActive(true);
    torchIntervalRef.current = setInterval(() => {
      setTorchOn(prev => !prev);
    }, 500);
  };

  const handleAction = async (action: QuickAction['action']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (action) {
      case 'call_emergency':
        await Linking.openURL('tel:112');
        break;

      case 'share_location':
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission denied', 'Location permission is needed to share your position.'); return; }
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const { latitude, longitude } = pos.coords;
          await Share.share({ message: `📍 My emergency location: https://maps.google.com/?q=${latitude},${longitude}` });
        } catch (e) {
          console.warn('[QuickAction] share_location failed:', e);
        }
        break;

      case 'sos_flash':
        if (sosActive) { stopTorch(); break; }
        if (!cameraPermission?.granted) {
          const perm = await requestCameraPermission();
          if (!perm.granted) { Alert.alert('Permission denied', 'Camera permission is needed for the SOS flash.'); return; }
        }
        startTorch();
        break;

      case 'call_contact':
        if (emergencyContact) {
          await Linking.openURL(`tel:${emergencyContact}`);
        } else {
          Alert.alert('No emergency contact', 'Add an emergency contact in your profile.');
        }
        break;

      case 'find_aed':
        onFindAED?.();
        break;

      case 'evacuation':
        Alert.alert('Evacuation', 'Follow designated evacuation routes away from flooded areas. Move to higher ground immediately.');
        break;
    }
  };

  return (
    <View style={styles.tray}>
      {/* Hidden CameraView for torch — zero size, renders only when SOS active */}
      {sosActive && (
        <CameraView style={styles.hiddenCamera} facing="back" enableTorch={torchOn} />
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {actions.map(a => (
          <TouchableOpacity
            key={a.action}
            style={[styles.chip, a.action === 'sos_flash' && sosActive && styles.chipActive]}
            onPress={() => handleAction(a.action)}
            activeOpacity={0.75}
          >
            <Text style={styles.chipIcon}>{a.icon}</Text>
            <Text style={[styles.chipLabel, a.action === 'sos_flash' && sosActive && styles.chipLabelActive]}>
              {a.action === 'sos_flash' && sosActive ? 'Stop SOS' : a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingVertical: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.full,
    height: 36,
    paddingHorizontal: Spacing.md,
  },
  chipActive:      { backgroundColor: Colors.danger },
  chipIcon:        { fontSize: 14 },
  chipLabel:       { ...Typography.labelSm, color: Colors.onSurface },
  chipLabelActive: { color: '#ffffff' },

  hiddenCamera: { width: 0, height: 0, position: 'absolute' },
});
