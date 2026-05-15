import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius, spacing } from '../lib/theme';

function addDays(d: Date, n: number) {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const QUICK = [
  { label: 'Now', days: 0 },
  { label: '3 Days', days: 3 },
  { label: '1 Week', days: 7 },
  { label: '3 Weeks', days: 21 },
];

interface Props {
  visible: boolean;
  current?: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

export function DatePickerModal({ visible, current, onSelect, onClose }: Props) {
  const [pickerDate, setPickerDate] = useState(() => {
    if (current) {
      const parsed = new Date(current);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  });

  const confirm = (d: Date) => {
    onSelect(formatDate(d));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Set Target Date</Text>

        {/* Quick options */}
        <View style={styles.quickRow}>
          {QUICK.map((q) => {
            const d = addDays(new Date(), q.days);
            return (
              <Pressable key={q.label} style={styles.quickBtn} onPress={() => confirm(d)}>
                <Text style={styles.quickLabel}>{q.label}</Text>
                <Text style={styles.quickDate}>
                  {q.days === 0 ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* Calendar picker */}
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="inline"
          minimumDate={new Date()}
          maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() + 5))}
          onChange={(_, date) => { if (date) setPickerDate(date); }}
          themeVariant="light"
          accentColor={colors.primary}
          style={styles.picker}
        />

        <Pressable style={styles.confirmBtn} onPress={() => confirm(pickerDate)}>
          <Text style={styles.confirmText}>Confirm  {formatDate(pickerDate)}</Text>
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
  },
  handle: { width: 36, height: 4, backgroundColor: colors.muted, borderRadius: 2, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: spacing.md },

  quickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.primaryDim,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  quickLabel: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  quickDate: { color: colors.muted, fontSize: 11, marginTop: 2 },

  divider: { height: 1, backgroundColor: colors.cardBorder, marginBottom: spacing.sm },

  picker: { alignSelf: 'center' },

  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  confirmText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  cancelBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  cancelText: { color: colors.muted, fontSize: 14 },
});
