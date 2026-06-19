import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { getSevens, saveSevens } from '../lib/storage';
import { SevenSevenSeven } from '../lib/types';
import { colors, gradients, radius, spacing } from '../lib/theme';

type Layer = {
  key: 'people' | 'places' | 'behaviors';
  num: string;
  title: string;
  intro: string;
  placeholders: string[];
};

const LAYERS: Layer[] = [
  {
    key: 'people',
    num: '1',
    title: 'Seven People',
    intro:
      'Write down — or simply reflect on — the seven people who take up the most space in your mind. People you live with, work with, or people from your past: someone who hurt you, someone you miss, someone whose voice still echoes inside you. This isn’t about good or bad. It’s about noticing who really lives in your inner world.',
    placeholders: [
      'Someone you see every day',
      'Someone you live with',
      'Someone you work with',
      'Someone from your past',
      'Someone you miss',
      'A voice that still echoes',
      'Anyone else on your mind',
    ],
  },
  {
    key: 'places',
    num: '2',
    title: 'Seven Places',
    intro:
      'The seven places where you spend most of your time. Your home, workplace, car, phone, the gym, a coffee shop, transit, a digital space. Where does your life unfold? Where do your hours gather? These places shape your energy more than you may realize. Don’t think too hard — let them unfold.',
    placeholders: [
      'Home',
      'Work',
      'Your phone',
      'A place you commute',
      'Somewhere you relax',
      'Somewhere you exercise',
      'Any other place',
    ],
  },
  {
    key: 'behaviors',
    num: '3',
    title: 'Seven Behaviors',
    intro:
      'The seven activities or behaviors that fill your days. Not what you intend to do, not what you wish you did — what you consistently do. Working, scrolling, connecting, caregiving, worrying, cleaning, creating, exercising. Over a typical week, what patterns keep repeating? Let those seven become clear.',
    placeholders: [
      'Something you do most',
      'A daily habit',
      'How you connect',
      'How you unwind',
      'A recurring pattern',
      'Something for others',
      'Any other behavior',
    ],
  },
];

const empty7 = () => ['', '', '', '', '', '', ''];

export default function SevensScreen() {
  const [step, setStep] = useState(0); // 0,1,2 = layers; 3 = reflection & exchange
  const [people, setPeople] = useState<string[]>(empty7());
  const [places, setPlaces] = useState<string[]>(empty7());
  const [behaviors, setBehaviors] = useState<string[]>(empty7());
  const [releaseItem, setReleaseItem] = useState('');
  const [nourishItem, setNourishItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const data = await getSevens();
        if (data) {
          const pad = (arr: string[]) => [...arr, ...empty7()].slice(0, 7);
          setPeople(pad(data.people || []));
          setPlaces(pad(data.places || []));
          setBehaviors(pad(data.behaviors || []));
          setReleaseItem(data.releaseItem || '');
          setNourishItem(data.nourishItem || '');
        }
        setLoading(false);
      })();
    }, [])
  );

  const setters = { people: setPeople, places: setPlaces, behaviors: setBehaviors };
  const values = { people, places, behaviors };

  const updateEntry = (key: Layer['key'], i: number, val: string) => {
    const next = [...values[key]];
    next[i] = val;
    setters[key](next);
  };

  const persist = async (): Promise<boolean> => {
    setSaving(true);
    const clean = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);
    const data: SevenSevenSeven = {
      people: clean(people),
      places: clean(places),
      behaviors: clean(behaviors),
      releaseItem: releaseItem.trim(),
      nourishItem: nourishItem.trim(),
      updatedAt: new Date().toISOString(),
    };
    await saveSevens(data);
    setSaving(false);
    return true;
  };

  const goToStep = (s: number) => {
    setStep(s);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  };

  const next = async () => {
    await persist();
    if (step < 3) goToStep(step + 1);
  };

  const back = () => {
    if (step > 0) goToStep(step - 1);
  };

  const finish = async () => {
    await persist();
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const filled = (arr: string[]) => arr.filter((s) => s.trim()).length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Step dots */}
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((s) => (
          <View key={s} style={[styles.dot, s === step && styles.dotActive, s < step && styles.dotDone]} />
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {step < 3 ? (
          <LayerStep
            layer={LAYERS[step]}
            values={values[LAYERS[step].key]}
            onChange={(i, v) => updateEntry(LAYERS[step].key, i, v)}
          />
        ) : (
          <ReflectionStep
            people={people}
            places={places}
            behaviors={behaviors}
            releaseItem={releaseItem}
            nourishItem={nourishItem}
            onRelease={setReleaseItem}
            onNourish={setNourishItem}
          />
        )}
      </ScrollView>

      {/* Footer nav */}
      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable style={styles.backBtn} onPress={back}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {step < 3 ? (
          <Pressable style={styles.nextWrapper} onPress={next} disabled={saving}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
              <Text style={styles.nextText}>
                Continue{step < 2 ? `  ·  ${filled(values[LAYERS[step].key])}/7` : ''}  →
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable style={styles.nextWrapper} onPress={finish} disabled={saving}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
              <Text style={styles.nextText}>{saving ? 'Saving…' : 'Save & Finish  ✦'}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function LayerStep({
  layer,
  values,
  onChange,
}: {
  layer: Layer;
  values: string[];
  onChange: (i: number, v: string) => void;
}) {
  return (
    <View>
      <View style={styles.numBadge}>
        <Text style={styles.numBadgeText}>{layer.num}</Text>
      </View>
      <Text style={styles.stepTitle}>{layer.title}</Text>
      <Text style={styles.intro}>{layer.intro}</Text>

      {values.map((val, i) => (
        <View key={i} style={styles.entryRow}>
          <View style={styles.entryNum}>
            <Text style={styles.entryNumText}>{i + 1}</Text>
          </View>
          <TextInput
            style={styles.entryInput}
            value={val}
            onChangeText={(v) => onChange(i, v)}
            placeholder={layer.placeholders[i]}
            placeholderTextColor={colors.muted}
            maxLength={80}
          />
        </View>
      ))}

      <Text style={styles.gentleNote}>
        The target is seven — but whatever feels right. If you only have a few, that’s okay. You can always come back to this.
      </Text>
    </View>
  );
}

function ReflectionStep({
  people,
  places,
  behaviors,
  releaseItem,
  nourishItem,
  onRelease,
  onNourish,
}: {
  people: string[];
  places: string[];
  behaviors: string[];
  releaseItem: string;
  nourishItem: string;
  onRelease: (v: string) => void;
  onNourish: (v: string) => void;
}) {
  const sections: { label: string; items: string[] }[] = [
    { label: 'People', items: people.filter((s) => s.trim()) },
    { label: 'Places', items: places.filter((s) => s.trim()) },
    { label: 'Behaviors', items: behaviors.filter((s) => s.trim()) },
  ];

  return (
    <View>
      <Text style={styles.stepTitle}>The Architecture of Your Life</Text>
      <Text style={styles.intro}>
        These seven people, seven places, and seven behaviors — this is the ecosystem you are living inside of. Once you can
        see it, you can begin to shape it.
      </Text>

      {sections.map((sec) => (
        <View key={sec.label} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{sec.label}</Text>
          {sec.items.length === 0 ? (
            <Text style={styles.summaryEmpty}>— nothing yet —</Text>
          ) : (
            sec.items.map((item, i) => (
              <Text key={i} style={styles.summaryItem}>
                • {item}
              </Text>
            ))
          )}
        </View>
      ))}

      {/* Enlightened Exchange */}
      <View style={styles.exchangeCard}>
        <Text style={styles.exchangeTitle}>✦  The Enlightened Exchange</Text>
        <Text style={styles.exchangeIntro}>
          Not a giant overhaul — one conscious shift. Choose one person, place, or behavior that doesn’t nourish you, and
          lovingly create a little space around it. Then bring in one nourishing thing to fill that space.
        </Text>

        <Text style={styles.exLabel}>One thing to release or soften</Text>
        <TextInput
          style={styles.exInput}
          value={releaseItem}
          onChangeText={onRelease}
          placeholder="e.g. Less time on my phone after 9pm"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={160}
        />

        <Text style={styles.exLabel}>One nourishing thing to bring in</Text>
        <TextInput
          style={styles.exInput}
          value={nourishItem}
          onChangeText={onNourish}
          placeholder="e.g. A walk and a real conversation"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={160}
        />

        <Text style={styles.exQuote}>
          "Nature abhors a vacuum." Once you create space, something returns to fill it — so be intentional about what leaves
          and what enters.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.cardBorder },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  dotDone: { backgroundColor: colors.primary + '88' },

  content: { padding: spacing.lg, paddingBottom: 40 },

  numBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  numBadgeText: { color: colors.primary, fontSize: 20, fontWeight: '800' },

  stepTitle: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: spacing.sm },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: spacing.lg },

  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  entryNum: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryNumText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  entryInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },

  gentleNote: { color: colors.muted, fontSize: 13, lineHeight: 19, fontStyle: 'italic', marginTop: spacing.md },

  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  summaryItem: { color: colors.text, fontSize: 15, lineHeight: 24 },
  summaryEmpty: { color: colors.muted, fontSize: 14, fontStyle: 'italic' },

  exchangeCard: {
    backgroundColor: colors.primaryDim,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  exchangeTitle: { color: colors.primary, fontSize: 17, fontWeight: '800', marginBottom: spacing.sm },
  exchangeIntro: { color: colors.text, fontSize: 14, lineHeight: 21, marginBottom: spacing.md, opacity: 0.85 },
  exLabel: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: spacing.xs },
  exInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 15,
    padding: spacing.md,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
    minHeight: 56,
  },
  exQuote: { color: colors.primary, fontSize: 13, lineHeight: 20, fontStyle: 'italic', marginTop: spacing.xs },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  backBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  backBtnText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  nextWrapper: { flex: 1, borderRadius: radius.full, overflow: 'hidden' },
  nextBtn: { paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.full },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
