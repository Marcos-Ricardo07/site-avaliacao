import { iniciarLogin, redirectUri } from "../../_lib/oauth.js";

export function onRequestGet({ request, env }) {
  return iniciarLogin("https://accounts.google.com/o/oauth2/v2/auth", {
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(request, "google"),
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });
}
