import { monthInfo } from '@/lib/util';

export default function Calendar({ days }: { days: string[] }) {
  const m = monthInfo(days);
  const cells: React.ReactNode[] = [];
  ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].forEach((d) =>
    cells.push(<div key={'h' + d} className="h">{d}</div>)
  );
  for (let i = 0; i < m.first; i++) cells.push(<div key={'e' + i} />);
  for (let d = 1; d <= m.count; d++) {
    cells.push(
      <div
        key={d}
        className={'d' + (m.on.has(d) ? ' on' : '') + (d === m.today ? ' today' : '')}
        aria-label={`Tanggal ${d}${m.on.has(d) ? ', berlatih' : ''}`}
      >
        {d}
      </div>,
    );
  }
  return (
    <div className="card" style={{ gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>📅 Progresku · {m.label}</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'var(--fd)', fontSize: 28, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{m.n}</span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>hari berlatih</span>
        </div>
      </div>
      {/* Calendar grid — compact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
        {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d => (
          <div key={'lbl'+d} style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', paddingBottom: 4 }}>{d}</div>
        ))}
        {/* empty cells */}
        {Array.from({ length: m.first }).map((_, i) => <div key={'e'+i} />)}
        {/* day cells */}
        {Array.from({ length: m.count }, (_, i) => i + 1).map(day => (
          <div key={day} style={{
            height: 32,
            display: 'grid', placeItems: 'center',
            borderRadius: 8,
            fontSize: 12, fontWeight: 600,
            background: m.on.has(day) ? 'var(--accent)' : 'var(--surface2)',
            color: m.on.has(day) ? '#fff' : 'var(--muted)',
            outline: day === m.today ? '2px solid var(--accent)' : 'none',
            outlineOffset: 1,
            boxShadow: m.on.has(day) ? '0 1px 4px rgba(232,82,74,.25)' : 'none',
          }}>
            {day}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
        Merah = hari berlatih · kotak = hari ini · hari yang terlewat bukan kegagalan.
      </p>
    </div>
  );
}
