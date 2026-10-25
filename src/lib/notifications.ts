// 端末内の通知（ローカル通知）の予約。フェーズ1ではサーバーを使わない。
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { stageTitle } from '../data/stages';
import { BOSS_NAME } from './boss';
import type { Delivery } from './types';

const CHANNEL_ID = 'quiz';
export const supported = Platform.OS !== 'web';

if (supported) {
  // アプリを開いている最中に届いた通知も表示する
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** 通知の許可をもらう。許可されていれば true */
export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '業務連絡（出題）',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** 予約済みの通知をすべて取り消し、これから届く出題の分を予約し直す */
export async function syncNotifications(upcoming: Delivery[], stage: number): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const d of upcoming) {
    await Notifications.scheduleNotificationAsync({
      identifier: d.id,
      content: {
        title: `${BOSS_NAME}から業務連絡`,
        body: `${stageTitle(stage)}のキミに1問。60秒以内に返事をくれ。`,
        data: { deliveryId: d.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: d.scheduledAt,
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** 通知をタップしたら、その出題画面を開く */
export function useOpenQuizFromNotification(open: (deliveryId: string) => void) {
  // supported は起動中に変わらないので、フックの呼び出し順は毎回同じになる
  const response = supported ? Notifications.useLastNotificationResponse() : null;
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    // 次にアプリを開いたとき、同じ通知でもう一度開かないよう消しておく
    Notifications.clearLastNotificationResponse();
    const id = response.notification.request.content.data?.deliveryId;
    if (typeof id === 'string') open(id);
  }, [response, open]);
}
