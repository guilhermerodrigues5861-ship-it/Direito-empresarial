import { useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { Judge } from './components/Judge';
import { Taunt } from './components/Taunt';
import { Toast } from './components/Toast';
import { RegisterScreen } from './screens/RegisterScreen';
import { IntroScreen } from './screens/IntroScreen';
import { QuizScreen, type QuizResult } from './screens/QuizScreen';
import { ResultScreen } from './screens/ResultScreen';
import { RankingScreen } from './screens/RankingScreen';
import { TeacherScreen } from './screens/teacher/TeacherScreen';
import { useJudgeVoice } from './hooks/useJudgeVoice';
import { useToast } from './hooks/useToast';
import { useConfetti } from './hooks/useConfetti';
import { useAmbientParticles } from './hooks/useAmbientParticles';
import { useReducedMotion } from './hooks/useReducedMotion';
import { loadQuestionBank } from './lib/quiz-api';
import type { QuizQuestion, ScreenName, Student } from './lib/types';
import styles from './App.module.css';

const EMPTY_STUDENT: Student = { name: '', email: '', turma: '' };

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('register');
  const [student, setStudent] = useState<Student>(EMPTY_STUDENT);
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [reactionTick, setReactionTick] = useState(0);

  const judgeVoice = useJudgeVoice();
  const toast = useToast();
  const reducedMotion = useReducedMotion();

  const confettiRef = useRef<HTMLCanvasElement>(null);
  const burstConfetti = useConfetti(confettiRef);
  const ambientRef = useRef<HTMLCanvasElement>(null);
  useAmbientParticles(ambientRef, !reducedMotion);

  function triggerJudgeReaction(outcome: 'correct' | 'wrong' | 'timeout') {
    setReactionTick((t) => t + 1);
    judgeVoice.showReaction(outcome);
  }

  const caseNumber =
    student.turma === '4'
      ? 'Processo nº 0004/2026 — Vara Empresarial'
      : student.turma === '6'
        ? 'Processo nº 0006/2026 — Vara Empresarial'
        : 'Processo nº 0000/2026 — Vara Empresarial';

  return (
    <div className={styles.hatch}>
      <div className={styles.watermark} aria-hidden="true">
        ⚖️
      </div>
      <canvas className={styles.ambient} ref={ambientRef} aria-hidden="true" />
      <div className={styles.lightRays} aria-hidden="true" />

      <div className={styles.app}>
        <TopBar caseNumber={caseNumber} wide={screen === 'teacher'} />

        <div className={styles.screenWrap} key={screen}>
          {screen === 'register' && (
            <RegisterScreen
              initial={student}
              onSubmit={(s) => {
                setStudent(s);
                setScreen('intro');
              }}
              onOpenTeacher={() => setScreen('teacher')}
            />
          )}

          {screen === 'intro' && (
            <IntroScreen
              studentName={student.name}
              loadQuestions={() => loadQuestionBank(student.turma as '4' | '6')}
              onReady={(questions) => {
                setQuizData(questions);
                setScreen('quiz');
              }}
              onBack={() => setScreen('register')}
            />
          )}

          {screen === 'quiz' && student.turma && (
            <QuizScreen
              turma={student.turma}
              questions={quizData}
              onFinish={(r) => {
                setResult(r);
                setScreen('result');
              }}
              triggerJudgeReaction={triggerJudgeReaction}
              showTaunt={judgeVoice.showTaunt}
              showToast={toast.show}
              burstConfetti={burstConfetti}
            />
          )}

          {screen === 'result' && result && (
            <ResultScreen
              student={student}
              result={result}
              burstConfetti={burstConfetti}
              onRestart={() => {
                setResult(null);
                setScreen('register');
              }}
              onViewRanking={() => setScreen('ranking')}
            />
          )}

          {screen === 'ranking' && student.turma && (
            <RankingScreen turma={student.turma} onBack={() => setScreen(result ? 'result' : 'intro')} />
          )}

          {screen === 'teacher' && (
            <TeacherScreen onBack={() => setScreen(student.email ? 'intro' : 'register')} showToast={toast.show} />
          )}
        </div>
      </div>

      <Judge reactionTick={reactionTick} />
      <Taunt message={judgeVoice.message} show={judgeVoice.visible} />
      <Toast message={toast.message} show={toast.visible} />
      <canvas className={styles.confettiCanvas} ref={confettiRef} aria-hidden="true" />
    </div>
  );
}
