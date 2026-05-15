import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { saveNorthStar, saveMilestones, saveGoals } from '../lib/storage';
import { NorthStar, Milestone, Goal } from '../lib/types';
import { colors, gradients, radius, spacing } from '../lib/theme';
import { API } from '../lib/apiUrl';
import { getToken } from '../lib/auth';

const { width: SCREEN_W } = Dimensions.get('window');

const STEPS = [
  { id: 'what' },
  { id: 'goal' },
  { id: 'why' },
  { id: 'steps' },
];

export default function OnboardingScreen() {
  const [step, setStep]           = useState(0);
  const [goal, setGoal]           = useState('');
  const [why, setWhy]             = useState('');
  const [keySteps, setKeySteps]   = useState(['', '', '']);
  const [generating, setGenerating] = useState(false);
  const [error, setError]         = useState('');
  const slideAnim                 = useRef(new Animated.Value(0)).current;

  const goTo = (next: number) => {
    const dir = next > step ? -1 : 1;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: SCREEN_W * dir, duration: 0, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    setStep(next);
  };

  const updateKeyStep = (i: number, val: string) => {
    const updated = [...keySteps];
    updated[i] = val;
    setKeySteps(updated);
  };

  const buildPlan = async () => {
    setError('');
    setGenerating(true);
    try {
      const filledSteps = keySteps.filter(s => s.trim());
      const token = getToken();
      const res = await fetch(`${API}/api/generate-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ goal: goal.trim(), why: why.trim(), miniGoals: filledSteps }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      const ns: NorthStar = {
        id: data.northStarId,
        goal: goal.trim(),
        why: why.trim(),
        createdAt: new Date().toISOString(),
      };

      const defaultGoal: Goal = {
        id: `goal_${Date.now()}`,
        northStarId: ns.id,
        title: 'My Goals',
        order: 0,
      };

      const milestones: Milestone[] = data.milestones.map((m: Milestone) => ({
        ...m,
        goalId: defaultGoal.id,
      }));

      await saveNorthStar(ns);
      await saveGoals([defaultGoal]);
      await saveMilestones(milestones);

      router.replace('/plan');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const canAdvance = () => {
    if (step === 1) return goal.trim().length > 5;
    if (step === 2) return why.trim().length > 5;
    return true;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <Animated.View style={[styles.stepWrap, { transform: [{ translateX: slideAnim }] }]}>
        {/* ── Step 0: What is a North Star ── */}
        {step === 0 && (
          <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>BEFORE WE BEGIN</Text>
            <Text style={styles.stepTitle}>What's a North Star?</Text>

            <View style={styles.calloutCard}>
              <Text style={styles.calloutIcon}>✦</Text>
              <Text style={styles.calloutText}>
                A North Star is <Text style={styles.bold}>who you want to become</Text> or{' '}
                <Text style={styles.bold}>the life you want to live</Text> — not just something to check off a list.
              </Text>
            </View>

            <View style={styles.compareBlock}>
              <View style={styles.compareRow}>
                <View style={[styles.compareTag, styles.tagGoal]}><Text style={styles.tagText}>GOAL</Text></View>
                <Text style={styles.compareDesc}>"Run a 5K"</Text>
              </View>
              <View style={styles.compareArrow}><Text style={styles.compareArrowText}>vs</Text></View>
              <View style={styles.compareRow}>
                <View style={[styles.compareTag, styles.tagNS]}><Text style={styles.tagTextNS}>NORTH STAR</Text></View>
                <Text style={styles.compareDesc}>"Become someone who takes care of their body and shows up with energy every day"</Text>
              </View>
            </View>

            <View style={styles.tipBlock}>
              <Text style={styles.tipTitle}>A North Star…</Text>
              <Text style={styles.tip}>◎  Stays relevant for months or years</Text>
              <Text style={styles.tip}>◎  Gives meaning to every smaller goal</Text>
              <Text style={styles.tip}>◎  Reflects your values, not just outcomes</Text>
              <Text style={styles.tip}>◎  Guides decisions when things get hard</Text>
            </View>
          </ScrollView>
        )}

        {/* ── Step 1: Set your North Star ── */}
        {step === 1 && (
          <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>STEP 1 OF 3</Text>
            <Text style={styles.stepTitle}>Set your North Star</Text>
            <Text style={styles.stepSub}>
              Think big. This is the life you're building toward — not just the next thing on your to-do list.
            </Text>

            <View style={styles.promptBox}>
              <Text style={styles.promptLabel}>Try starting with:</Text>
              <Text style={styles.promptExample}>"Become someone who…"</Text>
              <Text style={styles.promptExample}>"Live a life where…"</Text>
              <Text style={styles.promptExample}>"Build / create / reach…"</Text>
            </View>

            <Text style={styles.inputLabel}>YOUR NORTH STAR</Text>
            <TextInput
              style={styles.bigInput}
              value={goal}
              onChangeText={setGoal}
              placeholder="e.g. Move to Bali and work remotely doing work I love"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={200}
              spellCheck
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{goal.length}/200</Text>
          </ScrollView>
        )}

        {/* ── Step 2: Why it matters ── */}
        {step === 2 && (
          <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>STEP 2 OF 3</Text>
            <Text style={styles.stepTitle}>Why does this matter to you?</Text>
            <Text style={styles.stepSub}>
              This is the fuel. When motivation dips, your "why" is what keeps you moving.
              Be honest — there's no wrong answer.
            </Text>

            <View style={styles.northStarPreview}>
              <Text style={styles.previewLabel}>YOUR NORTH STAR</Text>
              <Text style={styles.previewGoal}>{goal}</Text>
            </View>

            <Text style={styles.inputLabel}>WHY IT MATTERS</Text>
            <TextInput
              style={styles.bigInput}
              value={why}
              onChangeText={setWhy}
              placeholder="e.g. I want to prove to myself I can build the life I've always dreamed of, not just watch others do it."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={400}
              spellCheck
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{why.length}/400</Text>
          </ScrollView>
        )}

        {/* ── Step 3: Key Steps ── */}
        {step === 3 && (
          <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>STEP 3 OF 3</Text>
            <Text style={styles.stepTitle}>Your first Key Steps</Text>
            <Text style={styles.stepSub}>
              What are the big moves you'll need to make? These aren't tasks — they're the major chapters
              on your journey. Leave blank and AI will suggest them for you.
            </Text>

            {keySteps.map((val, i) => (
              <View key={i} style={styles.keyStepRow}>
                <View style={styles.keyStepNum}><Text style={styles.keyStepNumText}>{i + 1}</Text></View>
                <TextInput
                  style={styles.keyStepInput}
                  value={val}
                  onChangeText={v => updateKeyStep(i, v)}
                  placeholder={`Key step ${i + 1} (optional)`}
                  placeholderTextColor={colors.muted}
                  maxLength={100}
                  spellCheck
                />
              </View>
            ))}

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable style={styles.generateBtnWrapper} onPress={buildPlan} disabled={generating}>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateBtn}
              >
                <Text style={styles.generateBtnText}>
                  {generating ? 'Building your plan…' : '✦  Build My Action Plan'}
                </Text>
              </LinearGradient>
            </Pressable>

            <Text style={styles.aiNote}>
              AI will turn your North Star and key steps into a structured plan with milestones and tasks.
            </Text>
          </ScrollView>
        )}
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navRow}>
        {step > 0 ? (
          <Pressable style={styles.backBtn} onPress={() => goTo(step - 1)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
        ) : (
          <View />
        )}

        {step < STEPS.length - 1 && (
          <Pressable
            style={[styles.nextBtnWrapper, !canAdvance() && { opacity: 0.4 }]}
            onPress={() => canAdvance() && goTo(step + 1)}
            disabled={!canAdvance()}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtn}
            >
              <Text style={styles.nextBtnText}>{step === 0 ? "Let's go →" : 'Next →'}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 60, paddingBottom: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cardBorder },
  dotActive: { width: 24, backgroundColor: colors.primary },

  stepWrap: { flex: 1 },
  stepContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },

  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: spacing.xs },
  stepTitle: { color: colors.text, fontSize: 28, fontWeight: '800', lineHeight: 36, marginBottom: spacing.sm },
  stepSub: { color: colors.muted, fontSize: 15, lineHeight: 24, marginBottom: spacing.lg },

  // Step 0 — What is a North Star
  calloutCard: {
    backgroundColor: colors.primaryDim,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  calloutIcon: { color: colors.primary, fontSize: 18, marginTop: 2 },
  calloutText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 24 },
  bold: { fontWeight: '700' },

  compareBlock: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, gap: spacing.sm },
  compareRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  compareArrow: { alignItems: 'center' },
  compareArrowText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  compareTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, flexShrink: 0, marginTop: 2 },
  tagGoal: { backgroundColor: colors.cardBorder },
  tagNS: { backgroundColor: colors.primary },
  tagText: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  tagTextNS: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  compareDesc: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 22 },

  tipBlock: { gap: spacing.sm },
  tipTitle: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: spacing.xs },
  tip: { color: colors.text, fontSize: 14, lineHeight: 22 },

  // Step 1 — Goal
  promptBox: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, gap: 4 },
  promptLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  promptExample: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  inputLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: spacing.xs },
  bigInput: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 16,
    lineHeight: 26,
    padding: spacing.md,
    minHeight: 120,
    marginBottom: 4,
  },
  charCount: { color: colors.muted, fontSize: 11, textAlign: 'right', marginBottom: spacing.md },

  // Step 2 — Why
  northStarPreview: { backgroundColor: colors.primaryDim, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.primary + '33' },
  previewLabel: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  previewGoal: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 24 },

  // Step 3 — Key Steps
  keyStepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  keyStepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  keyStepNumText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  keyStepInput: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, color: colors.text, fontSize: 15, padding: spacing.sm, paddingHorizontal: spacing.md },

  errorBox: { backgroundColor: '#FFF3E0', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: '#FFD0A0' },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600' },

  generateBtnWrapper: { borderRadius: radius.full, overflow: 'hidden', marginTop: spacing.lg, marginBottom: spacing.sm },
  generateBtn: { paddingVertical: spacing.md + 2, alignItems: 'center', borderRadius: radius.full },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  aiNote: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Nav row
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.cardBorder, backgroundColor: colors.bg },
  backBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  backBtnText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  nextBtnWrapper: { borderRadius: radius.full, overflow: 'hidden' },
  nextBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, borderRadius: radius.full },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
