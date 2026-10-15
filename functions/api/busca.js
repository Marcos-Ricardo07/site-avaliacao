import { obterUsuario, json } from "../_lib/sessao.js";

export async function onRequestGet({ request, env }) {
  const usuario = await obterUsuario(request, env);
  if (!usuario) return json({ erro: "não autenticado" }, 401);

  const nome = new URL(request.url).searchParams.get("aluno") || "";
  const { results } = await env.DB.prepare("SELECT * FROM notas WHERE aluno = ? AND usuario_id = ?").bind(nome, usuario.id).all();
  return json(results);
}
