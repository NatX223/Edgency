import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/tokens';

export default function StubScreen() {
  return (
    <View style={s.root}>
      <Text style={s.text}>profile</Text>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { ...Typography.headlineMd, color: Colors.onSurfaceVariant, textTransform: 'capitalize' },
});
