import { useCallback, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

export type PermissionType = 'camera' | 'library' | 'microphone';

/**
 * Requests a permission only when first needed, not on mount.
 * Returns helper functions that resolve to true if the permission is granted.
 */
export function useMediaPermissions() {
  // Cache granted state so we don't re-prompt every tap
  const granted = useRef<Record<PermissionType, boolean>>({
    camera:     false,
    library:    false,
    microphone: false,
  });

  const openSettings = () => {
    Alert.alert(
      'Permission required',
      'Please enable this permission in your device Settings to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  /** Returns true if camera permission is granted */
  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (granted.current.camera) return true;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') {
      granted.current.camera = true;
      return true;
    }
    openSettings();
    return false;
  }, []);

  /** Returns true if photo library permission is granted */
  const requestLibrary = useCallback(async (): Promise<boolean> => {
    if (granted.current.library) return true;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') {
      granted.current.library = true;
      return true;
    }
    openSettings();
    return false;
  }, []);

  /** Returns true if microphone permission is granted */
  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    if (granted.current.microphone) return true;

    const { status } = await Audio.requestPermissionsAsync();
    if (status === 'granted') {
      granted.current.microphone = true;
      return true;
    }
    openSettings();
    return false;
  }, []);

  return { requestCamera, requestLibrary, requestMicrophone };
}
