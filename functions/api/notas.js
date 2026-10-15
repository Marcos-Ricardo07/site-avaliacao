import { obterUsuario, json } from "../_lib/sessao.js";

const TAMANHO_MAXIMO = 200;

export async function onRequestGet({ request, env }) {
  const usuario = await obterUsuario(request, env);
  if (!usuario) return json({ erro: "não autenticado" }, 401);

  const { results } = await env.DB.prepare(
    "SELECT id, aluno, disciplina, nota, criado_em FROM notas WHERE usuario_id = ? ORDER BY id DESC"
  )
    .bind(usuario.id)
    .all();
  return json(results);
}

function textoValido(valor) {
  return typeof valor === "string" && valor.trim().length > 0 && valor.length <= TAMANHO_MAXIMO;
}

export async function onRequestPost({ request, env }) {
  const usuario = await obterUsuario(request, env);
  if (!usuario) return json({ erro: "não autenticado" }, 401);

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: "JSON inválido" }, 400);
  }
  if (!corpo || typeof corpo !== "object") return json({ erro: "JSON inválido" }, 400);

  const { aluno, disciplina, nota } = corpo;
  if (!textoValido(aluno)) return json({ erro: "aluno deve ser texto não vazio" }, 400);
  if (!textoValido(disciplina)) return json({ erro: "disciplina deve ser texto não vazio" }, 400);
  if (typeof nota !== "number" || !Number.isFinite(nota)) {
    return json({ erro: "nota deve ser um número" }, 400);
  }

  const linha = await env.DB.prepare(
    "INSERT INTO notas (aluno, disciplina, nota, usuario_id) VALUES (?, ?, ?, ?) RETURNING id, aluno, disciplina, nota, criado_em"
  )
    .bind(aluno.trim(), disciplina.trim(), nota, usuario.id)
    .first();
  return json(linha, 201);
}
