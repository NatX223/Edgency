import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';
import { useDatabase, type UserRecord } from '@/hooks/useDatabase';
import { FormField }          from '@/components/auth/FormField';
import { RoleSelector, type Role } from '@/components/auth/RoleSelector';
import { TagInput }           from '@/components/auth/TagInput';
import { ExperienceSelector, type ExperienceLevel } from '@/components/auth/ExperienceSelector';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 2;

// ─── Validation ────────────────────────────────────────────────────────────────
interface Step1Errors { fullName?: string; sector?: string; role?: string }
interface Step2Errors { medicalHistory?: string }

function validateStep1(fullName: string, sector: string, role: Role | null): Step1Errors {
  const errors: Step1Errors = {};
  if (!fullName.trim())  errors.fullName = 'Full name is required';
  if (!sector.trim())    errors.sector   = 'Please enter your sector or location';
  if (!role)             errors.role     = 'Please select your role';
  return errors;
}

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ current }: { current: number }) {
  return (
    <View style={sd.row}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[sd.dot, i === current && sd.dotActive]} />
      ))}
    </View>
  );
}
const sd = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot:       { width: 8,  height: 8, borderRadius: 4, backgroundColor: Colors.surfaceVariant },
  dotActive: { width: 28, height: 8, borderRadius: 4, backgroundColor: Colors.primaryContainer },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function SignupScreen() {
  const { isReady: dbReady, insertUser } = useDatabase();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // Step 1
  const [fullName, setFullName] = useState('');
  const [sector,   setSector]   = useState('');
  const [role,     setRole]     = useState<Role | null>(null);
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});

  // Step 2
  const [medicalHistory,   setMedicalHistory]   = useState('');
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [disabilities,     setDisabilities]     = useState<string[]>([]);
  const [experienceLevel,  setExperienceLevel]  = useState<ExperienceLevel | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Slide animation ────────────────────────────────────────────────────────
  const slideX = useRef(new Animated.Value(0)).current;

  const goToStep = (next: number) => {
    const dir = next > step ? -1 : 1;
    // Slide current step out, then snap to next and slide in
    Animated.sequence([
      Animated.timing(slideX, {
        toValue: dir * width * 0.3,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(next);
      slideX.setValue(-dir * width * 0.3);
      Animated.timing(slideX, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = () => {
    const errors = validateStep1(fullName, sector, role);
    if (Object.keys(errors).length > 0) { setStep1Errors(errors); return; }
    setStep1Errors({});
    goToStep(1);
  };

  const handleBack = () => goToStep(0);

  const handleSubmit = async () => {
    if (!dbReady) {
      Alert.alert('Please wait', 'Database is still initializing.');
      return;
    }
    if (role === 'responder' && !experienceLevel) {
      Alert.alert('Missing info', 'Please select your experience level.');
      return;
    }

    setSubmitting(true);
    try {
      const record: UserRecord = {
        full_name:         fullName.trim(),
        sector:            sector.trim(),
        role:              role!,
        medical_history:   medicalHistory.trim(),
        health_conditions: healthConditions.join(','),
        disabilities:      disabilities.join(','),
        experience_level:  role === 'responder' ? experienceLevel : null,
      };

      await insertUser(record);
      await AsyncStorage.setItem('onboarding_complete', 'true');
      await AsyncStorage.setItem('user_signed_up', 'true');

      // Navigate to model download — no back
      router.replace('/auth/model-download');
    } catch (e: any) {
      Alert.alert('Error', `Could not save your profile: ${e?.message ?? String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Background coral glow */}
      <View style={styles.bgGlow} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brand}>
              <Text style={styles.brandStar}>✳</Text>
              <Text style={styles.brandName}>Edgency</Text>
            </View>
            <StepDots current={step} />
          </View>

          {/* Animated form panel */}
          <Animated.View style={[styles.formPanel, { transform: [{ translateX: slideX }] }]}>

            {/* ─── Step 1: Personal info ──────────────────────────────── */}
            {step === 0 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>Tell us about yourself</Text>
                  <Text style={styles.stepSub}>
                    This helps Edgency personalise your emergency experience and connect you to the right services.
                  </Text>
                </View>

                <FormField
                  label="Full name"
                  icon="👤"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Amara Okonkwo"
                  autoCapitalize="words"
                  error={step1Errors.fullName}
                />

                <FormField
                  label="Location / Sector"
                  icon="📍"
                  value={sector}
                  onChangeText={setSector}
                  placeholder="e.g. Sector 4, Downtown"
                  autoCapitalize="words"
                  error={step1Errors.sector}
                  hint="Used to connect you with nearby responders"
                />

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Your role</Text>
                  {step1Errors.role && (
                    <Text style={styles.fieldError}>{step1Errors.role}</Text>
                  )}
                  <RoleSelector value={role} onChange={setRole} />
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Next</Text>
                  <Text style={styles.primaryBtnArrow}>→</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ─── Step 2: Health & experience ───────────────────────── */}
            {step === 1 && (
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>Health & experience</Text>
                  <Text style={styles.stepSub}>
                    This information is stored locally on your device only. It helps first responders assist you more effectively.
                  </Text>
                </View>

                <FormField
                  label="Medical history"
                  icon="🏥"
                  value={medicalHistory}
                  onChangeText={setMedicalHistory}
                  placeholder="e.g. Type 2 diabetes, managed with Metformin"
                  multiline
                  numberOfLines={3}
                  style={styles.multiline}
                  hint="Optional — describe any relevant medical background"
                />

                <TagInput
                  label="Health conditions & allergies"
                  hint="Tap a suggestion or type your own and press Add"
                  tags={healthConditions}
                  onTagsChange={setHealthConditions}
                  placeholder="e.g. Asthma, Penicillin allergy…"
                />

                <TagInput
                  label="Disabilities or mobility needs"
                  tags={disabilities}
                  onTagsChange={setDisabilities}
                  placeholder="e.g. Wheelchair user, Visual impairment…"
                  suggestions={[
                    'Wheelchair user', 'Cane user', 'Visual impairment',
                    'Hearing impairment', 'Mobility impairment', 'Cognitive disability',
                    'Prosthetic limb', 'Service animal',
                  ]}
                />

                {/* Experience level — only for responders */}
                {role === 'responder' && (
                  <ExperienceSelector
                    value={experienceLevel}
                    onChange={setExperienceLevel}
                  />
                )}

                {/* Privacy note */}
                <View style={styles.privacyNote}>
                  <Text style={styles.privacyIcon}>🔒</Text>
                  <Text style={styles.privacyText}>
                    All health data is stored only on this device using an encrypted local database. It is never sent to external servers.
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.75}>
                    <Text style={styles.backBtnText}>← Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryBtn, styles.primaryBtnFlex, submitting && styles.primaryBtnDisabled]}
                    onPress={handleSubmit}
                    activeOpacity={0.85}
                    disabled={submitting}
                  >
                    <Text style={styles.primaryBtnText}>
                      {submitting ? 'Saving…' : 'Complete Setup'}
                    </Text>
                    {!submitting && <Text style={styles.primaryBtnArrow}>→</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  flex:    { flex: 1 },
  bgGlow: {
    position: 'absolute',
    width: 300, height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primaryContainer,
    opacity: 0.05,
    top: -80, alignSelf: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: 56,
    paddingBottom: 48,
    gap: Spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandStar: { fontSize: 20, color: Colors.primaryContainer },
  brandName: { ...Typography.headlineMd, fontSize: 18, color: Colors.primaryContainer },

  // Form panel
  formPanel:   { gap: Spacing.xl },
  stepContent: { gap: Spacing.lg },
  stepHeader:  { gap: Spacing.sm },
  stepTitle:   { ...Typography.headlineLgMobile, color: Colors.onSurface },
  stepSub:     { ...Typography.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 22 },

  // Field wrappers
  fieldGroup: { gap: 8 },
  fieldLabel: { ...Typography.labelMd, color: Colors.onSurfaceVariant },
  fieldError: { ...Typography.labelSm, color: Colors.error },

  // Multiline input override
  multiline:  { minHeight: 80, textAlignVertical: 'top' },

  // Privacy note
  privacyNote: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.default,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  privacyIcon: { fontSize: 16, flexShrink: 0 },
  privacyText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, flex: 1, lineHeight: 17 },

  // Buttons
  actionRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  backBtn: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
  },
  backBtnText: { ...Typography.labelMd, color: Colors.onSurfaceVariant },

  primaryBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  primaryBtnFlex:     { flex: 1 },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText:     { ...Typography.labelMd, color: Colors.onPrimaryContainer, fontSize: 16 },
  primaryBtnArrow:    { ...Typography.labelMd, color: Colors.onPrimaryContainer, fontSize: 18 },
});
