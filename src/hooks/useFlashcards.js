import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFlashcards(certId) {
  const [flashcards, setFlashcards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!certId) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('flashcards').select('*').eq('cert_id', certId).order('domain_name').order('created_at')
    if (err) setError(err.message)
    else setFlashcards(data || [])
    setLoading(false)
  }, [certId])

  useEffect(() => { fetch() }, [fetch])
  return { flashcards, loading, error, refetch: fetch }
}
