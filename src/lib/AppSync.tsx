// アプリを開くたびに状態を更新し、通知の予約を最新に保つ
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { questionPool } from '../data/questions';
import { refresh, upcoming } from './game';
import { useGame } from './GameProvider';
import { ensurePermission, syncNotifications, useOpenQuizFromNotification } from './notifications';

export function AppSync() {
  const { state, update } = useGame();

  useEffect(() => {
    const run = () => update((s) => refresh(s, Date.now(), Math.random, questionPool, randomUUID));
    run();
    ensurePermission().catch((e) => console.warn('通知の許可を確認できませんでした', e));
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') run();
    });
    return () => sub.remove();
  }, [update]);

  // これから届く出題が変わったときだけ、通知を予約し直す
  const future = upcoming(state, Date.now());
  const signature = future.map((d) => `${d.id}@${d.scheduledAt}`).join(',');
  useEffect(() => {
    syncNotifications(future, state.stage).catch((e) => console.warn('通知の予約に失敗しました', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const open = useCallback((deliveryId: string) => {
    router.push({ pathname: '/quiz', params: { deliveryId } });
  }, []);
  useOpenQuizFromNotification(open);

  return null;
}
