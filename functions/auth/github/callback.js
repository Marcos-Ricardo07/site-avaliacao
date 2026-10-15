import { validarCallback, redirectUri, upsertUsuario, finalizarLogin, erro } from "../../_lib/oauth.js";

const USER_AGENT = "site-avaliacao";

export async function onRequestGet({ request, env }) {
  const code = validarCallback(request);
  if (!code) return erro(400, "State inválido ou código ausente.");

  const respostaToken = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({
      code,
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      redirect_uri: redirectUri(request, "github"),
    }),
  });
  if (!respostaToken.ok) return erro(502, "Falha ao obter token do GitHub.");
  const { access_token: accessToken } = await respostaToken.json();
  if (!accessToken) return erro(502, "Token do GitHub ausente.");

  const cabecalhosApi = {
    Authorization: "Bearer " + accessToken,
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
  };

  const respostaPerfil = await fetch("https://api.github.com/user", { headers: cabecalhosApi });
  if (!respostaPerfil.ok) return erro(502, "Falha ao obter perfil do GitHub.");
  const perfil = await respostaPerfil.json();
  if (!perfil.id) return erro(502, "Perfil do GitHub inválido.");

  let email = perfil.email;
  if (!email) {
    const respostaEmails = await fetch("https://api.github.com/user/emails", { headers: cabecalhosApi });
    if (respostaEmails.ok) {
      const emails = await respostaEmails.json();
      const primario = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) : null;
      email = primario ? primario.email : null;
    }
  }

  const usuarioId = await upsertUsuario(env, "github", perfil.id, perfil.name || perfil.login, email);
  return finalizarLogin(env, usuarioId);
}
