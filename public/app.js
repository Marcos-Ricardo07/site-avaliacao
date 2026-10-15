"use strict";

function el(id) {
  return document.getElementById(id);
}

function mostrarMensagem(texto, erro) {
  const mensagem = el("mensagem");
  mensagem.textContent = texto;
  mensagem.classList.toggle("erro", Boolean(erro));
}

function linhaNota(nota) {
  const tr = document.createElement("tr");
  for (const valor of [nota.aluno, nota.disciplina, String(nota.nota), nota.criado_em || ""]) {
    const td = document.createElement("td");
    td.textContent = valor;
    tr.appendChild(td);
  }
  return tr;
}

async function carregarNotas() {
  const resposta = await fetch("/api/notas", { credentials: "same-origin" });
  if (!resposta.ok) return;
  const notas = await resposta.json();
  const corpo = el("corpo-tabela");
  corpo.replaceChildren(...notas.map(linhaNota));
  el("sem-notas").hidden = notas.length > 0;
}

async function iniciar() {
  const resposta = await fetch("/api/me", { credentials: "same-origin" });
  if (resposta.status !== 200) {
    el("secao-login").hidden = false;
    return;
  }
  const usuario = await resposta.json();
  el("usuario-nome").textContent = usuario.nome || "(sem nome)";
  el("usuario-email").textContent = usuario.email || "(sem email)";
  el("usuario-provedor").textContent = usuario.provedor;
  el("secao-usuario").hidden = false;
  el("secao-notas").hidden = false;
  await carregarNotas();
}

el("botao-sair").addEventListener("click", async () => {
  await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
  window.location.href = "/";
});

el("form-nota").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const form = evento.currentTarget;
  const dados = {
    aluno: form.aluno.value,
    disciplina: form.disciplina.value,
    nota: Number(form.nota.value),
  };
  const resposta = await fetch("/api/notas", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (resposta.ok) {
    form.reset();
    mostrarMensagem("Nota salva.", false);
    await carregarNotas();
  } else {
    const corpo = await resposta.json().catch(() => ({}));
    mostrarMensagem(corpo.erro || "Erro ao salvar a nota.", true);
  }
});

iniciar();
