import { useEffect, useState } from 'react';

/** 一定間隔で現在時刻を更新する（時間の経過で表示を変えるため） */
export function useNow(intervalMs = 30 * 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
