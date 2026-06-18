import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCertifications({ includeArchived = false } = {}) {
  const [certifications, setCertifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase.from('certifications').select('*').order('target_date', { ascending: true })
    if (!includeArchived) query = query.eq('archived', false)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setCertifications(data || [])
    setLoading(false)
  }, [includeArchived])

  useEffect(() => { fetch() }, [fetch])

  return { certifications, loading, error, refetch: fetch }
}

export function getCertYear(cert) {
  if (cert.target_date) return new Date(cert.target_date).getFullYear()
  if (cert.year) return cert.year
  return new Date().getFullYear()
}
