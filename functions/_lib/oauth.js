// Partes comuns do fluxo OAuth (state, upsert de usuário e criação da sessão).

import { lerCookie, criarSessao, cookieSessao } from "./sessao.js";

const COOKIE_STATE = "oauth_state";

export function redirectUri(request, provedor) {
  return new URL(request.url).origin + "/auth/" + provedor + "/callback";
}

// Gera o state, grava no cookie e redireciona para o provedor.
export function iniciarLogin(urlAutorizacao, parametros) {
  const state = crypto.randomUUID();
  const destino = new URL(urlAutorizacao);
  for (const [chave, valor] of Object.entries({ ...parametros, state })) {
    destino.searchParams.set(chave, valor);
  }
  const headers = new Headers({ Location: destino.toString(), "Cache-Control": "no-store" });
  headers.append(
    "Set-Cookie",
    COOKIE_STATE + "=" + state + "; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/auth"
  );
  return new Response(null, { status: 302, headers });
}

// Retorna o code se o state da URL bater com o do cookie; senão, null.
export function validarCallback(request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const stateCookie = lerCookie(request, COOKIE_STATE);
  if (!state || !stateCookie || state !== stateCookie || !code) return null;
  return code;
}

export function erro(status, mensagem) {
  return new Response(mensagem, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function upsertUsuario(env, provedor, provedorId, nome, email) {
  const linha = await env.DB.prepare(
    "INSERT INTO usuarios (provedor, provedor_id, nome, email) VALUES (?, ?, ?, ?) ON CONFLICT (provedor, provedor_id) DO UPDATE SET nome = excluded.nome, email = excluded.email RETURNING id"
  )
    .bind(provedor, String(provedorId), nome || null, email || null)
    .first();
  return linha.id;
}

// Cria a sessão, seta o cookie "sessao", limpa o state e redireciona para "/".
export async function finalizarLogin(env, usuarioId) {
  const sessaoId = await criarSessao(env, usuarioId);
  const headers = new Headers({ Location: "/", "Cache-Control": "no-store" });
  headers.append("Set-Cookie", cookieSessao(sessaoId));
  headers.append("Set-Cookie", COOKIE_STATE + "=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/auth");
  return new Response(null, { status: 302, headers });
}
