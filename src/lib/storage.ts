// 端末内への保存と読み込み
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState } from './types';

const KEY = 'bunpo-company/state/v1';

export async function loadState(): Promise<GameState | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as GameState) : null;
}

export async function saveState(state: GameState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}
