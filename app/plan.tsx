import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { getMilestones, saveMilestones, getNorthStar, saveNorthStar } from '../lib/storage';
import { Milestone, NorthStar } from '../lib/types';
import { MilestoneCard } from '../components/MilestoneCard';
import { colors, radius, spacing } from '../lib/theme';
import { API } from '../lib/apiUrl';

export default function PlanScreen() {
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [addingStep, setAddingStep] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [ns, ms] = await Promise.all([getNorthStar(), getMilestones()]);
    setNorthStar(ns);
    setMilestones(ms);
  };

  const save = async (updated: Milestone[]) => {
    const reordered = updated.map((m, i) => ({ ...m, order: i }));
    setMilestones(reordered);
    await saveMilestones(reordered);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...milestones];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    save(updated);
  };

  const moveDown = (index: number) => {
    if (index === milestones.length - 1) return;
    const updated = [...milestones];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    save(updated);
  };

  const toggleTask = async (milestoneId: string, taskId: string) => {
    const updated = milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      const tasks = m.tasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t);
      return { ...m, tasks, completed: tasks.every((t) => t.completed) };
    });
    await save(updated);
  };

  const editMilestone = async (milestoneId: string, title: string) => {
    await save(milestones.map((m) => m.id === milestoneId ? { ...m, title } : m));
  };

  const editTask = async (milestoneId: string, taskId: string, title: string) => {
    await save(milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return { ...m, tasks: m.tasks.map((t) => t.id === taskId ? { ...t, title } : t) };
    }));
  };

  const deleteMilestone = (milestoneId: string) => {
    Alert.alert('Delete step?', 'This removes the step and all its tasks.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => save(milestones.filter((m) => m.id !== milestoneId)) },
    ]);
  };

  const deleteTask = async (milestoneId: string, taskId: string) => {
    await save(milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return { ...m, tasks: m.tasks.filter((t) => t.id !== taskId) };
    }));
  };

  const moveTask = async (milestoneId: string, taskId: string, dir: 'up' | 'down') => {
    await save(milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      const tasks = [...m.tasks];
      const idx = tasks.findIndex((t) => t.id === taskId);
      if (dir === 'up' && idx > 0) [tasks[idx - 1], tasks[idx]] = [tasks[idx], tasks[idx - 1]];
      if (dir === 'down' && idx < tasks.length - 1) [tasks[idx], tasks[idx + 1]] = [tasks[idx + 1], tasks[idx]];
      return { ...m, tasks: tasks.map((t, i) => ({ ...t, order: i })) };
    }));
  };

  const addTask = async (milestoneId: string, title: string) => {
    await save(milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      const newTask = { id: `task_${Date.now()}`, milestoneId: m.id, title, completed: false, order: m.tasks.length };
      return { ...m, tasks: [...m.tasks, newTask] };
    }));
  };

  const addSubGoal = async (milestoneId: string, title: string, generate: boolean) => {
    const milestone = milestones.find((m) => m.id === milestoneId);
    let tasks: any[] = [];

    if (generate && northStar) {
      try {
        const res = await fetch(`${API}/api/generate-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: northStar.goal,
            why: `This is a sub-goal under "${milestone?.title}": ${title}`,
            miniGoals: [title],
          }),
        });
        const data = await res.json();
        if (res.ok && data.milestones?.[0]?.tasks) {
          tasks = data.milestones[0].tasks.map((t: any, i: number) => ({
            id: `sgt_${Date.now()}_${i}`,
            milestoneId: `sg_${Date.now()}`,
            title: t.title,
            completed: false,
            order: i,
          }));
        }
      } catch {}
    }

    const newSubGoal = {
      id: `sg_${Date.now()}`,
      milestoneId,
      title,
      tasks,
    };

    await save(milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return { ...m, subGoals: [...(m.subGoals ?? []), newSubGoal] };
    }));
  };

  const promoteSubGoal = async (milestoneId: string, subGoalId: string) => {
    const parent = milestones.find((m) => m.id === milestoneId);
    const sg = parent?.subGoals?.find((s) => s.id === subGoalId);
    if (!sg) return;
    const newId = `m${Date.now()}`;
    const newMilestone: Milestone = {
      id: newId,
      northStarId: northStar?.id ?? '',
      title: sg.title,
      description: '',
      order: milestones.length,
      completed: sg.tasks.length > 0 && sg.tasks.every((t) => t.completed),
      tasks: sg.tasks.map((t) => ({ ...t, milestoneId: newId })),
      subGoals: [],
    };
    const pruned = milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      return { ...m, subGoals: (m.subGoals ?? []).filter((s) => s.id !== subGoalId) };
    });
    await save([...pruned, newMilestone]);
  };

  const setDate = async (milestoneId: string, date: string) => {
    await save(milestones.map((m) => m.id === milestoneId ? { ...m, targetDate: date } : m));
  };

  const lockInMilestone = async (milestoneId: string) => {
    if (!northStar) return;
    // Toggle: if already locked in, unlock; otherwise lock in this milestone
    const newLockedId = northStar.lockedInMilestoneId === milestoneId ? undefined : milestoneId;
    const updated = { ...northStar, lockedInMilestoneId: newLockedId };
    await saveNorthStar(updated);
    setNorthStar(updated);
  };

  const addStep = async () => {
    if (!newStepTitle.trim()) return;
    setAddingStep(true);
    try {
      const res = await fetch(`${API}/api/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: northStar?.goal ?? '',
          why: northStar?.why ?? '',
          miniGoals: [newStepTitle.trim()],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const newMilestone: Milestone = {
        ...data.milestones[0],
        id: `m${Date.now()}`,
        northStarId: northStar?.id ?? '',
        order: milestones.length,
      };
      await save([...milestones, newMilestone]);
      setShowAddModal(false);
      setNewStepTitle('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAddingStep(false);
    }
  };

  const addStepManually = async () => {
    if (!newStepTitle.trim()) return;
    const newMilestone: Milestone = {
      id: `m${Date.now()}`,
      northStarId: northStar?.id ?? '',
      title: newStepTitle.trim(),
      description: '',
      order: milestones.length,
      completed: false,
      tasks: [],
    };
    await save([...milestones, newMilestone]);
    setShowAddModal(false);
    setNewStepTitle('');
  };

  const allTasks = milestones.flatMap((m) => m.tasks);
  const doneTasks = allTasks.filter((t) => t.completed).length;

  if (milestones.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No plan yet. Set your North Star first.</Text>
        <Pressable style={styles.emptyBtn} onPress={() => router.replace('/setup')}>
          <Text style={styles.emptyBtnText}>Set North Star</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <Pressable style={styles.webBack} onPress={() => router.replace('/')}>
          <Text style={styles.webBackText}>← North Star</Text>
        </Pressable>
      )}
      {northStar && (
        <View style={styles.goalBanner}>
          <Text style={styles.goalLabel}>★  {northStar.goal}</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{milestones.length}</Text>
          <Text style={styles.statLabel}>Steps</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{allTasks.length}</Text>
          <Text style={styles.statLabel}>Tasks</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.success }]}>{doneTasks}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      <View style={styles.hintRow}>
        <Text style={styles.hint}>↑↓ reprioritize  ·  tap ✎ to edit  ·  + add task</Text>
        <Pressable style={styles.timelineBtn} onPress={() => router.push('/timeline')}>
          <Text style={styles.timelineBtnText}>📅 Timeline</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {milestones.map((m, i) => (
          <MilestoneCard
            key={m.id}
            milestone={m}
            index={i}
            total={milestones.length}
            onMoveUp={() => moveUp(i)}
            onMoveDown={() => moveDown(i)}
            onToggleTask={toggleTask}
            onEditMilestone={editMilestone}
            onEditTask={editTask}
            onDeleteMilestone={deleteMilestone}
            onDeleteTask={deleteTask}
            onMoveTask={moveTask}
            onAddTask={addTask}
            onSetDate={setDate}
            onAddSubGoal={addSubGoal}
            onPromoteSubGoal={promoteSubGoal}
            onLockIn={lockInMilestone}
            isLockedIn={northStar?.lockedInMilestoneId === m.id}
            northStarGoal={northStar?.goal ?? ''}
          />
        ))}

        <Pressable style={styles.supportersBtn} onPress={() => router.push('/supporters')}>
          <Text style={styles.supportersBtnText}>💬  Rally your supporters</Text>
        </Pressable>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal visible={showAddModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Add a New Step</Text>
          <TextInput
            style={styles.modalInput}
            value={newStepTitle}
            onChangeText={setNewStepTitle}
            placeholder="e.g. Research visa requirements"
            placeholderTextColor={colors.muted}
            autoFocus
            maxLength={120}
          />
          <Pressable
            style={[styles.modalBtn, (!newStepTitle.trim() || addingStep) && styles.modalBtnDisabled]}
            onPress={addStep}
            disabled={!newStepTitle.trim() || addingStep}
          >
            {addingStep
              ? <ActivityIndicator color={colors.bg} size="small" />
              : <Text style={styles.modalBtnText}>✦  Generate Tasks with AI</Text>}
          </Pressable>
          <Pressable
            style={[styles.modalBtnSecondary, !newStepTitle.trim() && styles.modalBtnDisabled]}
            onPress={addStepManually}
            disabled={!newStepTitle.trim()}
          >
            <Text style={styles.modalBtnSecondaryText}>Add Step Only (no tasks)</Text>
          </Pressable>
          <Pressable style={styles.modalCancel} onPress={() => { setShowAddModal(false); setNewStepTitle(''); }}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  webBack: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  webBackText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  emptyText: { color: colors.muted, fontSize: 16 },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 12, paddingHorizontal: 28 },
  emptyBtnText: { color: colors.bg, fontWeight: '700' },

  goalBanner: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '33',
  },
  goalLabel: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingBottom: 0 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statNum: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 1 },

  hintRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  hint: { flex: 1, color: colors.muted, fontSize: 11 },
  timelineBtn: { backgroundColor: colors.card, borderRadius: radius.full, paddingVertical: 5, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder },
  timelineBtnText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: 100 },

  supportersBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.xl,
  },
  supportersBtnText: { color: colors.text, fontWeight: '600', fontSize: 14 },

  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { color: colors.bg, fontSize: 28, fontWeight: '300', lineHeight: 34 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalInput: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 15,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalBtnDisabled: { opacity: 0.4 },
  modalBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  modalBtnSecondary: {
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  modalBtnSecondaryText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  modalCancel: { paddingVertical: spacing.md, alignItems: 'center' },
  modalCancelText: { color: colors.muted, fontSize: 14 },
});
