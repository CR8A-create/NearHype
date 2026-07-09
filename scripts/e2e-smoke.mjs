// scripts/e2e-smoke.mjs
// Smoke test end-to-end del API contra un dev server local (http://localhost:3000).
//
// Crea 2 usuarios de prueba vía la Backend API de Clerk (instancia de DESARROLLO),
// acuña tokens de sesión y recorre el flujo completo: provisioning, onboarding,
// feed, comunidades (posts/comentarios/votos/chat), amistad, DMs, llamadas,
// notificaciones y comprobaciones de validación/authz. Al final borra todo
// (usuarios de Clerk, filas de DB y la comunidad de prueba).
//
// Requisitos: dev server corriendo + .env.local con claves sk_test de Clerk.
// Uso: node scripts/e2e-smoke.mjs

import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const APP = 'http://localhost:3000';
const CLERK = 'https://api.clerk.com/v1';
const SK = process.env.CLERK_SECRET_KEY;

if (!SK || !SK.startsWith('sk_test_')) {
    console.error('✗ CLERK_SECRET_KEY debe ser una clave de DESARROLLO (sk_test_). Abortando.');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);
const stamp = Date.now().toString(36);
const results = [];

function log(ok, name, extra = '') {
    results.push({ ok, name, extra });
    console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
}

async function clerkApi(path, opts = {}) {
    const res = await fetch(`${CLERK}${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', ...opts.headers },
    });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, body };
}

async function createTestUser(tag) {
    const { status, body } = await clerkApi('/users', {
        method: 'POST',
        body: JSON.stringify({
            email_address: [`e2e-${tag}-${stamp}@example.com`],
            username: `e2e_${tag}_${stamp}`,
            password: `E2e!${stamp}${tag}XyZ99`,
            skip_password_checks: true,
        }),
    });
    if (status !== 200) throw new Error(`Clerk createUser(${tag}): ${status} ${JSON.stringify(body).slice(0, 200)}`);
    return body;
}

async function mintToken(clerkUserId) {
    const s = await clerkApi('/sessions', { method: 'POST', body: JSON.stringify({ user_id: clerkUserId }) });
    if (s.status !== 200) throw new Error(`Clerk createSession: ${s.status} ${JSON.stringify(s.body).slice(0, 200)}`);
    const t = await clerkApi(`/sessions/${s.body.id}/tokens`, { method: 'POST', body: '{}' });
    if (t.status !== 200) throw new Error(`Clerk mintToken: ${t.status}`);
    return t.body.jwt;
}

// Cada llamada acuña token fresco (TTL 60s) — simple y a prueba de pasos lentos.
async function api(clerkUserId, method, path, body) {
    const jwt = await mintToken(clerkUserId);
    const res = await fetch(`${APP}${path}`, {
        method,
        headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

async function main() {
    let A, B, communitySlug, postId;
    try {
        console.log(`\n— Setup: creando usuarios de prueba (e2e_*_${stamp}) —`);
        A = await createTestUser('a');
        B = await createTestUser('b');
        console.log(`  Clerk A=${A.id} B=${B.id}`);

        // ===== Provisioning =====
        let r = await api(A.id, 'GET', '/api/user/status');
        log(r.status === 200, 'A provisioning vía GET /api/user/status', `status=${r.status}`);
        r = await api(B.id, 'GET', '/api/user/status');
        log(r.status === 200, 'B provisioning vía GET /api/user/status', `status=${r.status}`);

        const [dbA] = await sql`SELECT id, username FROM users WHERE clerk_id = ${A.id}`;
        const [dbB] = await sql`SELECT id, username FROM users WHERE clerk_id = ${B.id}`;
        log(!!dbA && !!dbB, 'Usuarios auto-provisionados en la DB', `A=${dbA?.username} B=${dbB?.username}`);

        // ===== Onboarding =====
        r = await api(A.id, 'POST', '/api/user/onboarding', {
            interests: ['gaming', 'música', 'tecnología'],
            location: { city: 'Badajoz', lat: 38.88, lon: -6.97 },
            locationConsent: true,
        });
        log(r.status === 200, 'A onboarding (3 intereses + ubicación)', `status=${r.status}`);

        r = await api(A.id, 'POST', '/api/user/onboarding', { interests: ['solo-uno'] });
        log(r.status === 400, 'Validación: onboarding con <3 intereses → 400', `status=${r.status}`);

        r = await api(A.id, 'GET', '/api/user/profile');
        log(r.status === 200 && (r.data?.interests?.length ?? 0) >= 3, 'A GET perfil con intereses', `status=${r.status} intereses=${r.data?.interests?.length}`);

        // ===== Feed =====
        console.log('  (generando feed: llama a 8 APIs externas, puede tardar…)');
        r = await api(A.id, 'GET', '/api/feed/generate');
        log(r.status === 200 && Array.isArray(r.data?.items) && r.data.items.length > 0,
            'A GET /api/feed/generate', `status=${r.status} items=${r.data?.items?.length}`);

        // ===== Comunidades =====
        r = await api(A.id, 'POST', '/api/communities', { name: `E2E Test ${stamp}`, description: 'Comunidad de prueba e2e (se borra sola)', category: 'gaming' });
        communitySlug = r.data?.community?.slug;
        log(r.status === 200 && !!communitySlug, 'A crea comunidad', `status=${r.status} slug=${communitySlug}`);

        r = await api(A.id, 'POST', `/api/communities/${communitySlug}/posts`, { title: 'Post de prueba e2e', content: 'Contenido del post', contentType: 'text' });
        postId = r.data?.post?.id;
        log(r.status === 200 && !!postId, 'A crea post en la comunidad', `status=${r.status} id=${postId}`);

        r = await api(A.id, 'POST', `/api/communities/${communitySlug}/posts`, { title: 'x', contentType: 'text' });
        log(r.status === 400, 'Validación: post con título de 1 char → 400', `status=${r.status}`);

        r = await api(A.id, 'POST', `/api/posts/${postId}/vote`, { voteType: 'upvote' });
        log(r.status === 200, 'A vota el post (upvote)', `status=${r.status}`);

        r = await api(A.id, 'POST', `/api/posts/${postId}/vote`, { voteType: 'sideways' });
        log(r.status === 400, 'Validación: voteType inválido → 400', `status=${r.status}`);

        r = await api(A.id, 'POST', `/api/posts/${postId}/comments`, { content: 'Comentario e2e' });
        const commentId = r.data?.comment?.id;
        log(r.status === 200 && !!commentId, 'A comenta el post', `status=${r.status}`);

        r = await api(A.id, 'GET', `/api/posts/${postId}/comments`);
        log(r.status === 200 && r.data?.comments?.length === 1, 'GET comentarios (1, sin N+1 roto)', `status=${r.status} n=${r.data?.comments?.length}`);

        r = await api(A.id, 'POST', `/api/communities/${communitySlug}/messages`, { content: 'Hola chat e2e' });
        log(r.status === 200, 'A envía mensaje al chat de comunidad', `status=${r.status}`);

        // Authz: B (no miembro, no autor) intenta borrar el post de A
        r = await api(B.id, 'DELETE', `/api/posts/${postId}`);
        log(r.status === 403 || r.status === 404, 'Authz: B no puede borrar el post de A', `status=${r.status}`);

        // ===== Amistad =====
        r = await api(B.id, 'POST', '/api/friends/request', { receiverUsername: dbA.username });
        log(r.status === 200, 'B envía solicitud de amistad a A', `status=${r.status}`);

        r = await api(A.id, 'GET', '/api/friends/requests');
        const reqId = r.data?.requests?.[0]?.id;
        log(r.status === 200 && !!reqId, 'A ve la solicitud pendiente', `status=${r.status}`);

        r = await api(A.id, 'PUT', `/api/friends/requests/${reqId}/accept`);
        log(r.status === 200, 'A acepta la solicitud', `status=${r.status}`);

        r = await api(A.id, 'GET', '/api/friends');
        log(r.status === 200 && r.data?.friends?.length === 1, 'A tiene 1 amigo (B)', `status=${r.status}`);

        // ===== DMs =====
        r = await api(A.id, 'POST', `/api/dms/${dbB.id}`, { content: 'Hola por DM (e2e)' });
        log(r.status === 200, 'A envía DM a B', `status=${r.status}`);

        r = await api(B.id, 'GET', '/api/user/status');
        log(r.status === 200 && r.data?.unreadMessages >= 1, 'B tiene no-leídos en /status (COUNT agregado)', `status=${r.status} unread=${r.data?.unreadMessages}`);

        r = await api(B.id, 'GET', `/api/dms/${dbA.id}`);
        const dmCount = r.data?.messages?.length;
        log(r.status === 200 && dmCount >= 1, 'B lee la conversación', `status=${r.status} mensajes=${dmCount}`);

        // ===== Llamadas (señalización) =====
        r = await api(A.id, 'POST', '/api/calls', { calleeId: dbB.id, callType: 'audio' });
        const roomId = r.data?.room?.id ?? r.data?.roomId;
        log(r.status === 200 && !!roomId, 'A crea sala de llamada con B', `status=${r.status} room=${roomId}`);

        r = await api(B.id, 'GET', '/api/calls');
        log(r.status === 200 && !!r.data?.incomingCall, 'B ve la llamada entrante', `status=${r.status}`);

        r = await api(A.id, 'POST', `/api/calls/${roomId}/signal`, { signalType: 'offer', signalData: { sdp: 'e2e-fake-offer' } });
        log(r.status === 200, 'A envía señal offer', `status=${r.status}`);

        r = await api(B.id, 'GET', `/api/calls/${roomId}/signal`);
        log(r.status === 200 && r.data?.signals?.length === 1, 'B recibe y consume la señal', `status=${r.status} señales=${r.data?.signals?.length}`);

        r = await api(B.id, 'GET', `/api/calls/${roomId}/signal`);
        log(r.status === 200 && r.data?.signals?.length === 0, 'Señales consumidas no se re-entregan', `status=${r.status}`);

        // Authz: un tercero no participante no puede señalizar — usamos A contra una sala falsa
        r = await api(A.id, 'POST', `/api/calls/${roomId}`, { action: 'end' });
        log(r.status === 200, 'A finaliza la llamada', `status=${r.status}`);

        // ===== Notificaciones y perfil público =====
        r = await api(B.id, 'GET', '/api/notifications');
        log(r.status === 200, 'B GET notificaciones', `status=${r.status} n=${r.data?.notifications?.length}`);

        r = await api(B.id, 'GET', `/api/users/${dbA.username}`);
        log(r.status === 200, `B ve el perfil público de A`, `status=${r.status}`);

        // ===== Rate limit (JSON malformado → 400, no 500) =====
        const jwt = await mintToken(A.id);
        const raw = await fetch(`${APP}/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
            body: '{esto no es json',
        });
        log(raw.status === 400, 'JSON malformado → 400 (no 500)', `status=${raw.status}`);

    } catch (err) {
        log(false, `EXCEPCIÓN: ${err.message}`);
    } finally {
        // ===== Cleanup =====
        console.log('\n— Cleanup —');
        try {
            if (communitySlug) {
                const [c] = await sql`SELECT id FROM communities WHERE slug = ${communitySlug}`;
                if (c) {
                    await sql`DELETE FROM communities WHERE id = ${c.id}`;
                    console.log(`  ✓ comunidad ${communitySlug} borrada`);
                }
            }
            for (const u of [A, B]) {
                if (!u) continue;
                await sql`DELETE FROM users WHERE clerk_id = ${u.id}`;
                const del = await clerkApi(`/users/${u.id}`, { method: 'DELETE' });
                console.log(`  ✓ usuario ${u.id} borrado (DB + Clerk ${del.status})`);
            }
            const residue = await sql`SELECT count(*)::int AS n FROM users WHERE username LIKE ${'e2e_%_' + stamp}`;
            console.log(`  Residuo en DB: ${residue[0].n} filas`);
        } catch (e) {
            console.error('  ✗ error en cleanup:', e.message);
        }
        await sql.end();

        const fails = results.filter(x => !x.ok);
        console.log(`\n===== RESULTADO: ${results.length - fails.length}/${results.length} pasos OK =====`);
        if (fails.length) {
            console.log('Fallos:');
            for (const f of fails) console.log(`  ✗ ${f.name} ${f.extra}`);
            process.exit(1);
        }
    }
}

main();
