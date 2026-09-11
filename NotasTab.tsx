import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { loadAttempts } from '../../lib/quiz-api';
import type { Attempt, Turma } from '../../lib/types';
import shared from './shared.module.css';

interface NotasTabProps {
  turma: Turma;
  password: string;
}

type LoadState = 'loading' | 'ready' | 'error';

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso || '—';
  }
}

function pctPillClass(pct: number): string {
  if (pct >= 70) return '';
  if (pct >= 40) return 'mid';
  return 'low';
}

export function NotasTab({ turma, password }: NotasTabProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [search, setSearch] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    loadAttempts(turma, password)
      .then((list) => {
        if (cancelled) return;
        setAttempts(list);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [turma, password, refreshTick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? attempts.filter((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
      : attempts;
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attempts, search]);

  const total = filtered.length;
  const avgPct = total ? Math.round(filtered.reduce((s, a) => s + (a.pct || 0), 0) / total) : 0;
  const bestScore = total ? Math.max(...filtered.map((a) => a.score || 0)) : 0;
  const uniqueStudents = new Set(filtered.map((a) => a.email.toLowerCase())).size;

  function exportCsv() {
    const rows = [['Nome', 'E-mail', 'Acertos', 'Total', 'Percentual', 'Honorarios', 'Patente', 'Revelia', 'Data']];
    attempts.forEach((a) => {
      rows.push([
        a.name,
        a.email,
        String(a.correct),
        String(a.total),
        String(a.pct),
        String(a.score),
        a.rank,
        a.revelia ? 'sim' : 'nao',
        a.date,
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tribunal-do-conhecimento-notas.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className={shared.toolbar}>
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button size="sm" onClick={() => setRefreshTick((t) => t + 1)}>
          ↻ Atualizar
        </Button>
        <Button size="sm" onClick={exportCsv} disabled={attempts.length === 0}>
          ⇩ Exportar CSV
        </Button>
      </div>

      {state === 'error' && (
        <p className={[shared.emptyState, shared.errorState].join(' ')} role="alert">
          Erro ao carregar os resultados. Tente atualizar novamente.
        </p>
      )}

      {state !== 'error' && (
        <>
          <div className={shared.statsGrid}>
            <div className={shared.statCard}>
              <span className={shared.ic}>⚖️</span>
              <span className={shared.num}>{state === 'loading' ? '—' : total}</span>
              <span className={shared.lbl}>processos julgados</span>
            </div>
            <div className={shared.statCard}>
              <span className={shared.ic}>👥</span>
              <span className={shared.num}>{state === 'loading' ? '—' : uniqueStudents}</span>
              <span className={shared.lbl}>alunos distintos</span>
            </div>
            <div className={shared.statCard}>
              <span className={shared.ic}>📊</span>
              <span className={shared.num}>{state === 'loading' ? '—' : `${avgPct}%`}</span>
              <span className={shared.lbl}>aproveitamento médio</span>
            </div>
            <div className={shared.statCard}>
              <span className={shared.ic}>🏆</span>
              <span className={shared.num}>{state === 'loading' ? '—' : bestScore}</span>
              <span className={shared.lbl}>melhor honorário</span>
            </div>
          </div>

          <div className={shared.tableWrap}>
            <table className={shared.roster}>
              <thead>
                <tr>
                  <th>Aluno(a)</th>
                  <th>E-mail</th>
                  <th>Acertos</th>
                  <th>%</th>
                  <th>Honorários</th>
                  <th>Patente</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {state === 'loading' && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      Carregando...
                    </td>
                  </tr>
                )}
                {state === 'ready' &&
                  filtered.map((a, i) => (
                    <tr key={i}>
                      <td>{a.name || '—'}</td>
                      <td>{a.email || '—'}</td>
                      <td className={shared.num}>
                        {a.correct ?? '—'}/{a.total ?? '—'}
                      </td>
                      <td>
                        <span className={[shared.pill, shared[pctPillClass(a.pct || 0)] ?? ''].join(' ')}>
                          {a.pct ?? '—'}%
                        </span>
                      </td>
                      <td className={shared.num}>{a.score ?? '—'}</td>
                      <td>{a.rank || (a.revelia ? 'Revel(a)' : '—')}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {fmtDate(a.date)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {state === 'ready' && total === 0 && (
            <p className={shared.emptyState}>
              Nenhum processo julgado ainda. Assim que os alunos concluírem o quiz, os resultados
              aparecem aqui.
            </p>
          )}
        </>
      )}
    </div>
  );
}
