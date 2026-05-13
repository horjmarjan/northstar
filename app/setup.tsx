import { useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { saveNorthStar, saveMilestones } from '../lib/storage';
import { NorthStar } from '../lib/types';
import { colors, gradients, radius, spacing } from '../lib/theme';
import { API } from '../lib/apiUrl';

export default function SetupScreen() {
  const [goal, setGoal] = useState('');
  const [why, setWhy] = useState('');
  const [miniGoals, setMiniGoals] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const addMiniGoal = () => {
    if (miniGoals.length < 8) setMiniGoals([...miniGoals, '']);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const updateMiniGoal = (index: number, value: string) => {
    const updated = [...miniGoals];
    updated[index] = value;
    setMiniGoals(updated);
  };

  const removeMiniGoal = (index: number) => {
    if (miniGoals.length <= 2) {
      updateMiniGoal(index, '');
    } else {
      setMiniGoals(miniGoals.filter((_, i) => i !== index));
    }
  };

  const filledMiniGoals = miniGoals.map((g) => g.trim()).filter(Boolean);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      Alert.alert('Missing goal', 'Tell us your North Star first.');
      return;
    }
    if (!why.trim()) {
      Alert.alert('Tell us why', 'What makes this goal meaningful to you?');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          why: why.trim(),
          miniGoals: filledMiniGoals,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate plan');
      }

      const { northStarId, milestones } = await res.json();

      const ns: NorthStar = {
        id: northStarId,
        goal: goal.trim(),
        why: why.trim(),
        createdAt: new Date().toISOString(),
      };

      await saveNorthStar(ns);
      await saveMilestones(milestones);
      router.replace('/plan');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = goal.trim() && why.trim() && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Image source={require('../assets/north_star_logo.png')} style={styles.logoIcon} />

        {/* North Star */}
        <Text style={styles.sectionTitle}>Your North Star</Text>
        <Text style={styles.sectionSub}>The big, meaningful goal you're working toward.</Text>

        <Text style={styles.label}>What's your goal?</Text>
        <TextInput
          style={styles.input}
          value={goal}
          onChangeText={setGoal}
          placeholder="e.g. Move to Bali in January"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={200}
          editable={!loading}
        />

        <Text style={styles.label}>Why does this matter to you?</Text>
        <TextInput
          style={styles.input}
          value={why}
          onChangeText={setWhy}
          placeholder="e.g. I want to live more intentionally and embrace a new culture"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={300}
          editable={!loading}
        />

        {/* Mini Goals */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Key Steps  <Text style={styles.optional}>(optional)</Text></Text>
        <Text style={styles.sectionSub}>
          What are the big things you need to accomplish to make this happen? Leave blank and we'll figure it out with AI.
        </Text>

        {miniGoals.map((mg, i) => (
          <View key={i} style={styles.miniGoalRow}>
            <View style={styles.miniGoalNum}>
              <Text style={styles.miniGoalNumText}>{i + 1}</Text>
            </View>
            <TextInput
              style={styles.miniGoalInput}
              value={mg}
              onChangeText={(v) => updateMiniGoal(i, v)}
              placeholder={i === 0 ? 'e.g. Get my finances in order' : i === 1 ? 'e.g. Figure out business opportunity' : 'Another key step…'}
              placeholderTextColor={colors.muted}
              editable={!loading}
              maxLength={120}
            />
            {mg.length > 0 && (
              <Pressable onPress={() => removeMiniGoal(i)} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
          </View>
        ))}

        {miniGoals.length < 8 && (
          <Pressable style={styles.addBtn} onPress={addMiniGoal} disabled={loading}>
            <Text style={styles.addBtnText}>+ Add another step</Text>
          </Pressable>
        )}

        {filledMiniGoals.length === 0 && (
          <View style={styles.aiNotice}>
            <Text style={styles.aiNoticeText}>
              ✦  AI will generate your key steps and action plan automatically
            </Text>
          </View>
        )}

        {filledMiniGoals.length > 0 && (
          <View style={styles.aiNotice}>
            <Text style={styles.aiNoticeText}>
              ✦  AI will build tasks for each of your {filledMiniGoals.length} key step{filledMiniGoals.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Generate */}
        <Pressable
          style={[styles.btnWrapper, !canGenerate && styles.btnDisabled]}
          onPress={handleGenerate}
          disabled={!canGenerate}
        >
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            {loading ? (
              <View style={styles.btnInner}>
                <ActivityIndicator color={colors.bg} size="small" />
                <Text style={styles.btnText}>Building your plan…</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>Build My Action Plan  ✦</Text>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: 120 },
  logoIcon: { width: 56, height: 56, marginBottom: spacing.lg },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: spacing.xs },
  sectionSub: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: spacing.md },
  optional: { color: colors.muted, fontWeight: '400', fontSize: 13 },
  divider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: spacing.lg },

  label: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 15,
    padding: spacing.md,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
    minHeight: 70,
  },

  miniGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  miniGoalNum: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniGoalNumText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  miniGoalInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 14,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  clearBtn: { padding: spacing.xs },
  clearBtnText: { color: colors.muted, fontSize: 14 },

  addBtn: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
  addBtnText: { color: colors.blue, fontSize: 14, fontWeight: '600' },

  aiNotice: {
    backgroundColor: colors.primaryDim,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  aiNoticeText: { color: colors.primary, fontSize: 13 },

  btnWrapper: {
    borderRadius: radius.full,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  btn: {
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btnText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
});
