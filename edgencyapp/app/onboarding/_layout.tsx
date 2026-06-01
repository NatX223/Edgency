import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Horizontal slide between onboarding pages
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#131313' },
      }}
    />
  );
}
