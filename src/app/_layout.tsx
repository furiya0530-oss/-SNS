import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { AppSync } from '../lib/AppSync';
import { GameProvider } from '../lib/GameProvider';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <GameProvider>
      <StatusBar style="dark" />
      <AppSync />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quiz" options={{ title: '業務連絡（出題）', presentation: 'modal' }} />
      </Stack>
    </GameProvider>
  );
}
