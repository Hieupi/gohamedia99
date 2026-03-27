/**
 * Cloud Functions — SePay Proxy
 * Keeps API key server-side, frontend calls this function instead
 */
const { onRequest } = require('firebase-functions/v2/https')
const { defineString } = require('firebase-functions/params')

// API key — set via: firebase functions:config:set sepay.apikey="YOUR_KEY"
// Or hardcode here (less ideal but works for single-dev projects)
const SEPAY_API_KEY = '3MO8362TCQDWEBHBADMVXXD4WBMEYV7WNHOCXBKA9UHNZSL5G0AUJ5JUI0NFHKKA'
const SEPAY_BASE_URL = 'https://my.sepay.vn/userapi'

exports.sepayProxy = onRequest({ cors: true, region: 'asia-southeast1' }, async (req, res) => {
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const limit = req.query.limit || 20
    const url = `${SEPAY_BASE_URL}/transactions/list?limit=${limit}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SEPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      res.status(response.status).json({
        error: `SePay API error: ${errText.slice(0, 200)}`,
      })
      return
    }

    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    console.error('[sepayProxy] Error:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})
