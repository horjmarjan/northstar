import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { login, register } from '../lib/auth';
import { colors, gradients, radius, spacing } from '../lib/theme';

export default function LoginScreen() {
  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setError('');
    const u = username.trim();
    const p = password.trim();
    if (!u || !p) { setError('Please enter a username and password.'); return; }

    setLoading(true);
    const result = mode === 'login' ? await login(u, p) : await register(u, p);
    setLoading(false);

    if (!result.ok) { setError(result.error); return; }
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoArea}>
          <Image
            source={require('../assets/north_star_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>NorthStar</Text>
          <Text style={styles.tagline}>Your goal. Your plan. Your people.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Tab toggle */}
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => { setMode('login'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign In</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => { setMode('register'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Create Account</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="your username"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'register' ? 'at least 6 characters' : 'your password'}
            placeholderTextColor={colors.muted}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable style={styles.btnWrapper} onPress={submit} disabled={loading}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            </LinearGradient>
          </Pressable>

          {mode === 'register' && (
            <Text style={styles.betaNote}>
              This is a private beta — you'll need an invite from the team to create an account.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingBottom: 60 },

  logoArea: { alignItems: 'center', marginBottom: spacing.xl },
  logo:     { width: 90, height: 90, marginBottom: spacing.sm },
  appName:  { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  tagline:  { color: colors.muted, fontSize: 14, marginTop: 4 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  tabs: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.full, padding: 3, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.full, alignItems: 'center' },
  tabActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: colors.primary },

  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 15,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  errorBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFD0A0',
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600' },

  btnWrapper: { borderRadius: radius.full, overflow: 'hidden', marginTop: spacing.xs },
  btn: { paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.full },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  betaNote: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});
