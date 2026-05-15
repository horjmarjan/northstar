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
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newTaskRef = useRef<TextInput>(null);

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

  const persist = async (title: string, notes: string, tasks?: Task[]) => {
    if (!milestone) return;
    const updatedTasks = tasks ?? milestone.tasks;
    const updatedMilestone = {
      ...milestone,
      title: title.trim() || milestone.title,
      notes,
      tasks: updatedTasks,
      completed: updatedTasks.length > 0 ? updatedTasks.every(t => t.completed) : milestone.completed,
    };
    const updated = allMilestones.map(m => m.id === milestone.id ? updatedMilestone : m);
    await saveMilestones(updated);
    setAllMilestones(updated);
    setMilestone(updatedMilestone);
    setSaved(true);
  };

  const toggleTask = async (taskId: string) => {
    if (!milestone) return;
    const updatedTasks = milestone.tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const updatedMilestone = {
      ...milestone,
      tasks: updatedTasks,
      completed: updatedTasks.every(t => t.completed),
    };
    const updated = allMilestones.map(m => m.id === milestone.id ? updatedMilestone : m);
    setMilestone(updatedMilestone);
    setAllMilestones(updated);
    await saveMilestones(updated);
    setSaved(true);
  };

  const addTask = async () => {
    const text = newTaskText.trim();
    if (!text || !milestone) return;
    const newTask: Task = {
      id: `task_${Date.now()}`,
      milestoneId: milestone.id,
      title: text,
      completed: false,
      order: milestone.tasks.length,
    };
    const updatedTasks = [...milestone.tasks, newTask];
    setNewTaskText('');
    setShowAddTask(false);
    await persist(titleDraft, notesDraft, updatedTasks);
  };

  const deleteTask = async (taskId: string) => {
    if (!milestone) return;
    const updatedTasks = milestone.tasks.filter(t => t.id !== taskId);
    await persist(titleDraft, notesDraft, updatedTasks);
  };

  const openAddTask = () => {
    setShowAddTask(true);
    setTimeout(() => newTaskRef.current?.focus(), 50);
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
  const isComplete = total > 0 && done === total;

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
        {isComplete ? (
          <View style={styles.completeBadge}>
            <Text style={styles.completeBadgeText}>✓ Complete</Text>
          </View>
        ) : (
          <Text style={styles.savedLabel}>{saved ? '✓ Saved' : ''}</Text>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* Completion banner */}
        {isComplete && (
          <View style={styles.completeBanner}>
            <Text style={styles.completeBannerText}>🎉 Mini-goal complete!</Text>
            <Text style={styles.completeBannerSub}>All tasks finished. Nice work.</Text>
          </View>
        )}

        {/* Title */}
        <TextInput
          style={[styles.titleInput, isComplete && styles.titleInputDone]}
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
              <View style={[styles.progressFill, { flex: pct }, isComplete && styles.progressFillDone]} />
              <View style={{ flex: 100 - pct }} />
            </View>
            <Text style={[styles.progressText, isComplete && styles.progressTextDone]}>
              {done}/{total} tasks · {pct}%
            </Text>
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
        <View style={styles.tasksSectionHeader}>
          <Text style={styles.sectionLabel}>TASKS</Text>
          <Pressable style={styles.addTaskBtn} onPress={openAddTask}>
            <Text style={styles.addTaskBtnText}>+ Add Task</Text>
          </Pressable>
        </View>

        {(milestone.tasks.length > 0 || showAddTask) && (
          <View style={styles.tasksList}>
            {milestone.tasks.map((task, idx) => (
              <View
                key={task.id}
                style={[
                  styles.taskRow,
                  idx === milestone.tasks.length - 1 && !showAddTask && styles.taskRowLast,
                ]}
              >
                <Pressable
                  style={[styles.checkbox, task.completed && styles.checkboxDone]}
                  onPress={() => toggleTask(task.id)}
                >
                  {task.completed && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
                <Text
                  style={[styles.taskTitle, task.completed && styles.taskTitleDone]}
                  onPress={() => toggleTask(task.id)}
                >
                  {task.title}
                </Text>
                <Pressable style={styles.deleteTaskBtn} onPress={() => deleteTask(task.id)}>
                  <Text style={styles.deleteTaskBtnText}>✕</Text>
                </Pressable>
              </View>
            ))}

            {showAddTask && (
              <View style={[styles.taskRow, styles.taskRowLast, styles.addTaskRow]}>
                <View style={styles.checkboxEmpty} />
                <TextInput
                  ref={newTaskRef}
                  style={styles.newTaskInput}
                  value={newTaskText}
                  onChangeText={setNewTaskText}
                  placeholder="New task…"
                  placeholderTextColor={colors.muted}
                  spellCheck
                  returnKeyType="done"
                  onSubmitEditing={addTask}
                  onBlur={() => {
                    if (!newTaskText.trim()) setShowAddTask(false);
                  }}
                />
                <Pressable style={styles.addTaskConfirmBtn} onPress={addTask}>
                  <Text style={styles.addTaskConfirmText}>Add</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {milestone.tasks.length === 0 && !showAddTask && (
          <Pressable style={styles.emptyTasksPlaceholder} onPress={openAddTask}>
            <Text style={styles.emptyTasksText}>Tap "+ Add Task" to break this goal into steps</Text>
          </Pressable>
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

  completeBadge: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  completeBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  completeBanner: {
    backgroundColor: colors.primaryDim,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  completeBannerText: { color: colors.primary, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  completeBannerSub: { color: colors.teal, fontSize: 14 },

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
  titleInputDone: { color: colors.muted },

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
  progressFillDone: { backgroundColor: colors.teal },
  progressText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  progressTextDone: { color: colors.teal },

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
    minHeight: 140,
    marginBottom: spacing.lg,
  },

  tasksSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  addTaskBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: colors.primaryDim,
    borderRadius: radius.full,
  },
  addTaskBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  tasksList: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  taskRowLast: { borderBottomWidth: 0 },
  addTaskRow: { paddingVertical: spacing.xs },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.bg, fontSize: 12, fontWeight: '700' },
  taskTitle: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22 },
  taskTitleDone: { color: colors.muted, textDecorationLine: 'line-through' },

  deleteTaskBtn: {
    padding: 4,
    marginLeft: 4,
  },
  deleteTaskBtnText: { color: colors.muted, fontSize: 13 },

  newTaskInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 6,
  },
  addTaskConfirmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  addTaskConfirmText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyTasksPlaceholder: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyTasksText: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
