import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function computeStreak(dates) {
  // dates: array of 'YYYY-MM-DD' strings, any order
  if (!dates.length) return 0
  const unique = [...new Set(dates)].sort().reverse() // newest first
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // Streak only counts if the most recent session was today or yesterday
  if (unique[0] !== today && unique[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1])
    const curr = new Date(unique[i])
    const diff = Math.round((prev - curr) / 86400000)
    if (diff === 1) streak++
    else break
  }
  return streak
}

export function useStudyStats() {
  const [streakDays, setStreakDays] = useState(0)
  const [hoursThisWeek, setHoursThisWeek] = useState(0)
  const [weeklyTarget, setWeeklyTarget] = useState(10)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)

    const [sessionsRes, prefRes] = await Promise.all([
      supabase.from('study_sessions').select('session_date, duration_minutes'),
      supabase.from('user_preferences').select('weekly_study_target_hours').eq('id', 1).single(),
    ])

    if (sessionsRes.data) {
      const dates = sessionsRes.data.map(s => s.session_date)
      setStreakDays(computeStreak(dates))

      // Hours this week (Mon–Sun)
      const now = new Date()
      const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - dayOfWeek)
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const minutesThisWeek = sessionsRes.data
        .filter(s => s.session_date >= weekStartStr)
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
      setHoursThisWeek(minutesThisWeek / 60)
    }

    if (prefRes.data) {
      setWeeklyTarget(prefRes.data.weekly_study_target_hours ?? 10)
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function updateWeeklyTarget(hours) {
    const val = Math.max(1, Math.round(hours))
    setWeeklyTarget(val)
    await supabase.from('user_preferences')
      .upsert({ id: 1, weekly_study_target_hours: val })
  }

  return { streakDays, hoursThisWeek, weeklyTarget, loading, refetch: fetch, updateWeeklyTarget }
}
