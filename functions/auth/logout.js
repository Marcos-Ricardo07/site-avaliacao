import { apagarSessao, cookieSessaoExpirado, json } from "../_lib/sessao.js";

export async function onRequestPost({ request, env }) {
  await apagarSessao(request, env);
  return json({ ok: true }, 200, { "Set-Cookie": cookieSessaoExpirado() });
}
