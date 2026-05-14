import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ title: 'Set Your North Star', headerBackTitle: 'Back' }} />
        <Stack.Screen name="plan" options={{ title: 'Action Plan', headerBackTitle: 'Back' }} />
        <Stack.Screen name="supporters" options={{ title: 'Your Support Circle', headerBackTitle: 'Back' }} />
        <Stack.Screen name="timeline" options={{ title: 'Timeline', headerBackTitle: 'Back' }} />
        <Stack.Screen name="milestone" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
