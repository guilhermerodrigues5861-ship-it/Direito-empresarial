import { useCallback, useEffect, useRef, useState } from 'react';
import { DocumentCard } from '../components/ui/DocumentCard';
import { Button } from '../components/ui/Button';
import { shuffledIndices } from '../lib/shuffle';
import { submitAnswer } from '../lib/quiz-api';
import { sfxCorrect, sfxStamp, sfxWrong } from '../lib/audio';
import type { QuizQuestion, Turma } from '../lib/types';
import styles from './QuizScreen.module.css';

const TOTAL_TIME = 45;
const MAX_LIVES = 10;
const MILESTONES = [6, 14, 22, 30];

export interface QuizResult {
  correct: number;
  total: number;
  score: number;
  revelia: boolean;
}

interface QuizScreenProps {
  turma: Turma;
  questions: QuizQuestion[];
  onFinish: (result: QuizResult) => void;
  triggerJudgeReaction: (outcome: 'correct' | 'wrong' | 'timeout') => void;
  showTaunt: () => void;
  showToast: (msg: string) => void;
  burstConfetti: (n: number) => void;
}

type Outcome = 'correct' | 'wrong' | 'timeout';

interface Popup {
  text: string;
  breakdown: string;
  positive: boolean;
}

export function QuizScreen({
  turma,
  questions,
  onFinish,
  triggerJudgeReaction,
  showTaunt,
  showToast,
  burstConfetti,
}: QuizScreenProps) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [correctCount, setCorrectCount] = useState(0);

  const [order, setOrder] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [judging, setJudging] = useState(false);
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [correctPos, setCorrectPos] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [explanation, setExplanation] = useState('');
  const [popup, setPopup] = useState<Popup | null>(null);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [announcement, setAnnouncement] = useState('');

  const answeredRef = useRef(false);
  const timeLeftRef = useRef(TOTAL_TIME);
  const tauntFiredRef = useRef<Record<number, boolean>>({});
  const timerRef = useRef<number | undefined>(undefined);
  // refs sincronizados com o state: commitAnswer só é recriado quando a
  // pergunta muda (item/order), então valores lidos por closure (streak,
  // correctCount) ficariam desatualizados entre uma resposta e outra —
  // por isso lemos sempre do ref, nunca do state, dentro do callback.
  const streakRef = useRef(0);
  const correctCountRef = useRef(0);
  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);
  useEffect(() => {
    correctCountRef.current = correctCount;
  }, [correctCount]);

  const item = questions[index];

  const commitAnswer = useCallback(
    async (displayedPos: number | null) => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      window.clearInterval(timerRef.current);
      setAnswered(true);
      setJudging(true);
      setSelectedPos(displayedPos);

      const origIdx = displayedPos === null ? -1 : order[displayedPos];
      const capturedTimeLeft = timeLeftRef.current;

      let result: { isCorrect: boolean; correctIndex: number; explanation: string };
      try {
        result = await submitAnswer(item.id, turma, origIdx);
      } catch {
        result = {
          isCorrect: false,
          correctIndex: origIdx,
          explanation: 'Não foi possível confirmar a resposta com o servidor agora.',
        };
      }

      const resolvedCorrectPos = order.indexOf(result.correctIndex);
      setCorrectPos(resolvedCorrectPos >= 0 ? resolvedCorrectPos : null);
      setExplanation(result.explanation);
      setJudging(false);
      sfxStamp();

      if (result.isCorrect) {
        setOutcome('correct');
        const nextCorrect = correctCountRef.current + 1;
        correctCountRef.current = nextCorrect;
        setCorrectCount(nextCorrect);

        const nextStreak = streakRef.current + 1;
        streakRef.current = nextStreak;
        setStreak(nextStreak);

        const base = 100;
        const streakBonus = Math.min(nextStreak - 1, 10) * 10;
        const speedBonus = Math.round((capturedTimeLeft / TOTAL_TIME) * 60);
        const total = base + streakBonus + speedBonus;
        setScore((sc) => sc + total);
        const breakdown =
          'base ' + base + (streakBonus ? ` + sequência ${streakBonus}` : '') + (speedBonus ? ` + agilidade ${speedBonus}` : '');
        setPopup({ text: `+${total}`, breakdown, positive: true });

        sfxCorrect();
        setAnnouncement(`Resposta correta. Fundamentação: ${result.explanation}`);
        triggerJudgeReaction('correct');
        if (MILESTONES.includes(nextCorrect)) {
          showToast('🏅 Nova patente em vista! Continue assim.');
          burstConfetti(40);
        }
      } else {
        const isTimeout = displayedPos === null;
        setOutcome(isTimeout ? 'timeout' : 'wrong');
        streakRef.current = 0;
        setStreak(0);
        setLives((l) => l - 1);
        sfxWrong();
        setPopup({ text: 'honorários retidos', breakdown: isTimeout ? 'prazo perdido' : '', positive: false });
        setAnnouncement(`Resposta incorreta. Fundamentação: ${result.explanation}`);
        triggerJudgeReaction(isTimeout ? 'timeout' : 'wrong');
      }
    },
    [item, order, turma, triggerJudgeReaction, showToast, burstConfetti]
  );

  // carrega/embaralha a questão atual e (re)inicia o cronômetro
  useEffect(() => {
    if (!item) return;
    answeredRef.current = false;
    tauntFiredRef.current = {};
    setAnswered(false);
    setJudging(false);
    setSelectedPos(null);
    setCorrectPos(null);
    setOutcome(null);
    setExplanation('');
    setPopup(null);
    setAnnouncement('');
    setOrder(shuffledIndices(item.options.length));
    setTimeLeft(TOTAL_TIME);
    timeLeftRef.current = TOTAL_TIME;

    const checkpoints = [Math.round(TOTAL_TIME * 0.8), Math.round(TOTAL_TIME * 0.45), Math.round(TOTAL_TIME * 0.18)];

    timerRef.current = window.setInterval(() => {
      timeLeftRef.current -= 1;
      const t = timeLeftRef.current;
      setTimeLeft(t);
      if (checkpoints.includes(t) && !tauntFiredRef.current[t]) {
        tauntFiredRef.current[t] = true;
        showTaunt();
      }
      if (t <= 0) {
        window.clearInterval(timerRef.current);
        void commitAnswer(null);
      }
    }, 1000);

    return () => window.clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, item]);

  // fim de processo por esgotamento de recursos (vidas)
  useEffect(() => {
    if (lives <= 0 && answered) {
      const t = window.setTimeout(() => {
        onFinish({ correct: correctCount, total: questions.length, score, revelia: true });
      }, 1400);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lives, answered]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (answered) return;
      const map: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 };
      const key = e.key.toLowerCase();
      if (key in map && map[key] < order.length) {
        void commitAnswer(map[key]);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answered, order.length, commitAnswer]);

  if (!item) return null;

  function handleNext() {
    if (index + 1 >= questions.length) {
      onFinish({ correct: correctCount, total: questions.length, score, revelia: false });
    } else {
      setIndex((i) => i + 1);
    }
  }

  const timerPct = Math.max(0, (timeLeft / TOTAL_TIME) * 100);
  const timerLevel = timeLeft <= TOTAL_TIME * 0.22 ? 'danger' : timeLeft <= TOTAL_TIME * 0.4 ? 'warn' : '';
  const progressPct = ((index + (answered ? 1 : 0)) / questions.length) * 100;
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <>
      <div className={styles.hud}>
        <div className={styles.hudGroup}>
          <div className={styles.stat}>
            Processo <span className={styles.val}>{index + 1}</span>/{questions.length}
          </div>
          <div className={styles.stat}>
            🪙 Honorários: <span className={styles.val}>{score}</span>
            {popup && (
              <div className={[styles.scorePopup, popup.positive ? styles.pos : styles.neg].join(' ')}>
                {popup.text}
                {popup.breakdown && <span className={styles.brk}>{popup.breakdown}</span>}
              </div>
            )}
          </div>
        </div>
        <div className={styles.hudGroup}>
          <div className={styles.stat}>🔥 {streak}</div>
          <div className={styles.lives}>
            <span className={styles.livesIcon}>❤️</span>
            <span className={styles.livesCount}>
              {Math.max(lives, 0)}/{MAX_LIVES}
            </span>
            <div className={styles.livesBar}>
              {Array.from({ length: MAX_LIVES }, (_, i) => {
                const lost = i >= lives;
                const level = lives <= Math.ceil(MAX_LIVES * 0.3) ? 'danger' : lives <= Math.ceil(MAX_LIVES * 0.6) ? 'warn' : '';
                return (
                  <span
                    key={i}
                    className={[styles.seg, lost ? styles.lost : level ? styles[level] : ''].filter(Boolean).join(' ')}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>

      <DocumentCard>
        <div className={styles.timerRow}>
          <div className={styles.timerTrack} role="presentation">
            <div
              className={[styles.timerFill, timerLevel ? styles[timerLevel] : ''].filter(Boolean).join(' ')}
              style={{ width: `${timerPct}%` }}
            />
          </div>
          <span
            className={[styles.timerText, timerLevel ? styles[timerLevel] : ''].filter(Boolean).join(' ')}
            aria-hidden="true"
          >
            {Math.max(0, timeLeft)}s
          </span>
        </div>
        <p className={styles.caseTag}>Matéria: {item.topic || 'Direito Empresarial'}</p>
        <p className={styles.questionText}>{item.q}</p>
        <p className={styles.kbdHint}>Dica: use as teclas 1–4 ou A–D para responder mais rápido.</p>

        <div className={styles.stampWrap}>
          <div className={styles.options} role="group" aria-label="Alternativas">
            {order.map((origIdx, pos) => {
              const isSelected = selectedPos === pos;
              const isCorrectBtn = answered && correctPos === pos;
              const isWrongBtn = answered && isSelected && !isCorrectBtn;
              const dim = answered && !isSelected && !isCorrectBtn;
              return (
                <button
                  key={origIdx}
                  type="button"
                  disabled={answered}
                  className={[
                    styles.option,
                    isCorrectBtn ? styles.correct : '',
                    isWrongBtn ? styles.wrong : '',
                    dim ? styles.dim : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => void commitAnswer(pos)}
                >
                  <span className={styles.letter}>{letters[pos]}</span>
                  <span>{item.options[origIdx]}</span>
                </button>
              );
            })}
          </div>
          {answered && outcome && (
            <div className={[styles.stamp, outcome === 'correct' ? styles.ok : styles.no].join(' ')}>
              {outcome === 'correct' ? 'Deferido' : 'Indeferido'}
            </div>
          )}
          {judging && <p className={styles.judging}>Protocolando o recurso e aguardando a decisão...</p>}
          {answered && !judging && explanation && (
            <div className={styles.explanation}>
              <b>Fundamentação</b>
              <span>{explanation}</span>
            </div>
          )}
        </div>

        <p className="sr-only" aria-live="assertive" role="status">
          {announcement}
        </p>

        <div className={styles.nextRow}>
          {answered && !judging && lives > 0 && (
            <Button type="button" onClick={handleNext}>
              Próximo processo →
            </Button>
          )}
        </div>
      </DocumentCard>
    </>
  );
}
