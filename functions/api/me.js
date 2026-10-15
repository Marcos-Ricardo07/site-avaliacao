import { obterUsuario, json } from "../_lib/sessao.js";

export async function onRequestGet({ request, env }) {
  const usuario = await obterUsuario(request, env);
  if (!usuario) return json({ erro: "não autenticado" }, 401);
  return json({ nome: usuario.nome, email: usuario.email, provedor: usuario.provedor });
}
