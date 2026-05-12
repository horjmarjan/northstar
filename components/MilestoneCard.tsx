import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Milestone } from '../lib/types';
import { colors, radius, spacing } from '../lib/theme';
import { TaskItem } from './TaskItem';
import { DatePickerModal } from './DatePickerModal';

const TASKS_VISIBLE = 3;

interface Props {
  milestone: Milestone;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleTask: (milestoneId: string, taskId: string) => void;
  onEditMilestone: (milestoneId: string, title: string) => void;
  onEditTask: (milestoneId: string, taskId: string, title: string) => void;
  onDeleteMilestone: (milestoneId: string) => void;
  onDeleteTask: (milestoneId: string, taskId: string) => void;
  onMoveTask: (milestoneId: string, taskId: string, dir: 'up' | 'down') => void;
  onAddTask: (milestoneId: string, title: string) => void;
  onSetDate: (milestoneId: string, date: string) => void;
  onAddSubGoal: (milestoneId: string, title: string, generate: boolean) => Promise<void>;
  onPromoteSubGoal: (milestoneId: string, subGoalId: string) => Promise<void>;
  onLockIn: (milestoneId: string) => void;
  isLockedIn: boolean;
  hasActiveLockIn: boolean;   // some OTHER step is locked in
  northStarGoal: string;
}

export function MilestoneCard({
  milestone, index, total,
  onMoveUp, onMoveDown,
  onToggleTask, onEditMilestone, onEditTask,
  onDeleteMilestone, onDeleteTask, onMoveTask, onAddTask,
  onSetDate, onAddSubGoal, onPromoteSubGoal, onLockIn, isLockedIn, hasActiveLockIn, northStarGoal,
}: Props) {
  // This card is blocked: something else is locked in
  const isOnDeck = hasActiveLockIn && !isLockedIn;
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(milestone.title);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showSubGoals, setShowSubGoals] = useState(false);
  const [addingSubGoal, setAddingSubGoal] = useState(false);
  const [newSubGoalTitle, setNewSubGoalTitle] = useState('');
  const [generatingSubGoal, setGeneratingSubGoal] = useState(false);

  const done = milestone.tasks.filter((t) => t.completed).length;
  const pct = milestone.tasks.length > 0 ? Math.round((done / milestone.tasks.length) * 100) : 0;
  const visibleTasks = expanded ? milestone.tasks : milestone.tasks.slice(0, TASKS_VISIBLE);
  const hiddenCount = milestone.tasks.length - TASKS_VISIBLE;

  const commitTitle = () => {
    setEditingTitle(false);
    const t = titleDraft.trim();
    if (t && t !== milestone.title) onEditMilestone(milestone.id, t);
    else setTitleDraft(milestone.title);
  };


  const submitNewTask = () => {
    const t = newTaskTitle.trim();
    if (t) onAddTask(milestone.id, t);
    setNewTaskTitle('');
    setAddingTask(false);
  };

  const submitSubGoal = async (generate: boolean) => {
    const t = newSubGoalTitle.trim();
    if (!t) return;
    setGeneratingSubGoal(true);
    await onAddSubGoal(milestone.id, t, generate);
    setNewSubGoalTitle('');
    setAddingSubGoal(false);
    setShowSubGoals(true);
    setGeneratingSubGoal(false);
  };

  return (
    <View style={[
      styles.card,
      milestone.completed && styles.cardDone,
      isLockedIn && styles.cardLockedIn,
      isOnDeck && styles.cardOnDeck,
    ]}>
      {/* Locked-in banner */}
      {isLockedIn && (
        <View style={styles.lockedInBanner}>
          <Text style={styles.lockedInBannerText}>🔒  CURRENT FOCUS</Text>
        </View>
      )}
      {isOnDeck && (
        <View style={styles.onDeckBanner}>
          <Text style={styles.onDeckBannerText}>⏳  on deck</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.priorityCol}>
          <Pressable onPress={onMoveUp} style={[styles.arrowBtn, index === 0 && styles.arrowOff]} disabled={index === 0}>
            <Text style={styles.arrowText}>▲</Text>
          </Pressable>
          <View style={styles.badge}><Text style={styles.badgeNum}>{index + 1}</Text></View>
          <Pressable onPress={onMoveDown} style={[styles.arrowBtn, index === total - 1 && styles.arrowOff]} disabled={index === total - 1}>
            <Text style={styles.arrowText}>▼</Text>
          </Pressable>
        </View>

        <View style={styles.titleBlock}>
          {editingTitle ? (
            <TextInput style={styles.titleInput} value={titleDraft} onChangeText={setTitleDraft} onBlur={commitTitle} autoFocus maxLength={80} />
          ) : (
            <Pressable onPress={() => { setTitleDraft(milestone.title); setEditingTitle(true); }}>
              <Text style={styles.title}>{milestone.title}  <Text style={styles.editHint}>✎</Text></Text>
            </Pressable>
          )}
          <Pressable onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateLabel}>
              {milestone.targetDate ? `📅  ${milestone.targetDate}` : '+ Set target date'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.rightCol}>
          <Text style={[styles.pct, isLockedIn && styles.pctLockedIn]}>{pct}%</Text>
          <Pressable onPress={() => onDeleteMilestone(milestone.id)} style={styles.iconBtn}>
            <Text style={styles.deleteIcon}>🗑</Text>
          </Pressable>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { flex: pct }]} />
        <View style={{ flex: 100 - pct }} />
      </View>

      {/* Tasks */}
      <View style={styles.tasks}>
        {visibleTasks.map((task, i) => (
          <TaskItem
            key={task.id}
            title={task.title}
            completed={task.completed}
            isFirst={i === 0}
            isLast={i === visibleTasks.length - 1}
            onToggle={() => onToggleTask(milestone.id, task.id)}
            onEdit={(t) => onEditTask(milestone.id, task.id, t)}
            onDelete={() => onDeleteTask(milestone.id, task.id)}
            onMoveUp={() => onMoveTask(milestone.id, task.id, 'up')}
            onMoveDown={() => onMoveTask(milestone.id, task.id, 'down')}
          />
        ))}
      </View>

      {/* Show more / less */}
      {hiddenCount > 0 && (
        <Pressable onPress={() => setExpanded(!expanded)} style={styles.showMore}>
          <Text style={styles.showMoreText}>{expanded ? 'Show less' : `Show ${hiddenCount} more task${hiddenCount > 1 ? 's' : ''}`}</Text>
        </Pressable>
      )}

      {/* Add task */}
      <DatePickerModal
        visible={showDatePicker}
        current={milestone.targetDate}
        onSelect={(date) => onSetDate(milestone.id, date)}
        onClose={() => setShowDatePicker(false)}
      />

      {addingTask ? (
        <View style={styles.addTaskRow}>
          <TextInput
            style={styles.addTaskInput}
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            placeholder="New task…"
            placeholderTextColor={colors.muted}
            autoFocus
            maxLength={120}
            onBlur={submitNewTask}
            onSubmitEditing={submitNewTask}
          />
          <Pressable onPress={submitNewTask} style={styles.addTaskConfirm}>
            <Text style={styles.addTaskConfirmText}>Add</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setAddingTask(true)} style={styles.addTaskBtn}>
          <Text style={styles.addTaskBtnText}>+ Add task</Text>
        </Pressable>
      )}

      {/* Sub-Goals */}
      <View style={styles.subGoalsDivider} />
      <Pressable style={styles.subGoalsHeader} onPress={() => setShowSubGoals(!showSubGoals)}>
        <Text style={styles.subGoalsHeaderText}>
          ◆  Sub-Goals
          {(milestone.subGoals?.length ?? 0) > 0 ? `  (${milestone.subGoals!.length})` : ''}
        </Text>
        <Text style={styles.subGoalsChevron}>{showSubGoals ? '▲' : '▼'}</Text>
      </Pressable>

      {showSubGoals && (
        <View style={styles.subGoalsList}>
          {(milestone.subGoals ?? []).map((sg) => (

            <Pressable
              key={sg.id}
              style={styles.subGoalRow}
              onPress={() => router.push({ pathname: '/subgoal', params: { milestoneId: milestone.id, subGoalId: sg.id } })}
            >
              <View style={styles.subGoalDot} />
              <View style={styles.subGoalInfo}>
                <Text style={styles.subGoalTitle}>{sg.title}</Text>
                <Text style={styles.subGoalMeta}>
                  {sg.tasks.length > 0
                    ? `${sg.tasks.filter(t => t.completed).length}/${sg.tasks.length} steps`
                    : 'No steps yet'}
                </Text>
              </View>
              <Pressable
                style={styles.promoteBtn}
                onPress={(e) => { e.stopPropagation(); onPromoteSubGoal(milestone.id, sg.id); }}
                hitSlop={8}
              >
                <Text style={styles.promoteBtnText}>↑</Text>
              </Pressable>
              <Text style={styles.subGoalArrow}>›</Text>
            </Pressable>
          ))}

          {addingSubGoal ? (
            <View style={styles.addSubGoalBox}>
              <TextInput
                style={styles.addSubGoalInput}
                value={newSubGoalTitle}
                onChangeText={setNewSubGoalTitle}
                placeholder="e.g. Salesforce Admin for media companies"
                placeholderTextColor={colors.muted}
                autoFocus
                maxLength={150}
              />
              {generatingSubGoal ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.generatingText}>Generating steps…</Text>
                </View>
              ) : (
                <View style={styles.subGoalActions}>
                  <Pressable
                    style={[styles.sgBtn, styles.sgBtnPrimary, !newSubGoalTitle.trim() && styles.sgBtnDisabled]}
                    onPress={() => submitSubGoal(true)}
                    disabled={!newSubGoalTitle.trim()}
                  >
                    <Text style={styles.sgBtnPrimaryText}>✦ Generate Steps</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.sgBtn, !newSubGoalTitle.trim() && styles.sgBtnDisabled]}
                    onPress={() => submitSubGoal(false)}
                    disabled={!newSubGoalTitle.trim()}
                  >
                    <Text style={styles.sgBtnText}>Add Only</Text>
                  </Pressable>
                  <Pressable style={styles.sgBtn} onPress={() => { setAddingSubGoal(false); setNewSubGoalTitle(''); }}>
                    <Text style={styles.sgBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <Pressable style={styles.addSubGoalBtn} onPress={() => setAddingSubGoal(true)}>
              <Text style={styles.addSubGoalBtnText}>+ Add sub-goal idea</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Lock In footer */}
      {isLockedIn ? (
        <View style={styles.lockInFooter}>
          <View style={styles.lockInFooterLeft}>
            <Text style={styles.lockInFooterMsg}>You're locked in. Stay focused. 💪</Text>
          </View>
          <Pressable onPress={() => onLockIn(milestone.id)} style={styles.unlockBtn}>
            <Text style={styles.unlockBtnText}>Unlock</Text>
          </Pressable>
        </View>
      ) : !hasActiveLockIn ? (
        <Pressable style={styles.lockInTrigger} onPress={() => onLockIn(milestone.id)}>
          <Text style={styles.lockInTriggerText}>🔒  Lock In on your next mini-goal</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  cardDone: { borderColor: colors.success, opacity: 0.75 },
  cardLockedIn: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardOnDeck: { opacity: 0.4 },

  lockedInBanner: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  lockedInBannerText: { color: colors.bg, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

  onDeckBanner: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  onDeckBannerText: { color: colors.muted, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  priorityCol: { alignItems: 'center', gap: 2 },
  arrowBtn: { padding: 3 },
  arrowOff: { opacity: 0.15 },
  arrowText: { color: colors.primary, fontSize: 10 },
  badge: { width: 22, height: 22, borderRadius: radius.full, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  badgeNum: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  titleBlock: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  editHint: { color: colors.muted, fontSize: 11, fontWeight: '400' },
  titleInput: { color: colors.text, fontSize: 15, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 2, marginBottom: 3 },
  dateLabel: { color: colors.blue, fontSize: 12 },
  rightCol: { alignItems: 'center', gap: spacing.xs },
  pct: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  pctLockedIn: { color: colors.primary, fontWeight: '800' },
  iconBtn: { padding: 4 },
  deleteIcon: { fontSize: 14 },
  progressBar: { height: 3, backgroundColor: colors.cardBorder, borderRadius: radius.full, marginBottom: spacing.sm, overflow: 'hidden', flexDirection: 'row' },
  progressFill: { height: 3, backgroundColor: colors.primary, borderRadius: radius.full },
  tasks: { gap: 2 },
  showMore: { paddingVertical: spacing.xs, marginTop: 2 },
  showMoreText: { color: colors.blue, fontSize: 12 },
  addTaskBtn: { paddingTop: spacing.sm },
  addTaskBtnText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  addTaskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  addTaskInput: { flex: 1, backgroundColor: colors.inputBg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.cardBorder, color: colors.text, fontSize: 13, paddingVertical: 6, paddingHorizontal: spacing.sm },
  addTaskConfirm: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: spacing.sm },
  addTaskConfirmText: { color: colors.bg, fontWeight: '700', fontSize: 12 },

  subGoalsDivider: { height: 1, backgroundColor: colors.cardBorder, marginTop: spacing.md, marginBottom: spacing.sm },
  subGoalsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subGoalsHeaderText: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  subGoalsChevron: { color: colors.muted, fontSize: 10 },
  subGoalsList: { marginTop: spacing.sm, gap: spacing.xs },
  subGoalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.inputBg, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder },
  subGoalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
  subGoalInfo: { flex: 1 },
  subGoalTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  subGoalMeta: { color: colors.muted, fontSize: 11, marginTop: 1 },
  promoteBtn: { backgroundColor: colors.primaryDim, borderRadius: radius.full, paddingVertical: 3, paddingHorizontal: 7, borderWidth: 1, borderColor: colors.primary + '44' },
  promoteBtnText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  subGoalArrow: { color: colors.muted, fontSize: 18 },
  addSubGoalBtn: { paddingVertical: spacing.xs },
  addSubGoalBtnText: { color: colors.blue, fontSize: 12, fontWeight: '600' },
  addSubGoalBox: { backgroundColor: colors.inputBg, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, gap: spacing.sm },
  addSubGoalInput: { color: colors.text, fontSize: 13, borderBottomWidth: 1, borderBottomColor: colors.blue, paddingVertical: 4 },
  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  generatingText: { color: colors.muted, fontSize: 12 },
  subGoalActions: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  sgBtn: { backgroundColor: colors.card, borderRadius: radius.full, paddingVertical: 5, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder },
  sgBtnPrimary: { backgroundColor: colors.primaryDim, borderColor: colors.primary + '44' },
  sgBtnDisabled: { opacity: 0.4 },
  sgBtnPrimaryText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  sgBtnText: { color: colors.muted, fontSize: 11 },

  // Lock In footer
  lockInTrigger: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    alignItems: 'center',
  },
  lockInTriggerText: { color: colors.muted, fontSize: 13, fontWeight: '600' },

  lockInFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primary + '44',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockInFooterLeft: { flex: 1 },
  lockInFooterMsg: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  unlockBtn: {
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary + '55',
    backgroundColor: colors.primaryDim,
  },
  unlockBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
});
