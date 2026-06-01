import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

interface TagInputProps {
  label: string;
  hint?: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
  const scale = useRef(new Animated.Value(0.85)).current;

  React.useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 10 }).start();
  }, []);

  return (
    <Animated.View style={[styles.tag, { transform: [{ scale }] }]}>
      <Text style={styles.tagLabel}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Text style={styles.tagRemove}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const COMMON_CONDITIONS = [
  'Asthma', 'Diabetes', 'Heart condition', 'Epilepsy',
  'Wheelchair user', 'Visual impairment', 'Hearing impairment',
  'Penicillin allergy', 'Blood thinner', 'Pacemaker',
];

export function TagInput({
  label,
  hint,
  tags,
  onTagsChange,
  placeholder = 'Type and press enter…',
  suggestions = COMMON_CONDITIONS,
}: TagInputProps) {
  const [inputVal, setInputVal] = useState('');
  const [focused, setFocused]   = useState(false);

  const addTag = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || tags.includes(trimmed)) { setInputVal(''); return; }
    onTagsChange([...tags, trimmed]);
    setInputVal('');
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  const visibleSuggestions = suggestions.filter(
    (s) => !tags.includes(s) &&
            s.toLowerCase().includes(inputVal.toLowerCase())
  ).slice(0, 6);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}

      {/* Existing tags */}
      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((t) => (
            <Tag key={t} label={t} onRemove={() => removeTag(t)} />
          ))}
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <TextInput
          style={styles.input}
          value={inputVal}
          onChangeText={setInputVal}
          placeholder={placeholder}
          placeholderTextColor={Colors.onSurfaceVariant}
          selectionColor={Colors.primaryContainer}
          returnKeyType="done"
          onSubmitEditing={() => addTag(inputVal)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          blurOnSubmit={false}
        />
        {inputVal.trim().length > 0 && (
          <TouchableOpacity style={styles.addBtn} onPress={() => addTag(inputVal)}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick-add suggestions */}
      {focused && visibleSuggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsScroll}
          contentContainerStyle={styles.suggestions}
          keyboardShouldPersistTaps="always"
        >
          {visibleSuggestions.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.suggestion}
              onPress={() => addTag(s)}
            >
              <Text style={styles.suggestionText}>+ {s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label:   { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  hint:    { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: -4 },

  tagRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,126,95,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,163,0.35)',
    borderRadius: Radii.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  tagLabel:  { ...Typography.labelSm, color: Colors.primaryContainer },
  tagRemove: { fontSize: 16, color: Colors.primaryContainer, lineHeight: 18 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.default,
    borderWidth: 1.5,
    borderColor: 'rgba(166,139,132,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  inputWrapFocused: { borderColor: Colors.primaryContainer },
  input: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.onSurface,
    padding: 0,
  },
  addBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  addBtnText: { ...Typography.labelSm, color: Colors.onPrimaryContainer },

  suggestionsScroll: { marginTop: 2 },
  suggestions:       { gap: 7, paddingVertical: 2 },
  suggestion: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radii.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  suggestionText: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
});
