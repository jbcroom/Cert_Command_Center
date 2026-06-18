import { ReferenceLine, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

export default function ScoreGauge({ score, scoreMax, passingScore, personalTarget }) {
  const pct = scoreMax ? Math.round((score / scoreMax) * 100) : 0
  const passPct = scoreMax ? Math.round((passingScore / scoreMax) * 100) : null
  const targetPct = personalTarget && scoreMax ? Math.round((personalTarget / scoreMax) * 100) : null

  const data = [{ name: 'Score', value: pct, fill: pct >= (targetPct || passPct || 70) ? '#10B981' : pct >= (passPct || 70) ? '#F59E0B' : '#EF4444' }]

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold font-mono-data text-text-primary">{pct}%</span>
        <span className="text-xs text-text-muted">{score} / {scoreMax}</span>
      </div>
      <div className="relative h-4 bg-bg-elevated rounded-full overflow-visible">
        {/* Score bar */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: data[0].fill }}
        />
        {/* Passing threshold marker */}
        {passPct != null && (
          <div
            className="absolute top-[-4px] h-[calc(100%+8px)] w-0.5 bg-accent-gold"
            style={{ left: `${passPct}%` }}
            title={`Passing: ${passPct}%`}
          />
        )}
        {/* Personal target marker */}
        {targetPct != null && (
          <div
            className="absolute top-[-4px] h-[calc(100%+8px)] w-0.5 bg-accent-teal"
            style={{ left: `${targetPct}%` }}
            title={`My target: ${targetPct}%`}
          />
        )}
      </div>
      <div className="flex items-center gap-4 text-[11px]">
        {passPct != null && (
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-accent-gold inline-block" />
            <span className="text-text-muted">Pass ({passPct}%)</span>
          </div>
        )}
        {targetPct != null && (
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-accent-teal inline-block" />
            <span className="text-text-muted">My target ({targetPct}%)</span>
          </div>
        )}
      </div>
    </div>
  )
}
