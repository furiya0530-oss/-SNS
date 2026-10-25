import Tabs from 'expo-router/js-tabs';
import { Text } from 'react-native';
import { colors } from '../../lib/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{label}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'オフィス', tabBarIcon: ({ focused }) => <TabIcon label="🏢" focused={focused} /> }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: '文法ログ', tabBarIcon: ({ focused }) => <TabIcon label="📒" focused={focused} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '設定', tabBarIcon: ({ focused }) => <TabIcon label="⚙️" focused={focused} /> }}
      />
    </Tabs>
  );
}
