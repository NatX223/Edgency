import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#131313' },
        // Prevent hardware back from escaping auth flow
        gestureEnabled: false,
      }}
    />
  );
}
