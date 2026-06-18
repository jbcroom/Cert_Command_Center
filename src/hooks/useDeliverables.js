import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDeliverables(certId = null) {
  const [deliverables, setDeliverables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('deliverables')
      .select('*')
      .order('module_number', { ascending: true })
    if (certId) query = query.eq('cert_id', certId)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setDeliverables(data || [])
    setLoading(false)
  }, [certId])

  useEffect(() => { fetch() }, [fetch])

  return { deliverables, loading, error, refetch: fetch }
}
