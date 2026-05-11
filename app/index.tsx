import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getNorthStar, getMilestones, clearAll, saveNorthStar } from '../lib/storage';
import { NorthStar, Milestone } from '../lib/types';
import { colors, spacing, radius } from '../lib/theme';

function confirmReset(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm('Reset your North Star? This will permanently delete your goal, action plan, and all progress. This cannot be undone.')) {
      onConfirm();
    }
  } else {
    Alert.alert(
      'Reset your North Star?',
      'This will permanently delete your goal, action plan, and all progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, start over', style: 'destructive', onPress: onConfirm },
      ]
    );
  }
}

export default function HomeScreen() {
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [whyDraft, setWhyDraft] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [ns, ms] = await Promise.all([getNorthStar(), getMilestones()]);
    setNorthStar(ns);
    setMilestones(ms);
    setLoading(false);
  };

  useEffect(() => {
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  const openEdit = () => {
    setGoalDraft(northStar?.goal ?? '');
    setWhyDraft(northStar?.why ?? '');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!northStar || !goalDraft.trim()) return;
    const updated: NorthStar = { ...northStar, goal: goalDraft.trim(), why: whyDraft.trim() };
    await saveNorthStar(updated);
    setNorthStar(updated);
    setEditing(false);
  };

  const handleReset = () => {
    confirmReset(async () => {
      await clearAll();
      router.replace('/setup');
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.star}>★</Text>
      </View>
    );
  }

  const allTasks = milestones.flatMap((m) => m.tasks);
  const doneTasks = allTasks.filter((t) => t.completed).length;
  const pct = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;
  const activeMilestone = milestones.find((m) => !m.completed);

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {!northStar ? (
          <View style={styles.onboarding}>
            <Text style={styles.starLarge}>★</Text>
            <Text style={styles.headline}>What's your{'\n'}North Star?</Text>
            <Text style={styles.sub}>
              Set a meaningful goal, get an AI-powered action plan, and bring your people along for the journey.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push('/setup')}>
              <Text style={styles.primaryBtnText}>Set My North Star</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.nsCard}>
              <View style={styles.nsCardHeader}>
                <Text style={styles.nsLabel}>★  YOUR NORTH STAR</Text>
                <Pressable style={styles.editBtn} onPress={openEdit}>
                  <Text style={styles.editBtnText}>✎  Edit</Text>
                </Pressable>
              </View>
              <Text style={styles.nsGoal}>{northStar.goal}</Text>
              <Text style={styles.nsWhy}>{northStar.why}</Text>
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { flex: pct }]} />
                  <View style={{ flex: 100 - pct }} />
                </View>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <Text style={styles.progressSub}>{doneTasks} of {allTasks.length} tasks complete</Text>

              <View style={styles.cardDivider} />
              <Pressable onPress={handleReset}>
                <Text style={styles.resetText}>Reset North Star</Text>
              </Pressable>
            </View>

            {activeMilestone && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>CURRENT MILESTONE</Text>
                <View style={styles.milestonePreview}>
                  <Text style={styles.milestoneTitle}>{activeMilestone.title}</Text>
                  <Text style={styles.milestoneDesc}>{activeMilestone.description}</Text>
                </View>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.actionBtn} onPress={() => router.push('/plan')}>
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={styles.actionLabel}>View Plan</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => router.push('/supporters')}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionLabel}>Supporters</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => router.push('/timeline')}>
                <Text style={styles.actionIcon}>📅</Text>
                <Text style={styles.actionLabel}>Timeline</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit North Star modal */}
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.overlay} onPress={() => setEditing(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kvAvoid}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Edit North Star</Text>

            <Text style={styles.sheetLabel}>Your goal</Text>
            <TextInput
              style={styles.sheetInput}
              value={goalDraft}
              onChangeText={setGoalDraft}
              multiline
              maxLength={200}
              placeholder="e.g. Move to Bali in January"
              placeholderTextColor={colors.muted}
              autoFocus
            />

            <Text style={styles.sheetLabel}>Why it matters</Text>
            <TextInput
              style={styles.sheetInput}
              value={whyDraft}
              onChangeText={setWhyDraft}
              multiline
              maxLength={300}
              placeholder="What makes this goal meaningful?"
              placeholderTextColor={colors.muted}
            />

            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, !goalDraft.trim() && styles.saveBtnDisabled]}
                onPress={saveEdit}
                disabled={!goalDraft.trim()}
              >
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xxl + spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  star: { color: colors.primary, fontSize: 40 },

  onboarding: { alignItems: 'center', paddingTop: spacing.xxl },
  starLarge: { color: colors.primary, fontSize: 80, marginBottom: spacing.lg },
  headline: { color: colors.text, fontSize: 36, fontWeight: '700', textAlign: 'center', lineHeight: 44, marginBottom: spacing.md },
  sub: { color: colors.muted, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: spacing.xl, paddingHorizontal: spacing.md },
  primaryBtn: { backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.full },
  primaryBtnText: { color: colors.bg, fontWeight: '700', fontSize: 16 },

  nsCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.lg },
  nsCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  nsLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  editBtn: { backgroundColor: colors.primaryDim, borderRadius: radius.full, paddingVertical: 4, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.primary + '44' },
  editBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  nsGoal: { color: colors.text, fontSize: 22, fontWeight: '700', lineHeight: 30, marginBottom: spacing.xs },
  nsWhy: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  progressBar: { flex: 1, height: 6, backgroundColor: colors.cardBorder, borderRadius: radius.full, overflow: 'hidden', flexDirection: 'row' },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: radius.full },
  progressPct: { color: colors.primary, fontWeight: '700', fontSize: 14, minWidth: 36 },
  progressSub: { color: colors.muted, fontSize: 12 },
  cardDivider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: spacing.md },
  resetText: { color: colors.danger, fontSize: 13, textAlign: 'center' },

  section: { marginBottom: spacing.lg },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.sm },
  milestonePreview: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder },
  milestoneTitle: { color: colors.text, fontWeight: '600', fontSize: 16, marginBottom: 4 },
  milestoneDesc: { color: colors.muted, fontSize: 13, lineHeight: 18 },

  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  actionIcon: { fontSize: 24, marginBottom: spacing.xs },
  actionLabel: { color: colors.text, fontSize: 12, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  kvAvoid: { justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40, borderTopWidth: 1, borderColor: colors.cardBorder },
  handle: { width: 36, height: 4, backgroundColor: colors.muted, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  sheetLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: spacing.xs },
  sheetInput: { backgroundColor: colors.inputBg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, color: colors.text, fontSize: 15, padding: spacing.md, minHeight: 70, textAlignVertical: 'top', marginBottom: spacing.md },
  sheetActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  cancelBtn: { flex: 1, backgroundColor: colors.card, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  cancelText: { color: colors.muted, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});
