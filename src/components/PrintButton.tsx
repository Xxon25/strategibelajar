'use client';

export default function PrintButton() {
  return (
    <button className="btn ghost no-print" type="button" onClick={() => window.print()}>
      Cetak lembar jadwal
    </button>
  );
}
