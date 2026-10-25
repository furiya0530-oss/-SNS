// 設定画面: 出題回数・時間帯・土日・休日モード
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionTitle } from '../../components/ui';
import { questionPool } from '../../data/questions';
import { createDeliveryNow } from '../../lib/deliveries';
import { refresh } from '../../lib/game';
import { useGame } from '../../lib/GameProvider';
import { supported } from '../../lib/notifications';
import { colors, space } from '../../lib/theme';
import type { Settings, TimeWindow } from '../../lib/types';

const HM = /^([01]?\d|2[0-3]):[0-5]\d$/;

export default function SettingsScreen() {
  const { state, update } = useGame();
  const [draft, setDraft] = useState<Settings>(state.settings);
  const changed = JSON.stringify(draft) !== JSON.stringify(state.settings);

  const setWindow = (i: number, patch: Partial<TimeWindow>) =>
    setDraft((d) => ({ ...d, windows: d.windows.map((w, j) => (j === i ? { ...w, ...patch } : w)) }));

  const save = () => {
    const bad = draft.windows.find((w) => !HM.test(w.start) || !HM.test(w.end) || w.start >= w.end);
    if (bad) {
      Alert.alert('時間帯を確認してください', `「${bad.label}」は 07:30〜08:30 のように、開始より後の終了時刻にしてください。`);
      return;
    }
    const settings = {
      ...draft,
      windows: draft.windows.map((w) => ({ ...w, start: w.start.padStart(5, '0'), end: w.end.padStart(5, '0') })),
    };
    update((s) => refresh({ ...s, settings }, Date.now(), Math.random, questionPool, randomUUID, true));
    setDraft(settings);
    Alert.alert('保存しました', '出題の予定を作り直しました。');
  };

  const testInOneMinute = () => {
    const d = createDeliveryNow(state, Date.now() + 60 * 1000);
    if (!d) return;
    update((s) => ({ ...s, deliveries: [...s.deliveries, d] }));
    Alert.alert('予約しました', supported ? '1分後に出題通知が届きます。アプリを閉じて待ってみてください。' : 'この環境では通知は届きません。1分後にオフィス画面の未処理案件に入ります。');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionTitle>1日の出題回数</SectionTitle>
      <Card style={styles.row}>
        <Button title="−" variant="secondary" onPress={() => setDraft((d) => ({ ...d, dailyCount: Math.max(1, d.dailyCount - 1) }))} />
        <Text style={styles.count}>{draft.dailyCount} 回</Text>
        <Button title="＋" variant="secondary" onPress={() => setDraft((d) => ({ ...d, dailyCount: Math.min(6, d.dailyCount + 1) }))} />
      </Card>

      <SectionTitle>出題する時間帯</SectionTitle>
      <Text style={styles.help}>会議中に通知が来ないよう、この時間帯の中だけでランダムに出題します。</Text>
      <Card style={{ gap: 12 }}>
        {draft.windows.map((w, i) => (
          <View key={i} style={styles.windowRow}>
            <TextInput style={[styles.input, { flex: 1 }]} value={w.label} onChangeText={(label) => setWindow(i, { label })} />
            <TextInput style={[styles.input, styles.time]} value={w.start} onChangeText={(start) => setWindow(i, { start })} placeholder="07:30" keyboardType="numbers-and-punctuation" />
            <Text>〜</Text>
            <TextInput style={[styles.input, styles.time]} value={w.end} onChangeText={(end) => setWindow(i, { end })} placeholder="08:30" keyboardType="numbers-and-punctuation" />
            <Text
              style={styles.remove}
              onPress={() => setDraft((d) => ({ ...d, windows: d.windows.filter((_, j) => j !== i) }))}
              accessibilityRole="button"
            >
              削除
            </Text>
          </View>
        ))}
        <Button
          title="時間帯を追加"
          variant="secondary"
          onPress={() => setDraft((d) => ({ ...d, windows: [...d.windows, { label: '新しい時間帯', start: '18:00', end: '19:00' }] }))}
        />
      </Card>

      <SectionTitle>出勤日</SectionTitle>
      <Card style={{ gap: 12 }}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>土日も出題する</Text>
          <Switch value={draft.weekends} onValueChange={(weekends) => setDraft((d) => ({ ...d, weekends }))} />
        </View>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>休日モード</Text>
            <Text style={styles.help}>出題を止めます。出勤記録は途切れず、未処理案件も増えません。</Text>
          </View>
          <Switch value={draft.holidayMode} onValueChange={(holidayMode) => setDraft((d) => ({ ...d, holidayMode }))} />
        </View>
      </Card>

      <View style={{ marginTop: space, gap: 10 }}>
        <Button title={changed ? '保存する' : '保存済み'} onPress={save} disabled={!changed} />
        <Button title="1分後に試しに出題する" variant="secondary" onPress={testInOneMinute} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space, paddingBottom: space * 3 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 20, fontWeight: '700', color: colors.text },
  help: { fontSize: 13, color: colors.sub, marginBottom: 8, lineHeight: 19 },
  windowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.text,
  },
  time: { width: 64, textAlign: 'center' },
  remove: { color: colors.wrong, paddingHorizontal: 4, flexShrink: 0 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 16, color: colors.text },
});
