import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';

interface Props {
  title: string;
  completed: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onEdit: (newTitle: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function TaskItem({ title, completed, isFirst, isLast, onToggle, onEdit, onDelete, onMoveUp, onMoveDown }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  const openEdit = () => { setDraft(title); setEditing(true); };

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) onEdit(trimmed);
    else setDraft(title);
  };

  const cancel = () => { setEditing(false); setDraft(title); };

  return (
    <>
      <View style={styles.row}>
        {/* Reorder arrows */}
        <View style={styles.arrowCol}>
          <Pressable onPress={onMoveUp} disabled={isFirst} style={[styles.arrowBtn, isFirst && styles.arrowDisabled]}>
            <Text style={styles.arrowText}>▲</Text>
          </Pressable>
          <Pressable onPress={onMoveDown} disabled={isLast} style={[styles.arrowBtn, isLast && styles.arrowDisabled]}>
            <Text style={styles.arrowText}>▼</Text>
          </Pressable>
        </View>

        {/* Checkbox */}
        <Pressable style={[styles.check, completed && styles.checkDone]} onPress={onToggle}>
          {completed && <Text style={styles.checkMark}>✓</Text>}
        </Pressable>

        {/* Title */}
        <Text style={[styles.title, completed && styles.titleDone]}>{title}</Text>

        {/* Edit + delete */}
        <Pressable onPress={openEdit} style={styles.iconBtn}>
          <Text style={styles.editIcon}>✎</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.iconBtn}>
          <Text style={styles.deleteIcon}>✕</Text>
        </Pressable>
      </View>

      {/* Edit modal */}
      <Modal visible={editing} transparent animationType="slide" onRequestClose={cancel}>
        <Pressable style={styles.overlay} onPress={cancel} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kvAvoid}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetLabel}>Edit Task</Text>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              autoFocus
              multiline
              maxLength={200}
              placeholder="Task description…"
              placeholderTextColor={colors.muted}
              scrollEnabled
            />
            <View style={styles.actions}>
              <Pressable style={styles.cancelBtn} onPress={cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, !draft.trim() && styles.saveBtnDisabled]}
                onPress={commit}
                disabled={!draft.trim()}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  arrowCol: { gap: 1 },
  arrowBtn: { padding: 2 },
  arrowDisabled: { opacity: 0.15 },
  arrowText: { color: colors.muted, fontSize: 9 },
  check: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkMark: { color: colors.bg, fontSize: 10, fontWeight: '700' },
  title: { flex: 1, color: colors.text, fontSize: 13 },
  titleDone: { color: colors.muted, textDecorationLine: 'line-through' },
  iconBtn: { padding: 4 },
  editIcon: { color: colors.blue, fontSize: 13 },
  deleteIcon: { color: colors.muted, fontSize: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  kvAvoid: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
  },
  handle: { width: 36, height: 4, backgroundColor: colors.muted, borderRadius: 2, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
  sheetLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.blue + '88',
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
    padding: spacing.md,
    minHeight: 120,
    maxHeight: 240,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, backgroundColor: colors.card, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  cancelText: { color: colors.muted, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});
