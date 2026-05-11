import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getSupporters, saveSupporters, getNorthStar } from '../lib/storage';
import { Supporter, NorthStar } from '../lib/types';
import { colors, radius, spacing } from '../lib/theme';
import { API } from '../lib/apiUrl';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  return raw;
}

export default function SupportersScreen() {
  const [northStar, setNorthStar] = useState<NorthStar | null>(null);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const [ns, sup] = await Promise.all([getNorthStar(), getSupporters()]);
    setNorthStar(ns);
    setSupporters(sup);
  };

  const addSupporter = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required', 'Name and phone number are required.');
      return;
    }
    const formatted = formatPhone(phone.trim());
    if (!formatted.startsWith('+')) {
      Alert.alert('Invalid phone', 'Enter a US phone number (e.g. 555-867-5309).');
      return;
    }
    const newSupporter: Supporter = {
      id: `sup_${Date.now()}`,
      northStarId: northStar?.id ?? '',
      name: name.trim(),
      phone: formatted,
      relationship: relationship.trim() || 'Friend',
    };
    const updated = [...supporters, newSupporter];
    setSupporters(updated);
    await saveSupporters(updated);
    setName('');
    setPhone('');
    setRelationship('');
  };

  const removeSupporter = (id: string) => {
    Alert.alert('Remove supporter?', "They won't receive future check-ins.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = supporters.filter((s) => s.id !== id);
          setSupporters(updated);
          await saveSupporters(updated);
        },
      },
    ]);
  };

  const sendCheckIn = async (supporter: Supporter) => {
    if (!northStar) {
      Alert.alert('No North Star set', 'Set your goal first.');
      return;
    }
    setSendingId(supporter.id);
    try {
      const res = await fetch(`${API}/api/send-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: northStar.goal,
          supporterName: supporter.name,
          supporterPhone: supporter.phone,
          userName: 'your friend',
          progressSummary: 'working toward the goal',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSentIds((prev) => new Set([...prev, supporter.id]));
      Alert.alert('Sent! ✓', `"${data.preview}"`);
    } catch (err: any) {
      Alert.alert('Failed to send', err.message);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Your support circle gets AI-generated SMS check-ins encouraging them to cheer you on.
        </Text>

        {/* Add form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add a Supporter</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number (US)"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            value={relationship}
            onChangeText={setRelationship}
            placeholder="Relationship (e.g. Mom, Best Friend)"
            placeholderTextColor={colors.muted}
          />
          <Pressable
            style={[styles.addBtn, (!name.trim() || !phone.trim()) && styles.addBtnDisabled]}
            onPress={addSupporter}
            disabled={!name.trim() || !phone.trim()}
          >
            <Text style={styles.addBtnText}>Add to Circle</Text>
          </Pressable>
        </View>

        {/* Supporters list */}
        {supporters.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOUR CIRCLE  ({supporters.length})</Text>
            {supporters.map((s) => (
              <View key={s.id} style={styles.supporterRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{s.name[0].toUpperCase()}</Text>
                </View>
                <View style={styles.supporterInfo}>
                  <Text style={styles.supporterName}>{s.name}</Text>
                  <Text style={styles.supporterMeta}>{s.relationship} · {s.phone}</Text>
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    style={[styles.sendBtn, sentIds.has(s.id) && styles.sendBtnSent]}
                    onPress={() => sendCheckIn(s)}
                    disabled={sendingId === s.id}
                  >
                    {sendingId === s.id ? (
                      <ActivityIndicator size="small" color={colors.bg} />
                    ) : (
                      <Text style={styles.sendBtnText}>
                        {sentIds.has(s.id) ? '✓ Sent' : 'Send SMS'}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable onPress={() => removeSupporter(s.id)}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {supporters.length === 0 && (
          <View style={styles.emptyCircle}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>Add someone who'll cheer you on</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  cardTitle: { color: colors.text, fontWeight: '600', fontSize: 15, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: colors.bg, fontWeight: '700', fontSize: 14 },

  section: { marginBottom: spacing.lg },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing.md },

  supporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  supporterInfo: { flex: 1 },
  supporterName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  supporterMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sendBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 72,
    alignItems: 'center',
  },
  sendBtnSent: { backgroundColor: colors.success },
  sendBtnText: { color: colors.bg, fontWeight: '700', fontSize: 12 },
  removeBtn: { color: colors.muted, fontSize: 16, padding: spacing.xs },

  emptyCircle: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: colors.muted, fontSize: 14 },
});
