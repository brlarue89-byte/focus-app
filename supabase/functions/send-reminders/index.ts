import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!

// ─── VAPID helpers ────────────────────────────────────────────────────────────

function base64urlToUint8(b64: string): Uint8Array {
  const pad = b64.length % 4
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64
  const bin = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

function uint8ToBase64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function makeVapidHeaders(endpoint: string): Promise<Record<string, string>> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600

  const header = uint8ToBase64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = uint8ToBase64url(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: VAPID_SUBJECT })))
  const sigInput = `${header}.${payload}`

  // Import private key
  const privKeyBytes = base64urlToUint8(VAPID_PRIVATE_KEY)
  const privKey = await crypto.subtle.importKey('pkcs8', privKeyBytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sigBytes = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(sigInput))
  const sig = uint8ToBase64url(new Uint8Array(sigBytes))

  const jwt = `${sigInput}.${sig}`
  return {
    'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
    'Content-Type': 'application/octet-stream',
    'TTL': '60',
  }
}

// AES-128-GCM encryption for push payload
async function encryptPayload(payload: string, p256dh: string, authSecret: string): Promise<{ ciphertext: Uint8Array, salt: Uint8Array, serverPublicKey: Uint8Array }> {
  const plaintext = new TextEncoder().encode(payload)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const authBytes = base64urlToUint8(authSecret)
  const receiverPublicKeyBytes = base64urlToUint8(p256dh)

  // Generate server ephemeral key pair
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const serverPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey))

  // Import receiver public key
  const receiverPublicKey = await crypto.subtle.importKey('raw', receiverPublicKeyBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, [])

  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverPublicKey }, serverKeyPair.privateKey, 256))

  // PRK (HKDF-SHA256 extract)
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0')
  const prk = await hkdf(authBytes, sharedSecret, authInfo, 32)

  // CEK and nonce
  const keyInfo = buildInfo('aesgcm', receiverPublicKeyBytes, serverPublicKey)
  const nonceInfo = buildInfo('nonce', receiverPublicKeyBytes, serverPublicKey)
  const cek = await hkdf(prk, salt, keyInfo, 16)
  const nonce = await hkdf(prk, salt, nonceInfo, 12)

  // Encrypt
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const padding = new Uint8Array(2) // 2-byte padding length = 0
  const padded = new Uint8Array([...padding, ...plaintext])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded))

  return { ciphertext, salt, serverPublicKey }
}

function buildInfo(type: string, clientKey: Uint8Array, serverKey: Uint8Array): Uint8Array {
  const label = new TextEncoder().encode(`Content-Encoding: ${type}\0P-256\0`)
  const buf = new Uint8Array(label.length + 2 + clientKey.length + 2 + serverKey.length)
  let offset = 0
  buf.set(label, offset); offset += label.length
  new DataView(buf.buffer).setUint16(offset, clientKey.length, false); offset += 2
  buf.set(clientKey, offset); offset += clientKey.length
  new DataView(buf.buffer).setUint16(offset, serverKey.length, false); offset += 2
  buf.set(serverKey, offset)
  return buf
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, salt))
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const combined = new Uint8Array([...info, 0x01])
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, combined))
  return okm.slice(0, length)
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: string): Promise<boolean> {
  try {
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(payload, sub.p256dh, sub.auth)
    const vapidHeaders = await makeVapidHeaders(sub.endpoint)

    const body = new Uint8Array([...salt, ...serverPublicKey, ...ciphertext])
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        ...vapidHeaders,
        'Encryption': `salt=${uint8ToBase64url(salt)}`,
        'Crypto-Key': `dh=${uint8ToBase64url(serverPublicKey)};vapid`,
      },
      body,
    })
    return res.status < 300 || res.status === 410
  } catch (e) {
    console.error('Push send error:', e)
    return false
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMin = now.getMinutes()
  // Fire for tasks scheduled in the next 1-2 minutes
  const windowStart = currentHour * 60 + currentMin
  const windowEnd = windowStart + 2

  // Find tasks with active reminders scheduled in the window
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, text, scheduled_hour, scheduled_half, user_id, task_date')
    .eq('reminder', true)
    .eq('done', false)
    .eq('task_date', now.toISOString().slice(0, 10))

  if (error) return new Response('DB error', { status: 500 })

  const dueTasks = (tasks || []).filter(t => {
    const taskMin = t.scheduled_hour * 60 + (t.scheduled_half ? 30 : 0)
    return taskMin >= windowStart && taskMin < windowEnd
  })

  if (!dueTasks.length) return new Response('no tasks due', { status: 200 })

  // Group by user
  const byUser: Record<string, typeof dueTasks> = {}
  for (const t of dueTasks) {
    if (!byUser[t.user_id]) byUser[t.user_id] = []
    byUser[t.user_id].push(t)
  }

  let sent = 0
  for (const [userId, userTasks] of Object.entries(byUser)) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subs?.length) continue

    for (const task of userTasks) {
      const payload = JSON.stringify({
        title: 'Focus — time to start!',
        body: task.text,
        tag: `task-${task.id}`,
        url: '/',
      })
      for (const sub of subs) {
        const ok = await sendPush(sub, payload)
        if (ok) sent++
        // Clean up expired subscriptions (410 Gone)
        if (!ok) {
          await supabase.from('push_subscriptions').delete()
            .eq('user_id', userId).eq('endpoint', sub.endpoint)
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent, tasks: dueTasks.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
