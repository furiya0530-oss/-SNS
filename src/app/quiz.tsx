// 出題画面: 60秒タイマー付きの4択。回答するとすぐ正誤と上司の解説を出す。
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BossBubble } from '../components/BossBubble';
import { Button, Card } from '../components/ui';
import { findQuestion } from '../data/questions';
import { lines, pick } from '../lib/boss';
import { createDeliveryNow } from '../lib/deliveries';
import { answerDelivery, backlog, markOpened } from '../lib/game';
import { useGame } from '../lib/GameProvider';
import { ANSWER_LIMIT_MS } from '../lib/rules';
import { colors, space } from '../lib/theme';

export default function QuizScreen() {
  const params = useLocalSearchParams<{ deliveryId?: string }>();
  const { state, update } = useGame();
  const [deliveryId, setDeliveryId] = useState(params.deliveryId);
  const creating = useRef(false);
  useEffect(() => {
    if (params.deliveryId) setDeliveryId(params.deliveryId);
  }, [params.deliveryId]);

  // 通知以外から開いたときは、その場で1問作る
  useEffect(() => {
    if (deliveryId || creating.current) return;
    creating.current = true;
    const d = createDeliveryNow(state, Date.now());
    if (d) {
      update((s) => ({ ...s, deliveries: [...s.deliveries, d] }));
      setDeliveryId(d.id);
    }
  }, [deliveryId, state, update]);

  const delivery = state.deliveries.find((d) => d.id === deliveryId);
  const question = delivery && findQuestion(delivery.questionId);

  // 開いた時刻を記録（タイマーの起点）
  useEffect(() => {
    if (delivery && delivery.openedAt === undefined) update((s) => markOpened(s, delivery.id, Date.now()));
  }, [delivery, update]);

  const [now, setNow] = useState(Date.now());
  const answered = delivery?.answeredAt !== undefined;
  useEffect(() => {
    if (answered) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [answered]);

  if (!delivery || !question) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.sub }}>{deliveryId ? 'この出題は見つかりませんでした。' : '準備中…'}</Text>
      </View>
    );
  }

  const openedAt = delivery.openedAt ?? now;
  const remaining = Math.max(0, Math.ceil((ANSWER_LIMIT_MS - (now - openedAt)) / 1000));
  const nextBacklog = backlog(state, Date.now()).find((d) => d.id !== delivery.id);

  const choose = (i: number) => {
    if (answered) return;
    update((s) => answerDelivery(s, delivery.id, question, i, Date.now()));
  };

  let bossText = question.explanation;
  if (answered) {
    const reaction = delivery.late ? pick(lines.late) : delivery.correct ? pick(lines.correct) : pick(lines.wrong);
    bossText = `${reaction}\n${question.explanation}`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.meta}>
          {question.scene} ・ {question.unit}
        </Text>
        {!answered && (
          <Text style={[styles.timer, remaining === 0 && { color: colors.late }]}>
            {remaining > 0 ? `残り ${remaining} 秒` : '時間切れ（遅刻）'}
          </Text>
        )}
      </View>
      {!answered && (
        <View style={styles.timerBar}>
          <View
            style={[
              styles.timerFill,
              { width: `${(remaining / (ANSWER_LIMIT_MS / 1000)) * 100}%` },
              remaining <= 10 && { backgroundColor: colors.late },
            ]}
          />
        </View>
      )}

      <Card>
        <Text style={styles.sentence}>{question.sentence.replace('____', '＿＿＿＿')}</Text>
      </Card>

      <View style={{ gap: 10 }}>
        {question.choices.map((c, i) => {
          const isAnswer = i === question.answerIndex;
          const isChosen = i === delivery.choiceIndex;
          return (
            <Pressable
              key={c}
              accessibilityRole="button"
              onPress={() => choose(i)}
              disabled={answered}
              style={({ pressed }) => [
                styles.choice,
                pressed && { opacity: 0.7 },
                answered && isAnswer && { borderColor: colors.correct, backgroundColor: '#E6F4EC' },
                answered && isChosen && !isAnswer && { borderColor: colors.wrong, backgroundColor: '#FBEAEA' },
              ]}
            >
              <Text style={styles.choiceLabel}>{'ABCD'[i]}</Text>
              <Text style={styles.choiceText}>{c}</Text>
              {answered && isAnswer && <Text style={{ color: colors.correct }}>正解</Text>}
            </Pressable>
          );
        })}
      </View>

      {answered && (
        <View style={{ gap: space }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={[styles.result, { color: delivery.correct ? colors.correct : colors.wrong }]}>
              {delivery.correct ? '○ 正解' : '× 不正解'}
            </Text>
            {delivery.late && <Text style={styles.lateBadge}>遅刻</Text>}
          </View>
          <BossBubble text={bossText} />
          {nextBacklog && (
            <Button
              title="次の未処理案件へ"
              onPress={() => router.replace({ pathname: '/quiz', params: { deliveryId: nextBacklog.id } })}
            />
          )}
          <Button title="オフィスに戻る" variant={nextBacklog ? 'secondary' : 'primary'} onPress={() => router.back()} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space, gap: space },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { color: colors.sub, fontSize: 13 },
  timer: { fontSize: 16, fontWeight: '700', color: colors.primary },
  timerBar: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  timerFill: { height: 6, backgroundColor: colors.primary },
  sentence: { fontSize: 19, lineHeight: 28, color: colors.text },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  choiceLabel: { fontWeight: '700', color: colors.sub, width: 18 },
  choiceText: { fontSize: 17, color: colors.text, flex: 1 },
  result: { fontSize: 20, fontWeight: '700' },
  lateBadge: {
    color: '#fff',
    backgroundColor: colors.late,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontWeight: '700',
  },
});
