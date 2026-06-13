import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import {
  getNorthStars,
  getActiveNorthStarId,
  setActiveNorthStarId,
  getNorthStar,
  saveNorthStar,
  getMilestones,
  clearAll,
  deleteNorthStarAndData,
  getGoalImage,
  saveGoalImage,
} from '../lib/storage';
import { isLoggedIn, restoreSession } from '../lib/auth';
import { NorthStar, Milestone } from '../lib/types';
import { colors, gradients, spacing, radius } from '../lib/theme';
import { DatePickerModal } from '../components/DatePickerModal';

function confirmReset(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm('Reset this North Star? This will permanently delete this goal, its plan, and all progress. This cannot be undone.')) {
      onConfirm();
    }
  } else {
    Alert.alert(
      'Reset this North Star?',
      'This will permanently delete this goal, its plan, and all progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, delete it', style: 'destructive', onPress: onConfirm },
      ]
    );
  }
}

// ─── Bullseye with arrow icon ─────────────────────────────────────────────
function BullseyeArrow({ size = 44, color = '#C9884A' }: { size?: number; color?: string }) {
  const r = size / 2;
  const totalWidth = size + size * 0.58;
  return (
    <View style={{ width: totalWidth, height: size, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: 0, top: r - 1, height: 2, width: size * 0.52, backgroundColor: color }} />
      <View style={{
        position: 'absolute', left: size * 0.47, top: r - 5,
        width: 0, height: 0,
        borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 9,
        borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color,
      }} />
      <View style={{ position: 'absolute', right: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: size,        height: size,        borderRadius: r,          borderWidth: 2, borderColor: color, opacity: 0.28 }} />
        <View style={{ position: 'absolute', width: size * 0.67, height: size * 0.67, borderRadius: size * 0.335, borderWidth: 2, borderColor: color, opacity: 0.58 }} />
        <View style={{ position: 'absolute', width: size * 0.37, height: size * 0.37, borderRadius: size * 0.185, borderWidth: 2, borderColor: color }} />
        <View style={{ width: size * 0.13, height: size * 0.13, borderRadius: size * 0.065, backgroundColor: color }} />
      </View>
    </View>
  );
}

// ─── Keyword extractor for goal images ────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','to','for','and','or','of','in','on','at','is','my','i',
  'want','be','get','have','make','do','with','from','into','by','up','as',
  'it','its','that','this','will','can','about','after','become','new','own',
  'more','one','start','build','grow','learn','achieve','reach','create','run',
]);

function extractImageKeywords(goal: string): string {
  const words = goal.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  const keywords = words.filter(w => w.length > 3 && !STOP_WORDS.has(w));
  return (keywords.length ? keywords.slice(0, 3) : ['goal', 'inspiration']).join(',');
}

let _splashShown = false;

export default function HomeScreen() {
  const [allNorthStars, setAllNorthStars] = useState<NorthStar[]>([]);
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [whyDraft, setWhyDraft] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [goalImage, setGoalImage] = useState<string | null>(null);
  const [splashVisible, setSplashVisible] = useState(() => {
    const show = !_splashShown;
    _splashShown = true;
    return show;
  });
  const splashOpacity = useRef(new Animated.Value(0)).current;

  // Reload every time this screen comes into focus
  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    await restoreSession();
    if (!isLoggedIn()) {
      setLoading(false);
      router.replace('/login');
      return;
    }
    const [nsList, activeId] = await Promise.all([getNorthStars(), getActiveNorthStarId()]);
    setAllNorthStars(nsList);

    if (nsList.length === 0) {
      setLoading(false);
      router.replace('/onboarding');
      return;
    }

    const ns = nsList.find(n => n.id === activeId) ?? nsList[0];
    setNorthStar(ns);

    const [ms, cachedImg] = await Promise.all([getMilestones(ns.id), getGoalImage(ns.id)]);
    setMilestones(ms);

    if (cachedImg) {
      setGoalImage(cachedImg);
    } else if (ns.goal) {
      fetchGoalImage(ns.id, ns.goal);
    }
    setLoading(false);
  };

  const switchNorthStar = async (ns: NorthStar) => {
    await setActiveNorthStarId(ns.id);
    setNorthStar(ns);
    setGoalImage(null);
    const [ms, img] = await Promise.all([getMilestones(ns.id), getGoalImage(ns.id)]);
    setMilestones(ms);
    if (img) {
      setGoalImage(img);
    } else if (ns.goal) {
      fetchGoalImage(ns.id, ns.goal);
    }
  };

  const fetchGoalImage = async (nsId: string, goal: string) => {
    try {
      const keywords = extractImageKeywords(goal);
      const url = `https://source.unsplash.com/featured/400x400/?${encodeURIComponent(keywords)}`;
      const res = await fetch(url, { redirect: 'follow' });
      const stableUrl = res.url && res.url !== url ? res.url : url;
      setGoalImage(stableUrl);
      await saveGoalImage(nsId, stableUrl);
    } catch {
      // Silently fail
    }
  };

  // Splash animation
  const splashShownRef = useRef(false);
  if (splashVisible && !splashShownRef.current) {
    splashShownRef.current = true;
    Animated.timing(splashOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(splashOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start(() => {
          setSplashVisible(false);
        });
      }, 2800);
    });
  }

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
    setAllNorthStars(prev => prev.map(n => n.id === updated.id ? updated : n));
    setEditing(false);
    if (goalDraft.trim() !== northStar.goal) {
      setGoalImage(null);
      await saveGoalImage(northStar.id, '');
      fetchGoalImage(northStar.id, goalDraft.trim());
    }
  };

  const saveTargetDate = async (date: string) => {
    if (!northStar) return;
    const updated = { ...northStar, targetDate: date };
    await saveNorthStar(updated);
    setNorthStar(updated);
  };

  const handleReset = () => {
    confirmReset(async () => {
      if (allNorthStars.length <= 1) {
        // Last North Star — wipe everything and restart
        await clearAll();
        router.replace('/onboarding');
      } else {
        // Delete just this one, stay in the app
        const nextId = await deleteNorthStarAndData(northStar!.id);
        const remaining = allNorthStars.filter(n => n.id !== northStar!.id);
        setAllNorthStars(remaining);
        const next = remaining.find(n => n.id === nextId) ?? remaining[0];
        await switchNorthStar(next);
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Image source={require('../assets/north_star_logo.png')} style={styles.logoSpin} />
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
        {northStar ? (
          <>
            {/* ── North Star switcher ─────────────────────────────────────── */}
            {(allNorthStars.length > 1 || true) && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.nsSwitcher}
                contentContainerStyle={styles.nsSwitcherContent}
              >
                {allNorthStars.map(ns => (
                  <Pressable
                    key={ns.id}
                    style={[styles.nsTab, ns.id === northStar.id && styles.nsTabActive]}
                    onPress={() => ns.id !== northStar.id && switchNorthStar(ns)}
                  >
                    <Text
                      style={[styles.nsTabText, ns.id === northStar.id && styles.nsTabTextActive]}
                      numberOfLines={1}
                    >
                      {ns.goal.length > 22 ? ns.goal.slice(0, 22) + '…' : ns.goal}
                    </Text>
                  </Pressable>
                ))}
                <Pressable style={styles.nsAddBtn} onPress={() => router.push('/onboarding')}>
                  <Text style={styles.nsAddBtnText}>+ New Goal</Text>
                </Pressable>
              </ScrollView>
            )}

            {/* ── North Star card ─────────────────────────────────────────── */}
            <View style={styles.nsCard}>
              <View style={styles.nsCardHeader}>
                <Text style={styles.nsLabel}>YOUR NORTH STAR</Text>
                <Pressable style={styles.editBtn} onPress={openEdit}>
                  <Text style={styles.editBtnText}>✎  Edit</Text>
                </Pressable>
              </View>

              <View style={styles.nsGoalRow}>
                <View style={styles.goalImageContainer}>
                  {goalImage ? (
                    <Image source={{ uri: goalImage }} style={styles.goalImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.goalImagePlaceholder}>
                      <Text style={styles.goalImagePlaceholderText}>✦</Text>
                    </View>
                  )}
                </View>
                <View style={styles.nsGoalTextBlock}>
                  <Text style={styles.nsGoal}>{northStar.goal}</Text>
                  {!!northStar.why && <Text style={styles.nsWhy}>{northStar.why}</Text>}
                </View>
              </View>

              <Pressable style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateIcon}>◎</Text>
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
                <Text style={styles.resetText}>
                  {allNorthStars.length > 1 ? 'Remove this North Star' : 'Reset North Star'}
                </Text>
              </Pressable>
            </View>

            {/* ── Focus Mode ──────────────────────────────────────────────── */}
            {lockedIn ? (
              <Pressable style={styles.lockInCardWrapper} onPress={() => router.push('/plan')}>
                <LinearGradient
                  colors={gradients.focus}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.lockInCard}
                >
                  <Text style={styles.lockInLabel}>◎  FOCUS MODE</Text>
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
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable style={styles.lockInEmpty} onPress={() => router.push('/plan')}>
                <Text style={styles.lockInEmptyIcon}>◎</Text>
                <Text style={styles.lockInEmptyText}>Enter Focus Mode</Text>
                <Text style={styles.lockInEmptySub}>Zero in on one mini-goal at a time — go to the Action Plan to set your focus</Text>
              </Pressable>
            )}

            {/* ── Action buttons ───────────────────────────────────────────── */}
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
                <Text style={[styles.actionIcon, styles.actionIconTeal]}>◷</Text>
                <Text style={styles.actionLabel}>Timeline</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>

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

      {/* Splash overlay */}
      {splashVisible && (
        <Animated.View style={[styles.splash, { opacity: splashOpacity }]} pointerEvents="none">
          <Image source={require('../assets/north_star_logo.png')} style={styles.splashLogo} resizeMode="contain" />
          <View style={styles.splashQuoteBlock}>
            <BullseyeArrow size={42} color="#C9884A" />
            <Text style={styles.splashQuote}>A goal without a plan is just a dream.</Text>
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xxl + spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  logoSpin: { width: 200, height: 200, opacity: 0.8 },

  // North Star switcher
  nsSwitcher: { flexGrow: 0, marginBottom: spacing.md },
  nsSwitcherContent: { gap: spacing.xs, flexDirection: 'row', alignItems: 'center' },
  nsTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    maxWidth: 200,
  },
  nsTabActive: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary + '55',
  },
  nsTabText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  nsTabTextActive: { color: colors.primary },
  nsAddBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.blue + '55',
    backgroundColor: colors.card,
  },
  nsAddBtnText: { color: colors.blue, fontSize: 13, fontWeight: '600' },

  nsCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.lg },
  nsCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  nsLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  editBtn: { backgroundColor: colors.primaryDim, borderRadius: radius.full, paddingVertical: 4, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.primary + '44' },
  editBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  nsGoalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.sm },
  goalImageContainer: { flexShrink: 0, width: 72, height: 72, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  goalImage: { width: 72, height: 72 },
  goalImagePlaceholder: { width: 72, height: 72, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  goalImagePlaceholderText: { color: colors.primary, fontSize: 28 },
  nsGoalTextBlock: { flex: 1 },
  nsGoal: { color: colors.text, fontSize: 22, fontWeight: '700', lineHeight: 30, marginBottom: 4 },
  nsWhy: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  dateIcon: { fontSize: 14, color: colors.primary },
  dateText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  progressBar: { flex: 1, height: 6, backgroundColor: colors.cardBorder, borderRadius: radius.full, overflow: 'hidden', flexDirection: 'row' },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: radius.full },
  progressPct: { color: colors.primary, fontWeight: '700', fontSize: 14, minWidth: 36 },
  progressSub: { color: colors.muted, fontSize: 12 },
  cardDivider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: spacing.md },
  resetText: { color: colors.danger, fontSize: 13, textAlign: 'center' },

  lockInCardWrapper: { borderRadius: radius.xl, marginBottom: spacing.lg, overflow: 'hidden' },
  lockInCard: { borderRadius: radius.xl, padding: spacing.lg },
  lockInLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: spacing.sm },
  lockInTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 28, marginBottom: spacing.xs },
  lockInDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  lockInRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  lockInMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  lockInView: { color: colors.primary, fontSize: 13, fontWeight: '700' },

  lockInEmpty: {
    backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg,
    alignItems: 'center', borderWidth: 2, borderColor: colors.cardBorder, borderStyle: 'dashed', gap: spacing.xs,
  },
  lockInEmptyIcon: { fontSize: 28, color: colors.primary, marginBottom: spacing.xs },
  actionIconTeal: { color: colors.primary },
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

  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'flex-start',
    paddingTop: '18%', zIndex: 100, gap: spacing.lg,
  },
  splashLogo: { width: 140, height: 140 },
  splashQuoteBlock: { alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  splashQuote: { color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 26, textAlign: 'center', letterSpacing: 0.2 },
});
