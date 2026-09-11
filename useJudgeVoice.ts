import { useCallback, useEffect, useRef, useState } from 'react';
import { REACTIONS_CORRECT, REACTIONS_TIMEOUT, REACTIONS_WRONG, TAUNTS } from '../data/taunts';

function pickDifferent(pool: string[], lastIdx: number): [string, number] {
  if (pool.length <= 1) return [pool[0], 0];
  let idx = lastIdx;
  while (idx === lastIdx) idx = Math.floor(Math.random() * pool.length);
  return [pool[idx], idx];
}

/**
 * Uma única "voz" para o balão de fala do juiz: provocações aleatórias
 * durante a contagem e reações após cada resposta compartilham o mesmo
 * texto/timer, então uma nunca corta a outra no meio (bug do design
 * original, em que dois `setTimeout` independentes disputavam o mesmo nó).
 * Uma reação de resposta sempre tem prioridade sobre uma provocação pendente.
 */
export function useJudgeVoice() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);
  const lastTauntIdx = useRef(-1);
  const lastReactionIdx = useRef(-1);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const speak = useCallback((text: string, durationMs: number) => {
    window.clearTimeout(hideTimer.current);
    setMessage(text);
    setVisible(true);
    hideTimer.current = window.setTimeout(() => setVisible(false), durationMs);
  }, []);

  const showTaunt = useCallback(() => {
    const [text, idx] = pickDifferent(TAUNTS, lastTauntIdx.current);
    lastTauntIdx.current = idx;
    speak(text, 3600);
  }, [speak]);

  const showReaction = useCallback(
    (outcome: 'correct' | 'wrong' | 'timeout') => {
      const pool = outcome === 'timeout' ? REACTIONS_TIMEOUT : outcome === 'correct' ? REACTIONS_CORRECT : REACTIONS_WRONG;
      const [text, idx] = pickDifferent(pool, lastReactionIdx.current);
      lastReactionIdx.current = idx;
      speak(text, 2600);
    },
    [speak]
  );

  return { message, visible, showTaunt, showReaction };
}
