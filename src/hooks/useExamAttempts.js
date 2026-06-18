import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useExamAttempts(certId = null) {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('exam_attempts')
      .select('*')
      .order('attempt_date', { ascending: false })
    if (certId) query = query.eq('cert_id', certId)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setAttempts(data || [])
    setLoading(false)
  }, [certId])

  useEffect(() => { fetch() }, [fetch])

  return { attempts, loading, error, refetch: fetch }
}
