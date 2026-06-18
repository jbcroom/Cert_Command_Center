import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCertSittings(certId) {
  const [sittings, setSittings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!certId) return
    setLoading(true)
    const { data } = await supabase
      .from('cert_sittings').select('*').eq('cert_id', certId).order('sitting_date', { ascending: false })
    setSittings(data || [])
    setLoading(false)
  }, [certId])

  useEffect(() => { fetch() }, [fetch])
  return { sittings, loading, refetch: fetch }
}
