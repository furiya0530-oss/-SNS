// 出題（Delivery）を作る
import { randomUUID } from 'expo-crypto';
import { questionPool } from '../data/questions';
import { pickQuestion } from './game';
import type { Delivery, GameState } from './types';

/** 今すぐ解く1問を作る（通知を待たずに練習するとき） */
export function createDeliveryNow(state: GameState, now: number): Delivery | undefined {
  const q = pickQuestion(questionPool, state.deliveries, state.stage, Math.random);
  if (!q) return undefined;
  return {
    id: randomUUID(),
    userId: state.userId,
    questionId: q.id,
    stage: state.stage,
    unit: q.unit,
    scheduledAt: now,
  };
}
