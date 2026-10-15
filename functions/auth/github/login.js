import { iniciarLogin, redirectUri } from "../../_lib/oauth.js";

export function onRequestGet({ request, env }) {
  return iniciarLogin("https://github.com/login/oauth/authorize", {
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri(request, "github"),
    scope: "read:user user:email",
  });
}
