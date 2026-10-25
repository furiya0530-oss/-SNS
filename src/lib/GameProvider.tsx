// アプリ全体でゲームの状態を共有し、変更のたびに端末へ保存する
import { randomUUID } from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createInitialState } from './game';
import { loadState, saveState } from './storage';
import type { GameState } from './types';

type GameContextValue = {
  state: GameState;
  /** 状態を変更する。渡した関数は今の状態を受け取り、新しい状態を返す */
  update: (fn: (s: GameState) => GameState) => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    loadState()
      .then((s) => setState(s ?? createInitialState(randomUUID(), Date.now())))
      .catch(() => setState(createInitialState(randomUUID(), Date.now())));
  }, []);

  useEffect(() => {
    // 初回作成時も保存して、ユーザーIDを固定する
    if (!state) return;
    saveState(state).catch((e) => console.warn('保存に失敗しました', e));
  }, [state]);

  const update = useCallback((fn: (s: GameState) => GameState) => {
    setState((s) => (s ? fn(s) : s));
  }, []);

  if (!state) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <GameContext.Provider value={{ state, update }}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame は GameProvider の内側で使ってください');
  return ctx;
}
