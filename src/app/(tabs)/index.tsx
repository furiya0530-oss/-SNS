// オフィス画面（ホーム）: 役職・出勤記録・未処理案件・上司のひとこと
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BossBubble } from '../../components/BossBubble';
import { Button, Card, SectionTitle } from '../../components/ui';
import { findQuestion } from '../../data/questions';
import { getStage, stageTitle } from '../../data/stages';
import { greeting, noticeLine } from '../../lib/boss';
import { backlog, canTakeExam, dayStats, dayKey, MAX_STAGE, stageCorrectCount, streak, upcoming } from '../../lib/game';
import { useGame } from '../../lib/GameProvider';
import { DEMOTION_BACKLOG, EXAM_UNLOCK_CORRECT } from '../../lib/rules';
import { colors, space } from '../../lib/theme';
import { useNow } from '../../lib/useNow';

function formatTime(ts: number, now: number): string {
  const d = new Date(ts);
  const sameDay = dayKey(ts) === dayKey(now);
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return sameDay ? `今日 ${hm}` : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

export default function OfficeScreen() {
  const { state, update } = useGame();
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const now = useNow();
  const title = stageTitle(state.stage);
  const pending = backlog(state, now).sort((a, b) => a.scheduledAt - b.scheduledAt);
  const today = dayStats(state, dayKey(now), now);
  const days = streak(state, now);
  const next = upcoming(state, now)[0];
  const stage = getStage(state.stage);
  const correct = stageCorrectCount(state);

  const bossText = state.notice
    ? noticeLine(state.notice.kind, stageTitle(state.notice.stage))
    : greeting({
        stageTitle: title,
        backlog: pending.length,
        backlogLimit: DEMOTION_BACKLOG,
        answeredToday: today.total,
        correctToday: today.correct,
        holidayMode: state.settings.holidayMode,
        streak: days,
      });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.hero}>
        <Text style={styles.heroLabel}>現在の役職</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        <View style={styles.stats}>
          <Stat label="出勤記録" value={`${days} 日連続`} />
          <Stat
            label="未処理案件"
            value={`${pending.length} / ${DEMOTION_BACKLOG}`}
            color={pending.length >= DEMOTION_BACKLOG - 3 ? colors.wrong : undefined}
          />
          <Stat label="今日の回答" value={`${today.correct} / ${today.total} 正解`} />
        </View>
      </Card>

      <BossBubble text={bossText} />
      {state.notice && (
        <Button title="承知しました" variant="secondary" onPress={() => update((s) => ({ ...s, notice: undefined }))} />
      )}

      {pending.length > 0 && (
        <>
          <SectionTitle>未処理案件（{pending.length}件）</SectionTitle>
          <Card style={{ gap: 8 }}>
            {pending.slice(0, 5).map((d) => (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/quiz', params: { deliveryId: d.id } })}
                style={styles.pendingRow}
              >
                <Text style={styles.pendingText}>
                  {formatTime(d.scheduledAt, now)} ・ {findQuestion(d.questionId)?.scene ?? d.unit}
                </Text>
                <Text style={{ color: colors.primary }}>対応する ›</Text>
              </Pressable>
            ))}
            {pending.length > 5 && <Text style={styles.sub}>ほか {pending.length - 5} 件</Text>}
          </Card>
        </>
      )}

      <View style={{ gap: 10, marginTop: space }}>
        <Button title="今すぐ1問解く" variant={pending.length ? 'secondary' : 'primary'} onPress={() => router.push('/quiz')} />
        <Text style={styles.sub}>
          {state.settings.holidayMode
            ? '休日モード中です（設定で解除できます）'
            : next
              ? `次の業務連絡: ${formatTime(next.scheduledAt, now)}ごろ`
              : '予定されている出題はありません'}
        </Text>
      </View>

      {state.stage <= MAX_STAGE && (
        <>
          <SectionTitle>昇進試験</SectionTitle>
          <Card style={{ gap: 10 }}>
            <Text style={styles.body}>
              {canTakeExam(state)
                ? `受験資格を得た。合格すれば${stageTitle(state.stage + 1)}に昇進だ。`
                : `このステージで ${EXAM_UNLOCK_CORRECT} 問正解すると受験できます（いま ${Math.min(correct, EXAM_UNLOCK_CORRECT)} 問）`}
            </Text>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: `${Math.min(1, correct / EXAM_UNLOCK_CORRECT) * 100}%` }]} />
            </View>
            {canTakeExam(state) && <Button title="昇進試験を受ける" onPress={() => router.push('/exam')} />}
          </Card>
        </>
      )}

      {stage && (
        <>
          <SectionTitle>{stage.title}の研修（単元）</SectionTitle>
          <Card style={{ gap: 4 }}>
            {stage.units.map((u) => (
              <View key={u.name}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setOpenUnit(openUnit === u.name ? null : u.name)}
                  style={styles.unitRow}
                >
                  <Text style={styles.body}>{u.name}</Text>
                  <Text style={styles.sub}>{openUnit === u.name ? '閉じる' : '解説を聞く'}</Text>
                </Pressable>
                {openUnit === u.name && (
                  <View style={{ paddingBottom: 10 }}>
                    <BossBubble text={u.lecture} />
                  </View>
                )}
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space, gap: space * 0.75, paddingBottom: space * 3 },
  hero: { backgroundColor: colors.primary, borderWidth: 0 },
  heroLabel: { color: '#C9D7EE', fontSize: 13 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '800', marginVertical: 4 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statLabel: { color: '#C9D7EE', fontSize: 12 },
  statValue: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
  pendingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  pendingText: { color: colors.text, fontSize: 15 },
  sub: { color: colors.sub, fontSize: 13, textAlign: 'center' },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.correct },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
});
