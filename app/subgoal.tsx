import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getMilestones, saveMilestones, getNorthStar } from '../lib/storage';
import { Milestone, SubGoal, Task } from '../lib/types';
import { TaskItem } from '../components/TaskItem';
import { colors, radius, spacing } from '../lib/theme';

export default function SubGoalScreen() {
  const { milestoneId, subGoalId } = useLocalSearchParams<{ milestoneId: string; subGoalId: string }>();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [parentMilestone, setParentMilestone] = useState<Milestone | null>(null);
  const [subGoal, setSubGoal] = useState<SubGoal | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const ms = await getMilestones();
    setMilestones(ms);
    const parent = ms.find((m) => m.id === milestoneId) ?? null;
    setParentMilestone(parent);
    const sg = parent?.subGoals?.find((s) => s.id === subGoalId) ?? null;
    setSubGoal(sg);
    if (sg) setTitleDraft(sg.title);
  };

  const saveSubGoal = async (updated: SubGoal) => {
    setSubGoal(updated);
    const updatedMilestones = milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return { ...m, subGoals: (m.subGoals ?? []).map((s) => s.id === subGoalId ? updated : s) };
    });
    setMilestones(updatedMilestones);
    await saveMilestones(updatedMilestones);
  };

  const commitTitle = () => {
    setEditingTitle(false);
    if (!subGoal) return;
    const t = titleDraft.trim();
    if (t && t !== subGoal.title) saveSubGoal({ ...subGoal, title: t });
    else setTitleDraft(subGoal.title);
  };

  const toggleTask = (taskId: string) => {
    if (!subGoal) return;
    const tasks = subGoal.tasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t);
    saveSubGoal({ ...subGoal, tasks });
  };

  const editTask = (taskId: string, title: string) => {
    if (!subGoal) return;
    const tasks = subGoal.tasks.map((t) => t.id === taskId ? { ...t, title } : t);
    saveSubGoal({ ...subGoal, tasks });
  };

  const deleteTask = (taskId: string) => {
    if (!subGoal) return;
    saveSubGoal({ ...subGoal, tasks: subGoal.tasks.filter((t) => t.id !== taskId) });
  };

  const moveTask = (taskId: string, dir: 'up' | 'down') => {
    if (!subGoal) return;
    const tasks = [...subGoal.tasks];
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (dir === 'up' && idx > 0) [tasks[idx - 1], tasks[idx]] = [tasks[idx], tasks[idx - 1]];
    if (dir === 'down' && idx < tasks.length - 1) [tasks[idx], tasks[idx + 1]] = [tasks[idx + 1], tasks[idx]];
    saveSubGoal({ ...subGoal, tasks: tasks.map((t, i) => ({ ...t, order: i })) });
  };

  const addTask = () => {
    if (!subGoal || !newTaskTitle.trim()) return;
    const newTask: Task = {
      id: `sgt_${Date.now()}`,
      milestoneId: subGoal.id,
      title: newTaskTitle.trim(),
      completed: false,
      order: subGoal.tasks.length,
    };
    saveSubGoal({ ...subGoal, tasks: [...subGoal.tasks, newTask] });
    setNewTaskTitle('');
    setAddingTask(false);
  };

  const deleteSubGoal = () => {
    Alert.alert('Delete sub-goal?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = milestones.map((m) => {
            if (m.id !== milestoneId) return m;
            return { ...m, subGoals: (m.subGoals ?? []).filter((s) => s.id !== subGoalId) };
          });
          await saveMilestones(updated);
          router.back();
        },
      },
    ]);
  };

  const promoteToMiniGoal = () => {
    Alert.alert(
      'Promote to Mini Goal?',
      'This moves the sub-goal to the main action plan as its own step.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote', onPress: async () => {
            if (!subGoal) return;
            const newId = `m${Date.now()}`;
            const newMilestone: Milestone = {
              id: newId,
              northStarId: parentMilestone?.northStarId ?? '',
              title: subGoal.title,
              description: '',
              order: milestones.length,
              completed: subGoal.tasks.length > 0 && subGoal.tasks.every((t) => t.completed),
              tasks: subGoal.tasks.map((t) => ({ ...t, milestoneId: newId })),
              subGoals: [],
            };
            const pruned = milestones.map((m) => {
              if (m.id !== milestoneId) return m;
              return { ...m, subGoals: (m.subGoals ?? []).filter((s) => s.id !== subGoalId) };
            });
            await saveMilestones([...pruned, newMilestone]);
            router.replace('/plan');
          },
        },
      ]
    );
  };

  if (!subGoal) return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Sub-goal not found.</Text>
    </View>
  );

  const done = subGoal.tasks.filter((t) => t.completed).length;
  const pct = subGoal.tasks.length > 0 ? Math.round((done / subGoal.tasks.length) * 100) : 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Breadcrumb */}
      <Text style={styles.breadcrumb}>
        ★ North Star  ›  {parentMilestone?.title}  ›  Sub-Goal
      </Text>

      {/* Title */}
      <View style={styles.titleCard}>
        <Text style={styles.titleLabel}>◆  SUB-GOAL</Text>
        {editingTitle ? (
          <TextInput
            style={styles.titleInput}
            value={titleDraft}
            onChangeText={setTitleDraft}
            onBlur={commitTitle}
            autoFocus
            multiline
            maxLength={200}
          />
        ) : (
          <Pressable onPress={() => { setTitleDraft(subGoal.title); setEditingTitle(true); }}>
            <Text style={styles.titleText}>{subGoal.title}  <Text style={styles.editHint}>✎</Text></Text>
          </Pressable>
        )}

        {/* Progress */}
        {subGoal.tasks.length > 0 && (
          <>
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { flex: pct }]} />
                <View style={{ flex: 100 - pct }} />
              </View>
              <Text style={styles.pct}>{pct}%</Text>
            </View>
            <Text style={styles.progressSub}>{done} of {subGoal.tasks.length} steps complete</Text>
          </>
        )}
      </View>

      {/* Steps */}
      <Text style={styles.stepsLabel}>STEPS</Text>
      <View style={styles.tasksList}>
        {subGoal.tasks.map((task, i) => (
          <TaskItem
            key={task.id}
            title={task.title}
            completed={task.completed}
            isFirst={i === 0}
            isLast={i === subGoal.tasks.length - 1}
            onToggle={() => toggleTask(task.id)}
            onEdit={(t) => editTask(task.id, t)}
            onDelete={() => deleteTask(task.id)}
            onMoveUp={() => moveTask(task.id, 'up')}
            onMoveDown={() => moveTask(task.id, 'down')}
          />
        ))}

        {subGoal.tasks.length === 0 && (
          <Text style={styles.emptyTasks}>No steps yet — add your first one below.</Text>
        )}
      </View>

      {/* Add step */}
      {addingTask ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            placeholder="New step…"
            placeholderTextColor={colors.muted}
            autoFocus
            maxLength={120}
            onSubmitEditing={addTask}
          />
          <Pressable onPress={addTask} style={styles.addConfirm}>
            <Text style={styles.addConfirmText}>Add</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.addBtn} onPress={() => setAddingTask(true)}>
          <Text style={styles.addBtnText}>+ Add step</Text>
        </Pressable>
      )}

      {/* Promote / Delete */}
      <Pressable style={styles.promoteBtn} onPress={promoteToMiniGoal}>
        <Text style={styles.promoteBtnText}>↑  Promote to Mini Goal</Text>
      </Pressable>

      <Pressable style={styles.deleteBtn} onPress={deleteSubGoal}>
        <Text style={styles.deleteBtnText}>Delete this sub-goal</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 60 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted },

  breadcrumb: { color: colors.muted, fontSize: 11, marginBottom: spacing.md, lineHeight: 16 },

  titleCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.blue + '44',
    marginBottom: spacing.lg,
  },
  titleLabel: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.sm },
  titleText: { color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 28, marginBottom: spacing.sm },
  editHint: { color: colors.muted, fontSize: 13, fontWeight: '400' },
  titleInput: { color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 28, borderBottomWidth: 1, borderBottomColor: colors.blue, paddingVertical: 4, marginBottom: spacing.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  progressBar: { flex: 1, height: 6, backgroundColor: colors.cardBorder, borderRadius: radius.full, overflow: 'hidden', flexDirection: 'row' },
  progressFill: { height: 6, backgroundColor: colors.blue, borderRadius: radius.full },
  pct: { color: colors.blue, fontWeight: '700', fontSize: 14 },
  progressSub: { color: colors.muted, fontSize: 12 },

  stepsLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.sm },
  tasksList: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.md, gap: 2 },
  emptyTasks: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.md },

  addRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  addInput: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, color: colors.text, fontSize: 14, padding: spacing.sm },
  addConfirm: { backgroundColor: colors.blue, borderRadius: radius.md, paddingHorizontal: spacing.md, justifyContent: 'center' },
  addConfirmText: { color: '#fff', fontWeight: '700' },
  addBtn: { marginBottom: spacing.xl },
  addBtnText: { color: colors.blue, fontWeight: '600', fontSize: 14 },

  promoteBtn: { marginTop: spacing.xl, backgroundColor: colors.card, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '55' },
  promoteBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  deleteBtn: { marginTop: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm },
  deleteBtnText: { color: colors.danger, fontSize: 13 },
});
