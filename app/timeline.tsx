import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getNorthStar, getMilestones } from '../lib/storage';
import { NorthStar, Milestone } from '../lib/types';
import { colors, radius, spacing } from '../lib/theme';

function milestoneStatus(m: Milestone): 'done' | 'active' | 'future' {
  if (m.completed) return 'done';
  const hasDone = m.tasks.some((t) => t.completed);
  return hasDone ? 'active' : 'future';
}

export default function TimelineScreen() {
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    (async () => {
      const [ns, ms] = await Promise.all([getNorthStar(), getMilestones()]);
      setNorthStar(ns);
      setMilestones(ms);
    })();
  }, []);

  const allTasks = milestones.flatMap((m) => m.tasks);
  const doneTasks = allTasks.filter((t) => t.completed).length;
  const overallPct = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Overall progress */}
      {northStar && (
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>★  NORTH STAR</Text>
          <Text style={styles.heroGoal}>{northStar.goal}</Text>
          <View style={styles.heroProgressRow}>
            <View style={styles.heroBar}>
              <View style={[styles.heroFill, { flex: overallPct }]} />
              <View style={{ flex: 100 - overallPct }} />
            </View>
            <Text style={styles.heroPct}>{overallPct}%</Text>
          </View>
          <Text style={styles.heroSub}>{doneTasks} of {allTasks.length} milestones complete</Text>
        </View>
      )}

      {/* Timeline */}
      <Text style={styles.sectionLabel}>ROADMAP</Text>

      {milestones.map((m, i) => {
        const status = milestoneStatus(m);
        const done = m.tasks.filter((t) => t.completed).length;
        const pct = m.tasks.length > 0 ? Math.round((done / m.tasks.length) * 100) : 0;
        const isLast = i === milestones.length - 1;

        const dotColor = status === 'done' ? colors.success : status === 'active' ? colors.primary : colors.muted;
        const lineColor = status === 'done' ? colors.success : colors.cardBorder;

        return (
          <View key={m.id} style={styles.timelineRow}>
            {/* Left: connector + dot */}
            <View style={styles.connectorCol}>
              <View style={[styles.dot, { backgroundColor: dotColor, borderColor: dotColor }]}>
                {status === 'done' && <Text style={styles.dotCheck}>✓</Text>}
                {status === 'active' && <Text style={styles.dotActive}>●</Text>}
                {status === 'future' && <Text style={styles.dotNum}>{i + 1}</Text>}
              </View>
              {!isLast && <View style={[styles.line, { backgroundColor: lineColor }]} />}
            </View>

            {/* Right: content */}
            <View style={[styles.milestoneBox, isLast && { marginBottom: spacing.xxl }]}>
              <View style={styles.milestoneHeader}>
                <Text style={[styles.milestoneTitle, status === 'done' && styles.milestoneDone]}>
                  {m.title}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: dotColor + '22', borderColor: dotColor + '44' }]}>
                  <Text style={[styles.statusText, { color: dotColor }]}>
                    {status === 'done' ? 'Done' : status === 'active' ? 'In Progress' : 'Upcoming'}
                  </Text>
                </View>
              </View>

              {m.targetDate ? (
                <Text style={styles.dateTag}>◷  {m.targetDate}</Text>
              ) : (
                <Text style={styles.noDate}>No date set</Text>
              )}

              {m.tasks.length > 0 && (
                <>
                  <View style={styles.taskBar}>
                    <View style={[styles.taskFill, { flex: pct }]} />
                    <View style={{ flex: 100 - pct }} />
                  </View>
                  <Text style={styles.taskCount}>{done}/{m.tasks.length} milestones · {pct}%</Text>
                </>
              )}

              {m.tasks.length > 0 && (
                <View style={styles.taskList}>
                  {m.tasks.slice(0, 3).map((t) => (
                    <View key={t.id} style={styles.taskRow}>
                      <View style={[styles.taskDot, t.completed && styles.taskDotDone]} />
                      <Text style={[styles.taskTitle, t.completed && styles.taskTitleDone]}>{t.title}</Text>
                    </View>
                  ))}
                  {m.tasks.length > 3 && (
                    <Text style={styles.moreTasks}>+{m.tasks.length - 3} more milestones</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },

  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    marginBottom: spacing.xl,
  },
  heroLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.xs },
  heroGoal: { color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 26, marginBottom: spacing.md },
  heroProgressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  heroBar: { flex: 1, height: 8, backgroundColor: colors.cardBorder, borderRadius: radius.full, overflow: 'hidden', flexDirection: 'row' },
  heroFill: { height: 8, backgroundColor: colors.primary, borderRadius: radius.full },
  heroPct: { color: colors.primary, fontWeight: '700', fontSize: 16, minWidth: 40 },
  heroSub: { color: colors.muted, fontSize: 12 },

  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.lg },

  timelineRow: { flexDirection: 'row', gap: spacing.md },

  connectorCol: { alignItems: 'center', width: 32 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    zIndex: 1,
  },
  dotCheck: { color: colors.bg, fontWeight: '700', fontSize: 13 },
  dotActive: { color: colors.primary, fontSize: 10 },
  dotNum: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  line: { width: 2, flex: 1, marginTop: 2, marginBottom: -2, minHeight: 24 },

  milestoneBox: { flex: 1, paddingBottom: spacing.xl },
  milestoneHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs, flexWrap: 'wrap' },
  milestoneTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  milestoneDone: { color: colors.muted, textDecorationLine: 'line-through' },
  statusBadge: { borderRadius: radius.full, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },

  dateTag: { color: colors.primary, fontSize: 12, marginBottom: spacing.sm },
  noDate: { color: colors.cardBorder, fontSize: 12, marginBottom: spacing.sm },

  taskBar: { height: 3, backgroundColor: colors.cardBorder, borderRadius: radius.full, marginBottom: 3, overflow: 'hidden', flexDirection: 'row' },
  taskFill: { height: 3, backgroundColor: colors.primary, borderRadius: radius.full },
  taskCount: { color: colors.muted, fontSize: 11, marginBottom: spacing.sm },

  taskList: { gap: 4 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.muted },
  taskDotDone: { backgroundColor: colors.success },
  taskTitle: { color: colors.muted, fontSize: 12, flex: 1 },
  taskTitleDone: { textDecorationLine: 'line-through', color: colors.cardBorder },
  moreTasks: { color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 2 },
});
