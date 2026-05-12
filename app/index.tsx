import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { getNorthStar, getMilestones, clearAll, saveNorthStar, getProfileImage, saveProfileImage } from '../lib/storage';
import { NorthStar, Milestone } from '../lib/types';
import { colors, spacing, radius } from '../lib/theme';
import { DatePickerModal } from '../components/DatePickerModal';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [ns, ms, img] = await Promise.all([getNorthStar(), getMilestones(), getProfileImage()]);
    setNorthStar(ns);
    setMilestones(ms);
    setProfileImage(img);
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

  const saveTargetDate = async (date: string) => {
    if (!northStar) return;
    const updated = { ...northStar, targetDate: date };
    await saveNorthStar(updated);
    setNorthStar(updated);
  };

  const handleReset = () => {
    confirmReset(async () => {
      await clearAll();
      router.replace('/setup');
    });
  };

  const pickProfileImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to set a profile picture.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const dataUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setProfileImage(dataUri);
      await saveProfileImage(dataUri);
    }
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
  const lockedIn = northStar?.lockedInMilestoneId
    ? milestones.find((m) => m.id === northStar.lockedInMilestoneId)
    : null;

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {!northStar ? (
          <View style={styles.onboarding}>
            <View style={styles.onboardingHero}>
              <Text style={styles.starLarge}>★</Text>
            </View>
            <Text style={styles.headline}>What's your North Star?</Text>
            <Text style={styles.sub}>
              Set a meaningful goal, build an AI-powered action plan, and bring your people along for the journey.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push('/setup')}>
              <Text style={styles.primaryBtnText}>Set My North Star</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* North Star card */}
            <View style={styles.nsCard}>
              {/* Top row: label + edit */}
              <View style={styles.nsCardHeader}>
                <Text style={styles.nsLabel}>★  YOUR NORTH STAR</Text>
                <Pressable style={styles.editBtn} onPress={openEdit}>
                  <Text style={styles.editBtnText}>✎  Edit</Text>
                </Pressable>
              </View>

              {/* Avatar left + goal text right */}
              <View style={styles.nsGoalRow}>
                <Pressable style={styles.avatarBtn} onPress={pickProfileImage}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>+</Text>
                    </View>
                  )}
                  <View style={styles.avatarBadge}>
                    <Text style={styles.avatarBadgeText}>📷</Text>
                  </View>
                </Pressable>
                <View style={styles.nsGoalTextBlock}>
                  <Text style={styles.nsGoal}>{northStar.goal}</Text>
                  {!!northStar.why && <Text style={styles.nsWhy}>{northStar.why}</Text>}
                </View>
              </View>

              {/* Target date */}
              <Pressable style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateIcon}>🎯</Text>
                <Text style={styles.dateText}>
                  {northStar.targetDate ? `Target: ${northStar.targetDate}` : 'Set a target date'}
                </Text>
              </Pressable>

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

            {/* Lock In / Current Focus */}
            {lockedIn ? (
              <Pressable style={styles.lockInCard} onPress={() => router.push('/plan')}>
                <Text style={styles.lockInLabel}>🔒  CURRENT FOCUS</Text>
                <Text style={styles.lockInTitle}>{lockedIn.title}</Text>
                {lockedIn.description ? (
                  <Text style={styles.lockInDesc}>{lockedIn.description}</Text>
                ) : null}
                <View style={styles.lockInRow}>
                  <Text style={styles.lockInMeta}>
                    {lockedIn.tasks.filter(t => t.completed).length} of {lockedIn.tasks.length} tasks done
                    {milestones.length > 1 ? `  ·  ${milestones.length - 1} step${milestones.length > 2 ? 's' : ''} on hold` : ''}
                  </Text>
                  <Text style={styles.lockInView}>Go to plan →</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable style={styles.lockInEmpty} onPress={() => router.push('/plan')}>
                <Text style={styles.lockInEmptyIcon}>🔒</Text>
                <Text style={styles.lockInEmptyText}>Lock In on your next mini-goal</Text>
                <Text style={styles.lockInEmptySub}>Focus on one thing at a time — go to the Action Plan to lock in</Text>
              </Pressable>
            )}

            {/* Action buttons */}
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

      {/* Date picker */}
      <DatePickerModal
        visible={showDatePicker}
        current={northStar?.targetDate}
        onSelect={saveTargetDate}
        onClose={() => setShowDatePicker(false)}
      />

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

  onboarding: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.md },
  onboardingHero: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryDim,
    borderWidth: 2,
    borderColor: colors.primary + '44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  starLarge: { color: colors.primary, fontSize: 52 },
  headline: { color: colors.text, fontSize: 32, fontWeight: '800', textAlign: 'center', lineHeight: 40, marginBottom: spacing.md },
  sub: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 23, marginBottom: spacing.xl },
  primaryBtn: { backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.full },
  primaryBtnText: { color: colors.bg, fontWeight: '700', fontSize: 16 },

  nsCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.lg },
  nsCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  nsLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  editBtn: { backgroundColor: colors.primaryDim, borderRadius: radius.full, paddingVertical: 4, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.primary + '44' },
  editBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  nsGoalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.sm },
  avatarBtn: { position: 'relative', flexShrink: 0 },
  avatarImg: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.primary },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primaryDim, borderWidth: 2, borderColor: colors.primary + '55', alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderText: { color: colors.primary, fontSize: 26, fontWeight: '300', lineHeight: 32 },
  avatarBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.card, borderRadius: radius.full, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  avatarBadgeText: { fontSize: 11 },
  nsGoalTextBlock: { flex: 1 },
  nsGoal: { color: colors.text, fontSize: 22, fontWeight: '700', lineHeight: 30, marginBottom: 4 },
  nsWhy: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  dateIcon: { fontSize: 14 },
  dateText: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  progressBar: { flex: 1, height: 6, backgroundColor: colors.cardBorder, borderRadius: radius.full, overflow: 'hidden', flexDirection: 'row' },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: radius.full },
  progressPct: { color: colors.primary, fontWeight: '700', fontSize: 14, minWidth: 36 },
  progressSub: { color: colors.muted, fontSize: 12 },
  cardDivider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: spacing.md },
  resetText: { color: colors.danger, fontSize: 13, textAlign: 'center' },

  // Lock In card
  lockInCard: {
    backgroundColor: colors.text,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  lockInLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: spacing.sm },
  lockInTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 28, marginBottom: spacing.xs },
  lockInDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  lockInRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  lockInMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  lockInView: { color: colors.primary, fontSize: 13, fontWeight: '700' },

  lockInEmpty: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  lockInEmptyIcon: { fontSize: 28, marginBottom: spacing.xs },
  lockInEmptyText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  lockInEmptySub: { color: colors.muted, fontSize: 13, textAlign: 'center' },

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
