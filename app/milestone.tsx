import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getMilestones, saveMilestones } from '../lib/storage';
import { Milestone, Task } from '../lib/types';
import { colors, radius, spacing } from '../lib/theme';

export default function MilestoneDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [allMilestones, setAllMilestones] = useState<Milestone[]>([]);
  const [titleDraft, setTitleDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    const ms = await getMilestones();
    setAllMilestones(ms);
    const m = ms.find(m => m.id === id);
    if (m) {
      setMilestone(m);
      setTitleDraft(m.title);
      setNotesDraft(m.notes ?? '');
    }
  };

  const autoSave = (title: string, notes: string) => {
    setSaved(false);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      persist(title, notes);
    }, 800);
  };

  const persist = async (title: string, notes: string) => {
    if (!milestone) return;
    const updated = allMilestones.map(m =>
      m.id === milestone.id ? { ...m, title: title.trim() || m.title, notes } : m
    );
    await saveMilestones(updated);
    setAllMilestones(updated);
    setSaved(true);
  };

  const toggleTask = async (taskId: string) => {
    if (!milestone) return;
    const updatedMilestone = {
      ...milestone,
      tasks: milestone.tasks.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    };
    updatedMilestone.completed = updatedMilestone.tasks.every(t => t.completed);
    const updated = allMilestones.map(m => m.id === milestone.id ? updatedMilestone : m);
    setMilestone(updatedMilestone);
    setAllMilestones(updated);
    await saveMilestones(updated);
  };

  if (!milestone) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const done = milestone.tasks.filter(t => t.completed).length;
  const total = milestone.tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.savedLabel}>{saved ? '✓ Saved' : ''}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* Title */}
        <TextInput
          style={styles.titleInput}
          value={titleDraft}
          onChangeText={v => { setTitleDraft(v); autoSave(v, notesDraft); }}
          placeholder="Mini-goal title"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={200}
          spellCheck
        />

        {/* Progress */}
        {total > 0 && (
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { flex: pct }]} />
              <View style={{ flex: 100 - pct }} />
            </View>
            <Text style={styles.progressText}>{done}/{total} tasks · {pct}%</Text>
          </View>
        )}

        {/* Notes */}
        <Text style={styles.sectionLabel}>NOTES</Text>
        <TextInput
          style={styles.notesInput}
          value={notesDraft}
          onChangeText={v => { setNotesDraft(v); autoSave(titleDraft, v); }}
          placeholder="Add notes, context, ideas… anything about this goal."
          placeholderTextColor={colors.muted}
          multiline
          spellCheck
          textAlignVertical="top"
        />

        {/* Tasks */}
        {milestone.tasks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>TASKS</Text>
            <View style={styles.tasksList}>
              {milestone.tasks.map(task => (
                <Pressable
                  key={task.id}
                  style={styles.taskRow}
                  onPress={() => toggleTask(task.id)}
                >
                  <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
                    {task.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
                    {task.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.muted },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: { paddingVertical: 4 },
  backBtnText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  savedLabel: { color: colors.success, fontSize: 12, fontWeight: '600' },

  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 80 },

  titleInput: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: { height: 6, backgroundColor: colors.primary },
  progressText: { color: colors.primary, fontSize: 12, fontWeight: '600' },

  sectionLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },

  notesInput: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 16,
    lineHeight: 26,
    padding: spacing.md,
    minHeight: 200,
    marginBottom: spacing.lg,
  },

  tasksList: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.bg, fontSize: 12, fontWeight: '700' },
  taskTitle: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22 },
  taskTitleDone: { color: colors.muted, textDecorationLine: 'line-through' },
});
