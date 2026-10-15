import { validarCallback, redirectUri, upsertUsuario, finalizarLogin, erro } from "../../_lib/oauth.js";

export async function onRequestGet({ request, env }) {
  const code = validarCallback(request);
  if (!code) return erro(400, "State inválido ou código ausente.");

  const respostaToken = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(request, "google"),
      grant_type: "authorization_code",
    }),
  });
  if (!respostaToken.ok) return erro(502, "Falha ao obter token do Google.");
  const { access_token: accessToken } = await respostaToken.json();
  if (!accessToken) return erro(502, "Token do Google ausente.");

  const respostaPerfil = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: "Bearer " + accessToken },
  });
  if (!respostaPerfil.ok) return erro(502, "Falha ao obter perfil do Google.");
  const perfil = await respostaPerfil.json();
  if (!perfil.sub) return erro(502, "Perfil do Google inválido.");

  const usuarioId = await upsertUsuario(env, "google", perfil.sub, perfil.name, perfil.email);
  return finalizarLogin(env, usuarioId);
}
