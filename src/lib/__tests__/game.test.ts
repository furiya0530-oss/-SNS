/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  answerDelivery,
  applyDemotion,
  backlog,
  canTakeExam,
  createInitialState,
  DAY_MS,
  markHoliday,
  markOpened,
  pickQuestion,
  planDayTimes,
  planDeliveries,
  recordExam,
  startOfDay,
  streak,
  upcoming,
  weeklyReport,
} from '../game';
import { DEMOTION_BACKLOG, EXAM_UNLOCK_CORRECT } from '../rules';
import type { Delivery, GameState, Question } from '../types';

const NOW = new Date(2026, 9, 21, 12, 30).getTime(); // 2026-10-21(水) 12:30

const q = (id: string, stage = 1): Question => ({
  id,
  stage,
  unit: 'be動詞',
  scene: 'メール',
  sentence: 'I ____ a sales manager.',
  choices: ['am', 'is', 'are', 'be'],
  answerIndex: 0,
  explanation: '',
});

let seq = 0;
const delivery = (scheduledAt: number, extra: Partial<Delivery> = {}): Delivery => ({
  id: `d${seq++}`,
  userId: 'u1',
  questionId: 'q1',
  stage: 1,
  unit: 'be動詞',
  scheduledAt,
  ...extra,
});

const base = (): GameState => createInitialState('u1', NOW - 30 * DAY_MS);

describe('planDayTimes', () => {
  it('設定した時間帯の中に、設定した回数だけ出題する', () => {
    const s = base().settings;
    const day = startOfDay(NOW);
    const times = planDayTimes(s, day, Math.random);
    assert.equal(times.length, 3);
    const [a, b, c] = times.map((t) => new Date(t));
    assert.ok(a.getHours() === 7 || a.getHours() === 8);
    assert.equal(b.getHours(), 12);
    assert.ok(c.getHours() >= 20 && c.getHours() < 22);
  });

  it('休日モードと土日オフでは出題しない', () => {
    const s = base().settings;
    assert.deepEqual(planDayTimes({ ...s, holidayMode: true }, startOfDay(NOW), Math.random), []);
    const saturday = startOfDay(new Date(2026, 9, 24).getTime());
    assert.deepEqual(planDayTimes({ ...s, weekends: false }, saturday, Math.random), []);
  });
});

describe('回答と遅刻', () => {
  it('開いてから60秒以内なら遅刻なし、超えたら遅刻', () => {
    const d1 = delivery(NOW - 1000);
    const d2 = delivery(NOW - 1000);
    let s: GameState = { ...base(), deliveries: [d1, d2] };
    s = markOpened(s, d1.id, NOW);
    s = markOpened(s, d2.id, NOW);
    s = answerDelivery(s, d1.id, q('q1'), 0, NOW + 59_000);
    s = answerDelivery(s, d2.id, q('q1'), 1, NOW + 61_000);
    assert.deepEqual(
      s.deliveries.map((d) => [d.correct, d.late]),
      [
        [true, false],
        [false, true],
      ],
    );
  });

  it('通知から30分以上たって開くと遅刻', () => {
    const d = delivery(NOW - 31 * 60_000);
    let s: GameState = { ...base(), deliveries: [d] };
    s = markOpened(s, d.id, NOW);
    s = answerDelivery(s, d.id, q('q1'), 0, NOW + 5000);
    assert.equal(s.deliveries[0].late, true);
  });
});

describe('未処理案件と降格', () => {
  it('上限に達すると1つ降格し、案件は片付けられる', () => {
    const deliveries = Array.from({ length: DEMOTION_BACKLOG }, (_, i) => delivery(NOW - i * 60_000));
    const s: GameState = { ...base(), stage: 3, deliveries };
    assert.equal(backlog(s, NOW).length, DEMOTION_BACKLOG);
    const after = applyDemotion(s, NOW);
    assert.equal(after.stage, 2);
    assert.equal(after.notice?.kind, 'demoted');
    assert.equal(backlog(after, NOW).length, 0);
  });

  it('上限未満なら何もしない。新入社員より下には下がらない', () => {
    const few: GameState = { ...base(), stage: 3, deliveries: [delivery(NOW - 1)] };
    assert.equal(applyDemotion(few, NOW), few);
    const deliveries = Array.from({ length: DEMOTION_BACKLOG }, () => delivery(NOW - 1));
    assert.equal(applyDemotion({ ...base(), deliveries }, NOW).stage, 1);
  });
});

describe('出勤記録', () => {
  const answeredAt = (daysAgo: number) =>
    delivery(NOW - daysAgo * DAY_MS - 1000, { answeredAt: NOW - daysAgo * DAY_MS, correct: true });

  it('毎日答えていれば連続日数を数え、今日がまだでも途切れない', () => {
    const s: GameState = { ...base(), deliveries: [answeredAt(1), answeredAt(2), answeredAt(3), delivery(NOW - 60_000)] };
    assert.equal(streak(s, NOW), 3);
  });

  it('出題があったのに答えなかった日で途切れる。休日モードの日は途切れない', () => {
    const missed = delivery(NOW - 2 * DAY_MS);
    const s: GameState = { ...base(), deliveries: [answeredAt(0), answeredAt(1), missed, answeredAt(3)] };
    assert.equal(streak(s, NOW), 2);
    const holiday = { ...s, holidayDays: [new Date(NOW - 2 * DAY_MS).toLocaleDateString('sv-SE')] };
    assert.equal(streak(holiday, NOW), 3);
  });
});

describe('出題する問題の選び方', () => {
  it('まだ出ていない問題を優先し、今のステージの問題がなければ前のステージで復習する', () => {
    const pool = [q('a'), q('b'), q('c', 2)];
    const seen = [delivery(NOW, { questionId: 'a' })];
    assert.equal(pickQuestion(pool, seen, 1, () => 0)?.id, 'b');
    assert.equal(pickQuestion(pool, [], 3, () => 0)?.stage, 1);
  });

  it('全部出ていたら間違えた問題を優先する', () => {
    const pool = [q('a'), q('b')];
    const seen = [delivery(NOW, { questionId: 'a', correct: true }), delivery(NOW, { questionId: 'b', correct: false })];
    assert.equal(pickQuestion(pool, seen, 1, () => 0)?.id, 'b');
  });
});

describe('昇進試験', () => {
  it('今のステージで規定数正解すると受験でき、合格で昇進する', () => {
    const deliveries = Array.from({ length: EXAM_UNLOCK_CORRECT }, () =>
      delivery(NOW - 1000, { answeredAt: NOW, correct: true }),
    );
    const s: GameState = { ...base(), deliveries };
    assert.equal(canTakeExam({ ...s, deliveries: deliveries.slice(1) }), false);
    assert.equal(canTakeExam(s), true);
    const exam = { id: 'e', userId: 'u1', stage: 1, takenAt: NOW, score: 8, total: 10, passed: true, wrongUnits: [] };
    const after = recordExam(s, exam, NOW + 1);
    assert.equal(after.stage, 2);
    assert.equal(canTakeExam(after), false);
    assert.equal(recordExam(s, { ...exam, passed: false }, NOW + 1).stage, 1);
  });
});

describe('今週の成績表', () => {
  it('月曜はじまりの7日分を集計する', () => {
    const s: GameState = {
      ...base(),
      deliveries: [delivery(NOW - 1000, { answeredAt: NOW, correct: true, late: true })],
    };
    const r = weeklyReport(s, NOW);
    assert.equal(r.days.length, 7);
    assert.equal(r.days[0].day, '2026-10-19');
    assert.deepEqual(r.days[2], { day: '2026-10-21', total: 1, correct: 1, late: 1, missed: 0 });
    assert.deepEqual(r.units, [{ unit: 'be動詞', total: 1, correct: 1 }]);
  });
});

describe('出題予定の作成', () => {
  const pool = Array.from({ length: 30 }, (_, i) => q(`q${i}`));
  let n = 0;
  const newId = () => `new${n++}`;

  it('7日先まで1日3回ずつ作り、過去の時刻は作らない。2回目は増やさない', () => {
    // 乱数 0 = 各時間帯の開始時刻。今日は 12:30 時点なので夜の1回だけ残る → 1 + 6日 × 3
    const s = planDeliveries(base(), NOW, () => 0, pool, newId);
    const future = upcoming(s, NOW);
    assert.equal(future.length, 1 + 6 * 3);
    assert.equal(new Set(future.map((d) => d.questionId)).size, future.length);
    assert.equal(planDeliveries(s, NOW + 60_000, Math.random, pool, newId).deliveries.length, s.deliveries.length);
  });

  it('予定が消えていたら作り直す', () => {
    const s = planDeliveries(base(), NOW, () => 0, pool, newId);
    const emptied = { ...s, deliveries: s.deliveries.filter((d) => d.scheduledAt <= NOW) };
    assert.equal(upcoming(planDeliveries(emptied, NOW, () => 0, pool, newId), NOW).length, 19);
  });

  it('設定を変えたら届いていない出題を作り直し、休日モードなら作らない', () => {
    const s = planDeliveries(base(), NOW, Math.random, pool, newId);
    const holiday = { ...s, settings: { ...s.settings, holidayMode: true } };
    assert.equal(upcoming(planDeliveries(holiday, NOW, Math.random, pool, newId, true), NOW).length, 0);
    assert.equal(markHoliday(holiday, NOW).holidayDays.length, 1);
  });
});
