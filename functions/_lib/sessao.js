// Helpers de cookie, sessão e respostas JSON compartilhados pelas Functions.

export const COOKIE_SESSAO = "sessao";
const DURACAO_SESSAO_SEGUNDOS = 7 * 24 * 60 * 60;

export function lerCookie(request, nome) {
  const cabecalho = request.headers.get("Cookie") || "";
  for (const parte of cabecalho.split(";")) {
    const indice = parte.indexOf("=");
    if (indice === -1) continue;
    if (parte.slice(0, indice).trim() === nome) {
      return decodeURIComponent(parte.slice(indice + 1).trim());
    }
  }
  return null;
}

export function json(dados, status = 200, cabecalhos = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...cabecalhos,
    },
  });
}

export function gerarIdHex(bytes = 32) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("");
}

function agoraSegundos() {
  return Math.floor(Date.now() / 1000);
}

export async function criarSessao(env, usuarioId) {
  const id = gerarIdHex(32);
  const expiraEm = agoraSegundos() + DURACAO_SESSAO_SEGUNDOS;
  await env.DB.prepare("INSERT INTO sessoes (id, usuario_id, expira_em) VALUES (?, ?, ?)")
    .bind(id, usuarioId, expiraEm)
    .run();
  return id;
}

export function cookieSessao(id) {
  return COOKIE_SESSAO + "=" + id + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=" + DURACAO_SESSAO_SEGUNDOS;
}

export function cookieSessaoExpirado() {
  return COOKIE_SESSAO + "=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

// Retorna {id, nome, email, provedor} do usuário logado ou null.
export async function obterUsuario(request, env) {
  const sessaoId = lerCookie(request, COOKIE_SESSAO);
  if (!sessaoId || !/^[0-9a-f]{64}$/.test(sessaoId)) return null;
  const usuario = await env.DB.prepare(
    "SELECT u.id, u.nome, u.email, u.provedor FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.id = ? AND s.expira_em > ?"
  )
    .bind(sessaoId, agoraSegundos())
    .first();
  return usuario || null;
}

export async function apagarSessao(request, env) {
  const sessaoId = lerCookie(request, COOKIE_SESSAO);
  if (!sessaoId) return;
  await env.DB.prepare("DELETE FROM sessoes WHERE id = ?").bind(sessaoId).run();
}
