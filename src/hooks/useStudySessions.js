import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStudySessions(certId = null) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('study_sessions')
      .select('*, certifications(name, exam_code)')
      .order('session_date', { ascending: false })
    if (certId) query = query.eq('cert_id', certId)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setSessions(data || [])
    setLoading(false)
  }, [certId])

  useEffect(() => { fetch() }, [fetch])

  return { sessions, loading, error, refetch: fetch }
}
