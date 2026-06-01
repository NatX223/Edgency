import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  type TextInputProps,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

interface FormFieldProps extends TextInputProps {
  label: string;
  icon?: string;
  error?: string;
  hint?: string;
}

export function FormField({
  label,
  icon,
  error,
  hint,
  style,
  ...inputProps
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1, duration: 200, useNativeDriver: false,
    }).start();
    inputProps.onFocus?.({} as any);
  };

  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0, duration: 200, useNativeDriver: false,
    }).start();
    inputProps.onBlur?.({} as any);
  };

  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      error ? Colors.error : 'rgba(166,139,132,0.25)',
      Colors.primaryContainer,
    ],
  });

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <Animated.View style={[styles.inputWrap, { borderColor }]}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          {...inputProps}
          style={[styles.input, style]}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholderTextColor={Colors.onSurfaceVariant}
          selectionColor={Colors.primaryContainer}
        />
      </Animated.View>

      {error  && <Text style={styles.error}>{error}</Text>}
      {!error && hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:   { gap: 6 },
  label:     { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.default,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  icon:  { fontSize: 18 },
  input: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.onSurface,
    padding: 0,
    minHeight: 24,
  },
  error: { ...Typography.labelSm, color: Colors.error },
  hint:  { ...Typography.labelSm, color: Colors.onSurfaceVariant },
});
