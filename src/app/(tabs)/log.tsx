// 文法ログ: 今日の文法ログと今週の成績表
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionTitle } from '../../components/ui';
import { findQuestion } from '../../data/questions';
import { stageTitle } from '../../data/stages';
import { dayKey, todayLog, weeklyReport } from '../../lib/game';
import { useGame } from '../../lib/GameProvider';
import { colors, space } from '../../lib/theme';
import { useNow } from '../../lib/useNow';

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

export default function LogScreen() {
  const { state } = useGame();
  const now = useNow();
  const log = todayLog(state, now);
  const week = weeklyReport(state, now);
  const weekTotal = week.days.reduce((n, d) => n + d.total, 0);
  const weekCorrect = week.days.reduce((n, d) => n + d.correct, 0);
  const weekLate = week.days.reduce((n, d) => n + d.late, 0);
  const weekMissed = week.days.reduce((n, d) => n + d.missed, 0);
  const exams = state.exams.filter((e) => week.days.some((d) => d.day === dayKey(e.takenAt)));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionTitle>今日の文法ログ</SectionTitle>
      {log.length === 0 ? (
        <Card>
          <Text style={styles.sub}>今日はまだ回答していません。</Text>
        </Card>
      ) : (
        <Card style={{ gap: 12 }}>
          <Text style={styles.summary}>
            {log.length} 問中 {log.filter((d) => d.correct).length} 問正解
            {log.some((d) => d.late) ? `（遅刻 ${log.filter((d) => d.late).length}）` : ''}
          </Text>
          {log.map((d) => {
            const q = findQuestion(d.questionId);
            if (!q) return null;
            return (
              <View key={d.id} style={styles.logItem}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text style={{ color: d.correct ? colors.correct : colors.wrong, fontWeight: '700' }}>
                    {d.correct ? '○' : '×'}
                  </Text>
                  <Text style={styles.unit}>{q.unit}</Text>
                  {d.late && <Text style={styles.late}>遅刻</Text>}
                </View>
                <Text style={styles.sentence}>{q.sentence.replace('____', `[${q.choices[q.answerIndex]}]`)}</Text>
                {!d.correct && d.choiceIndex !== undefined && (
                  <Text style={styles.sub}>あなたの回答: {q.choices[d.choiceIndex]}</Text>
                )}
                <Text style={styles.explanation}>{q.explanation}</Text>
              </View>
            );
          })}
        </Card>
      )}

      <SectionTitle>今週の成績表</SectionTitle>
      <Card style={{ gap: 12 }}>
        <View style={styles.totals}>
          <Total label="回答" value={weekTotal} />
          <Total label="正答率" value={weekTotal ? `${Math.round((weekCorrect / weekTotal) * 100)}%` : '−'} />
          <Total label="遅刻" value={weekLate} />
          <Total label="未回答" value={weekMissed} />
        </View>
        <View style={styles.days}>
          {week.days.map((d, i) => {
            const isFuture = d.day > dayKey(now);
            return (
              <View key={d.day} style={styles.day}>
                <Text style={styles.dayLabel}>{WEEKDAYS[i]}</Text>
                <View style={styles.barTrack}>
                  {d.total > 0 && (
                    <View style={[styles.bar, { height: `${Math.min(100, d.total * 20)}%`, opacity: d.correct / d.total / 2 + 0.5 }]} />
                  )}
                </View>
                <Text style={styles.dayValue}>{isFuture ? '' : `${d.correct}/${d.total}`}</Text>
              </View>
            );
          })}
        </View>
        {week.units.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={styles.subTitle}>単元別</Text>
            {week.units.map((u) => (
              <View key={u.unit} style={styles.unitRow}>
                <Text style={styles.body}>{u.unit}</Text>
                <Text style={[styles.body, u.correct < u.total && { color: colors.wrong }]}>
                  {u.correct} / {u.total}
                </Text>
              </View>
            ))}
          </View>
        )}
        {exams.map((e) => (
          <Text key={e.id} style={styles.body}>
            昇進試験（{stageTitle(e.stage)}）: {e.score} / {e.total} {e.passed ? '合格' : '不合格'}
          </Text>
        ))}
      </Card>
    </ScrollView>
  );
}

function Total({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.totalValue}>{value}</Text>
      <Text style={styles.sub}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space, paddingBottom: space * 3 },
  summary: { fontSize: 17, fontWeight: '700', color: colors.text },
  logItem: { gap: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 10 },
  unit: { color: colors.sub, fontSize: 13 },
  late: { color: '#fff', backgroundColor: colors.late, fontSize: 11, paddingHorizontal: 6, borderRadius: 4, overflow: 'hidden' },
  sentence: { fontSize: 16, color: colors.text },
  explanation: { fontSize: 13, color: colors.sub, lineHeight: 19 },
  sub: { color: colors.sub, fontSize: 13 },
  subTitle: { color: colors.sub, fontSize: 13, fontWeight: '700' },
  body: { color: colors.text, fontSize: 15 },
  totals: { flexDirection: 'row' },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', flex: 1, gap: 4 },
  dayLabel: { fontSize: 12, color: colors.sub },
  barTrack: { height: 60, width: 14, borderRadius: 7, backgroundColor: colors.bg, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: 14, backgroundColor: colors.primary, borderRadius: 7 },
  dayValue: { fontSize: 11, color: colors.sub },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
