// 昇進試験: AIが作った問題を順番に解き、合格ラインを超えれば昇進
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BossBubble } from '../components/BossBubble';
import { Button, Card } from '../components/ui';
import { getStage, stageTitle } from '../data/stages';
import { examConfigured, fetchExamQuestions } from '../lib/examApi';
import { canTakeExam, recordExam, weakUnits } from '../lib/game';
import { useGame } from '../lib/GameProvider';
import { EXAM_PASS_SCORE, EXAM_QUESTION_COUNT } from '../lib/rules';
import { colors, space } from '../lib/theme';
import type { Question } from '../lib/types';

type Phase =
  | { kind: 'intro' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'question'; questions: Question[]; index: number; answers: number[] }
  | { kind: 'result'; questions: Question[]; answers: number[]; passed: boolean };

export default function ExamScreen() {
  const { state, update } = useGame();
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const stage = getStage(state.stage);
  const nextTitle = stageTitle(state.stage + 1);

  const start = async () => {
    if (!stage) return;
    setPhase({ kind: 'loading' });
    try {
      const questions = await fetchExamQuestions({
        stage: stage.id,
        stageTitle: stage.title,
        units: stage.units.map((u) => u.name),
        weakUnits: weakUnits(state, stage.id),
        count: EXAM_QUESTION_COUNT,
      });
      setPhase({ kind: 'question', questions, index: 0, answers: [] });
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const answer = (choice: number) => {
    if (phase.kind !== 'question' || phase.answers.length > phase.index) return;
    setPhase({ ...phase, answers: [...phase.answers, choice] });
  };

  const next = () => {
    if (phase.kind !== 'question') return;
    if (phase.index + 1 < phase.questions.length) {
      setPhase({ ...phase, index: phase.index + 1 });
      return;
    }
    const { questions, answers } = phase;
    const score = questions.filter((q, i) => answers[i] === q.answerIndex).length;
    const passed = score >= EXAM_PASS_SCORE;
    const now = Date.now();
    update((s) =>
      recordExam(
        s,
        {
          id: randomUUID(),
          userId: s.userId,
          stage: s.stage,
          takenAt: now,
          score,
          total: questions.length,
          passed,
          wrongUnits: questions.filter((q, i) => answers[i] !== q.answerIndex).map((q) => q.unit),
        },
        now,
      ),
    );
    setPhase({ kind: 'result', questions, answers, passed });
  };

  if (!stage || (phase.kind === 'intro' && !canTakeExam(state))) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>いまは昇進試験を受けられません。</Text>
      </View>
    );
  }

  if (phase.kind === 'intro' || phase.kind === 'error') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <BossBubble
          text={`${stage.title}の昇進試験だ。${EXAM_QUESTION_COUNT}問中${EXAM_PASS_SCORE}問以上正解なら、${nextTitle}に昇進させよう。苦手な単元も多めに出すから覚悟しておけ。`}
        />
        {!examConfigured && (
          <Card>
            <Text style={styles.body}>
              昇進試験の問題はAIがその場で作ります。使うには Supabase の設定が必要です（README の「昇進試験の準備」を見てください）。
            </Text>
          </Card>
        )}
        {phase.kind === 'error' && (
          <Card>
            <Text style={[styles.body, { color: colors.wrong }]}>問題を用意できませんでした: {phase.message}</Text>
          </Card>
        )}
        <Button title={phase.kind === 'error' ? 'もう一度試す' : '試験を始める'} onPress={start} disabled={!examConfigured} />
      </ScrollView>
    );
  }

  if (phase.kind === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={[styles.body, { marginTop: space }]}>試験問題を作成中…（1〜2分かかることがあります）</Text>
      </View>
    );
  }

  if (phase.kind === 'result') {
    const score = phase.questions.filter((q, i) => phase.answers[i] === q.answerIndex).length;
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.score, { color: phase.passed ? colors.correct : colors.wrong }]}>
          {score} / {phase.questions.length} 問正解　{phase.passed ? '合格' : '不合格'}
        </Text>
        <BossBubble
          text={
            phase.passed
              ? `よくやった！ 今日からキミは${nextTitle}だ。`
              : `合格ラインは${EXAM_PASS_SCORE}問だ。毎日の出題で力をつけて、また挑戦してくれ。`
          }
        />
        <Button title="オフィスに戻る" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  const q = phase.questions[phase.index];
  const chosen = phase.answers[phase.index];
  const answered = chosen !== undefined;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.meta}>
        第 {phase.index + 1} 問 / {phase.questions.length} ・ {q.scene} ・ {q.unit}
      </Text>
      <Card>
        <Text style={styles.sentence}>{q.sentence.replace('____', '＿＿＿＿')}</Text>
      </Card>
      <View style={{ gap: 10 }}>
        {q.choices.map((c, i) => (
          <Pressable
            key={`${i}-${c}`}
            accessibilityRole="button"
            onPress={() => answer(i)}
            disabled={answered}
            style={[
              styles.choice,
              answered && i === q.answerIndex && { borderColor: colors.correct, backgroundColor: '#E6F4EC' },
              answered && i === chosen && i !== q.answerIndex && { borderColor: colors.wrong, backgroundColor: '#FBEAEA' },
            ]}
          >
            <Text style={styles.choiceLabel}>{'ABCD'[i]}</Text>
            <Text style={styles.choiceText}>{c}</Text>
          </Pressable>
        ))}
      </View>
      {answered && (
        <>
          <BossBubble text={q.explanation} />
          <Button title={phase.index + 1 < phase.questions.length ? '次の問題へ' : '結果を見る'} onPress={next} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space, gap: space },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  meta: { color: colors.sub, fontSize: 13 },
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
  score: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
});
