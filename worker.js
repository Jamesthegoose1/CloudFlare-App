addEventListener('fetch', event => {
event.respondWith(handleRequest(event.request))
})


async function handleRequest(request) {
const url = new URL(request.url)
if (request.method === 'POST' && url.pathname === '/log') return handlePostLog(request)
if (request.method === 'GET' && url.pathname === '/logs') return handleGetLogs(request)
return new Response('Not found', { status: 404 })
}


async function handlePostLog(request) {
const secret = WEBHOOK_SECRET
const headerKey = request.headers.get('x-api-key')
if (!headerKey || headerKey !== secret) {
return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }})
}


let payload
try { payload = await request.json() } catch (err) {
return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' }})
}


// normalize timestamp (Roblox used os.time() in seconds)
const ts = Number(payload.timestamp) || Math.floor(Date.now()/1000)
const key = `${ts}_${payload.server_id || 's'}_${crypto.getRandomValues(new Uint8Array(4)).join('-')}`


try {
await ADMIN_LOGS.put(key, JSON.stringify(payload))
return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' }})
} catch (err) {
return new Response(JSON.stringify({ error: 'KV error', details: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' }})
}
}


async function handleGetLogs(request) {
const ak = request.headers.get('x-api-key')
if (!ak || ak !== API_KEY) {
return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }})
}


const params = new URL(request.url).searchParams
const limit = Math.min(200, Number(params.get('limit')) || 100)


try {
const list = await ADMIN_LOGS.list({ limit: Math.min(1000, limit) })
const items = []
for (const key of list.keys) {
const v = await ADMIN_LOGS.get(key.name)
if (v) items.push(JSON.parse(v))
}
items.sort((a,b) => (b.timestamp||0) - (a.timestamp||0))
return new Response(JSON.stringify({ logs: items.slice(0, limit) }), { headers: { 'Content-Type': 'application/json' }})
} catch (err) {
return new Response(JSON.stringify({ error: 'KV list error', details: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' }})
}
}
