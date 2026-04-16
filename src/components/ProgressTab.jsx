import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { useApp } from '../context/AppContext'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ProgressTab() {
  const { tasks, fetchProgressHistory } = useApp()
  const [history, setHistory] = useState([])
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    fetchProgressHistory().then(h => setHistory(h ?? [])).catch(() => setHistory([]))
  }, [])

  const todayIdx = new Date().getDay()
  const done = tasks.filter(t => t.done).length
  const total = tasks.length

  // Merge today's live data into history
  const chartData = DAYS.map((_, i) => {
    const dayOfWeek = (new Date().getDay() - (6 - i) + 7) % 7
    if (dayOfWeek === todayIdx && total > 0) return Math.round(done / total * 100)
    const entry = history[i]
    return entry?.pct ?? 0
  })

  const streak = computeStreak(history, todayIdx, done, total)
  const weekAvg = chartData.length ? Math.round(chartData.filter(Boolean).reduce((a, b) => a + b, 0) / (chartData.filter(Boolean).length || 1)) : 0
  const bestStreak = streak // simplified — could compute separately

  useEffect(() => {
    if (!chartRef.current) return

    const colors = chartData.map((v, i) =>
      i === todayIdx ? '#1D9E75' : v === 100 ? '#9FE1CB' : v > 0 ? '#FAC775' : '#D3D1C7'
    )

    if (chartInstance.current) {
      chartInstance.current.data.datasets[0].data = chartData
      chartInstance.current.data.datasets[0].backgroundColor = colors
      chartInstance.current.update()
      return
    }

    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: DAYS,
        datasets: [{ data: chartData, backgroundColor: colors, borderRadius: 4, borderSkipped: false }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.parsed.y + '% complete' } },
        },
        scales: {
          y: { min: 0, max: 100, ticks: { callback: v => v + '%', stepSize: 50, font: { size: 10 } }, grid: { color: 'rgba(120,120,120,0.08)' } },
          x: { ticks: { font: { size: 10 } }, grid: { display: false } },
        },
      },
    })

    return () => {
      chartInstance.current?.destroy()
      chartInstance.current = null
    }
  }, [history, tasks])

  return (
    <>
      <div className="metrics">
        <div className="metric">
          <div className="metric-val">{streak}</div>
          <div className="metric-lbl">Streak</div>
        </div>
        <div className="metric">
          <div className="metric-val">{weekAvg}%</div>
          <div className="metric-lbl">Week avg</div>
        </div>
        <div className="metric">
          <div className="metric-val">{bestStreak}</div>
          <div className="metric-lbl">Best streak</div>
        </div>
      </div>

      <div className="sec-title">This week</div>
      <div className="week-dots">
        {DAYS.map((day, i) => {
          const pct = chartData[i]
          const cls = pct === 100 ? 'complete' : pct > 0 ? 'partial' : 'empty'
          const isToday = i === todayIdx
          return (
            <div key={day} className={`wdot ${cls}${isToday ? ' today' : ''}`}>
              {day.charAt(0)}
            </div>
          )
        })}
      </div>

      <div className="sec-title">Completion %</div>
      <div className="chart-wrap">
        <canvas ref={chartRef} />
      </div>
    </>
  )
}

function computeStreak(history, todayIdx, done, total) {
  // Count consecutive days (going backwards) with pct > 0
  let streak = (total > 0 && done > 0) ? 1 : 0
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i]?.pct > 0) streak++
    else break
  }
  return streak
}
