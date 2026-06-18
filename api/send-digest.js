export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const resendKey = process.env.RESEND_API_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })

  let body
  try { body = await req.json() } catch { return new Response('Invalid JSON', { status: 400 }) }

  const { userId, email, testMode = false } = body
  if (!email) return new Response(JSON.stringify({ error: 'email is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' }

  // Fetch active certs
  const certsRes = await fetch(`${supabaseUrl}/rest/v1/certifications?select=id,name,exam_code,target_date,status&archived=eq.false&type=eq.exam`, { headers })
  const certs = await certsRes.json()

  // Fetch flashcards due today
  const today = new Date().toISOString().split('T')[0]
  const fcRes = await fetch(`${supabaseUrl}/rest/v1/flashcards?select=id,cert_id&active=eq.true&next_review_at=lte.${today}`, { headers })
  const flashcardsDue = await fcRes.json()

  const dueByCert = {}
  flashcardsDue.forEach(f => { dueByCert[f.cert_id] = (dueByCert[f.cert_id] || 0) + 1 })

  // Build HTML
  const certRows = certs.map(c => {
    const daysLeft = c.target_date ? Math.ceil((new Date(c.target_date) - Date.now()) / 86400000) : null
    const due = dueByCert[c.id] || 0
    const urgency = daysLeft !== null && daysLeft <= 14 ? '🔴' : daysLeft !== null && daysLeft <= 30 ? '🟡' : '🟢'
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #242840">${urgency} <strong style="color:#F1F5F9">${c.exam_code || c.name}</strong></td>
        <td style="padding:8px 12px;border-bottom:1px solid #242840;color:#64748B">${daysLeft !== null ? `${daysLeft}d` : '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #242840;color:${due > 0 ? '#3B82F6' : '#64748B'}">${due > 0 ? `${due} due` : '—'}</td>
      </tr>`
  }).join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:system-ui,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <h1 style="color:#F1F5F9;font-size:20px;margin:0 0 4px">Weekly Study Digest</h1>
    <p style="color:#64748B;font-size:13px;margin:0 0 24px">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${testMode ? ' · TEST MODE' : ''}</p>

    <table style="width:100%;border-collapse:collapse;background:#1A1D2E;border-radius:8px;overflow:hidden">
      <thead>
        <tr style="background:#242840">
          <th style="padding:10px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Certification</th>
          <th style="padding:10px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Days Left</th>
          <th style="padding:10px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Cards Due</th>
        </tr>
      </thead>
      <tbody style="font-size:13px;color:#F1F5F9">
        ${certRows || '<tr><td colspan="3" style="padding:16px 12px;color:#64748B;text-align:center">No active certifications.</td></tr>'}
      </tbody>
    </table>

    <p style="color:#64748B;font-size:11px;margin-top:24px;text-align:center">
      Sent by Cert Command Center · <a href="{{app_url}}" style="color:#3B82F6">Open App</a>
    </p>
  </div>
</body>
</html>`

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Cert Command Center <onboarding@resend.dev>',
      to: [email],
      subject: testMode ? '[Test] Weekly Study Digest' : 'Your Weekly Study Digest',
      html,
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.text()
    return new Response(JSON.stringify({ error: 'Failed to send', detail: err }), { status: 502, headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ sent: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
