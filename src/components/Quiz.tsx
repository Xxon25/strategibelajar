'use client';

import { useState, useTransition } from 'react';
import { QUIZ } from '@/lib/constants';
import { saveQuiz } from '@/app/actions';

export default function Quiz({ last }: { last: { score: number; total: number } | null }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState(false);
  const [fb, setFb] = useState<{ good: boolean; m: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState<{ score: number; total: number } | null>(null);
  const [, start] = useTransition();

  const reset = () => {
    setI(0);
    setScore(0);
    setTried(false);
    setDone(false);
    setFb(null);
    setFinished(false);
  };

  if (finished) {
    return (
      <>
        <div className="note good">
          <span className="big">Kuis selesai.</span>
          Kamu menjawab benar pada percobaan pertama {score} dari {QUIZ.length} soal. Skor ini hanya untuk latihan dan tidak menilai kemampuanmu.
        </div>
        <button className="btn ghost" type="button" onClick={reset}>
          Ulangi kuis
        </button>
      </>
    );
  }

  const q = QUIZ[i];
  const pick = (n: number) => {
    if (done) return;
    if (n === q.a) {
      if (!tried) setScore((s) => s + 1);
      setDone(true);
      setFb({ good: true, m: q.ok });
    } else {
      setTried(true);
      setFb({ good: false, m: q.no });
    }
  };
  const next = () => {
    if (i < QUIZ.length - 1) {
      setI(i + 1);
      setTried(false);
      setDone(false);
      setFb(null);
    } else {
      setFinished(true);
      setSaved({ score, total: QUIZ.length });
      start(() => {
        void saveQuiz(score, QUIZ.length);
      });
    }
  };

  return (
    <>
      {last && !saved && (
        <span className="chip" style={{ alignSelf: 'flex-start' }}>
          Percobaan terakhir: benar {last.score} dari {last.total}
        </span>
      )}
      <div style={{ display: 'grid', gap: 6 }}>
        <span className="small">
          Soal {i + 1} dari {QUIZ.length}
        </span>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={QUIZ.length} aria-valuenow={i}>
          <i style={{ width: `${(i / QUIZ.length) * 100}%` }} />
        </div>
      </div>
      <p className="statement">{q.q}</p>
      <div className="opts">
        {q.o.map((t, n) => (
          <button key={n} className="opt left" type="button" disabled={done} onClick={() => pick(n)}>
            {String.fromCharCode(65 + n)}. {t}
          </button>
        ))}
      </div>
      {fb && (
        <div className={fb.good ? 'note good' : 'note'} role="status">
          {fb.m}
        </div>
      )}
      {done && (
        <button className="btn" type="button" onClick={next}>
          {i < QUIZ.length - 1 ? 'Soal berikutnya' : 'Lihat hasil'}
        </button>
      )}
    </>
  );
}
