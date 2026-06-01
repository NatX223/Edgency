import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/tokens';

export default function Index() {
  useEffect(() => {
    (async () => {
      const onboarded = await AsyncStorage.getItem('onboarding_complete');
      const signedUp  = await AsyncStorage.getItem('user_signed_up');

      if (!onboarded) {
        router.replace('/onboarding' as any);
      } else if (!signedUp) {
        router.replace('/auth/signup' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    })();
  }, []);

  // Render a spinner while the async check resolves
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.primaryContainer} />
    </View>
  );
}
