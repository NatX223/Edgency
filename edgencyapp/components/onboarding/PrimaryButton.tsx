import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
  type TouchableOpacityProps,
} from 'react-native';
import { Colors, Typography, Radii } from '@/constants/tokens';

interface PrimaryButtonProps extends TouchableOpacityProps {
  label: string;
  /** Show a trailing arrow icon via unicode — avoids icon library dependency */
  showArrow?: boolean;
}

export function PrimaryButton({
  label,
  showArrow = false,
  onPress,
  style,
  ...rest
}: PrimaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.button}
        {...rest}
      >
        <Text style={styles.label}>{label}</Text>
        {showArrow && (
          <View style={styles.arrowWrapper}>
            <Text style={styles.arrow}>→</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // Ambient coral glow
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  label: {
    ...Typography.labelMd,
    color: Colors.onPrimaryContainer,
    fontSize: 16,
  },
  arrowWrapper: {
    marginLeft: 2,
  },
  arrow: {
    ...Typography.labelMd,
    color: Colors.onPrimaryContainer,
    fontSize: 18,
  },
});
