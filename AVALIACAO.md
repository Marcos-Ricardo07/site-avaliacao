# Avaliação – GitHub Actions

- **Aluno:** Marcos Ricardo (trabalho individual)
- **Repositório:** https://github.com/Marcos-Ricardo07/site-avaliacao
- **Stack:** Cloudflare Pages + Pages Functions + D1, login OAuth Google/GitHub

## Resumo

| Tarefa | Evidência principal |
|---|---|
| T1 – CI a cada commit | verde: [run 38819939523](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38819939523) · vermelha: [run 38820005544](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820005544) |
| T2 – proteger a main | [PR #1](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/1) · [ruleset protege-main](https://github.com/Marcos-Ricardo07/site-avaliacao/rules/25204378) |
| T3 – revisão por IA | [PR #2](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/2) (workflow) · [PR #3](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/3) (SQL vulnerável) |
| T4 – migrações após o merge | [PR #4](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/4) · migrar: [run 38825478521](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38825478521) · [PR #5](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/5) (sem migração) |

## Tarefa 1 – CI a cada commit

Workflow `.github/workflows/ci.yml`, job `verificar`: procura segredos versionados, aplica as migrações num SQLite local e valida o HTML com htmlhint.

- Execução **verde**: https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38819939523
- Execução **vermelha** (com `migrations/0099_erro.sql` = `CREATE TABLE quebrada (id INTEGER, );`): https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820005544
  - Linha do erro, no step "Aplica as migrações D1 em um SQLite local":
    ```
    Parse error near line 1: near ")": syntax error
    ```
  - O step falhou com exit code 1 sem precisar de `sqlite3 -bail`.
- Verde de novo após remover o 0099: https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820080327
- Merge na main por push direto (ainda sem proteção): commit [05bd026](https://github.com/Marcos-Ricardo07/site-avaliacao/commit/05bd02678059ff5a199ff9e1665971a23a78dac9), CI na main: https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820129369

**Por que testar a migração em SQLite antes do D1:** o D1 é SQLite, então o mesmo arquivo `.sql` que quebra no `sqlite3` do runner quebraria no banco de produção. Testar antes é rápido, não precisa de credencial da Cloudflare e barra o erro no PR, antes que uma migração com defeito chegue ao banco remoto, onde não há como desfazer facilmente.

## Tarefa 2 – proteger a main

Ruleset `protege-main` criado via API (`gh api repos/Marcos-Ricardo07/site-avaliacao/rulesets -X POST --input ruleset.json`; o JSON foi apagado e não foi versionado): id 25204378, `enforcement: active`, sem bypass, regras `deletion`, `non_fast_forward`, `pull_request` (0 aprovações) e `required_status_checks` com `verificar`.

- PR com a migração quebrada: https://github.com/Marcos-Ricardo07/site-avaliacao/pull/1
  - `verificar` falhou nas duas execuções do mesmo commit: [push](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820199812) e [pull_request](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820206535).
  - `gh pr view 1 --json mergeStateStatus` → `{"mergeStateStatus":"BLOCKED"}`
  - `gh pr merge 1 --merge`:
    ```
    X Pull request Marcos-Ricardo07/site-avaliacao#1 is not mergeable: the base branch policy prohibits the merge.
    To have the pull request merged after all the requirements have been met, add the `--auto` flag.
    To use administrator privileges to immediately merge the pull request, add the `--admin` flag.
    ```
- Após remover o 0099: `verificar` verde ([run 38820288953](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820288953), [run 38820296877](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820296877)), `mergeStateStatus` = `CLEAN`, merge em [6e46845](https://github.com/Marcos-Ricardo07/site-avaliacao/commit/6e46845b56c2004b6b3f863c093ffe111c298b30).
- Push direto na main (`git commit --allow-empty -m "T2: teste push direto"; git push origin main`), recusado:
  ```
  remote: error: GH013: Repository rule violations found for refs/heads/main.
  remote: Review all repository rules at https://github.com/Marcos-Ricardo07/site-avaliacao/rules?ref=refs%2Fheads%2Fmain
  remote:
  remote: - Changes must be made through a pull request.
  remote:
  remote: - Required status check "verificar" is expected.
  remote:
  To https://github.com/Marcos-Ricardo07/site-avaliacao.git
   ! [remote rejected] main -> main (push declined due to repository rule violations)
  error: failed to push some refs to 'https://github.com/Marcos-Ricardo07/site-avaliacao.git'
  ```
  Depois: `git reset --hard origin/main`. A partir daqui tudo entrou por PR.

## Tarefa 3 – revisão de PR por IA

### Workflow `revisao-ia.yml` (PR #2)

- PR: https://github.com/Marcos-Ricardo07/site-avaliacao/pull/2
- Primeira execução verde, com comentário da IA: https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38822689169 → [comentário](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/2#issuecomment-6204289566)
- Execução final, só com `contents: read` + `pull-requests: write`: https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38822832749
- As falhas antes de chegar ao verde estão em [Desvios do enunciado](#desvios-do-enunciado).

### SQL vulnerável (PR #3)

- PR: https://github.com/Marcos-Ricardo07/site-avaliacao/pull/3
- Versão vulnerável (`` env.DB.prepare(`SELECT * FROM notas WHERE aluno = '${nome}'`) ``), 1º comentário ([run 38823021024](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38823021024)): https://github.com/Marcos-Ricardo07/site-avaliacao/pull/3#issuecomment-6204330123. A IA apontou **SQL injection** (ALTA, confiança 10/10) e sugeriu `prepare("... = ?").bind(nome)`.
- Correção com `prepare("SELECT * FROM notas WHERE aluno = ?").bind(nome)`, 2º comentário (synchronize, [run 38823133285](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38823133285)): https://github.com/Marcos-Ricardo07/site-avaliacao/pull/3#issuecomment-6204342108

### Teste de permissão

Removendo só a linha `pull-requests: write` do `revisao-ia.yml`: https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38823221918. O step `ia` passou e o step "Comenta no PR" falhou com:

```
GraphQL: Resource not accessible by integration (addComment)
```

O log da execução mostra o que o token recebeu: `GITHUB_TOKEN Permissions: Contents: read, Metadata: read`.

**Explicação:** quando o workflow declara `permissions:`, o `GITHUB_TOKEN` recebe somente as permissões listadas e todas as outras ficam como `none`. Sem `pull-requests: write`, o token pode ler o código, mas não pode escrever comentários no PR, e a API do GitHub responde "Resource not accessible by integration". Restaurando a linha com `git revert`, o comentário voltou: [run 38825015017](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38825015017) → [3º comentário](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/3#issuecomment-6204587989).

### Crítica à IA: um falso negativo

No 1º comentário do PR #3 ([issuecomment-6204330123](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/3#issuecomment-6204330123)), a IA acertou a injeção de SQL, mas afirmou: *"Não identifiquei segredos expostos nem outros erros de lógica neste diff."* Isso é um **falso negativo**. A rota `/api/busca` exigia sessão (401 sem login), mas não tinha autorização: a consulta não filtrava por `usuario_id`, então qualquer usuário logado lia as notas cadastradas por outros usuários, ao contrário de `/api/notas`. A própria IA só apontou essa falha nos comentários seguintes, sobre um trecho que não tinha mudado, e deu severidades diferentes ao mesmo problema: "Médio" no [2º comentário](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/3#issuecomment-6204342108) e "HIGH 9/10" no [3º](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/3#issuecomment-6204587989). Há também afirmações irrelevantes ou contraditórias:
- os comentários terminam com um menu "Responda com a opção desejada", que não faz sentido num comentário automático de CI;
- no PR #2 ela escreveu "Nenhuma vulnerabilidade de alta confiança" logo antes de uma tabela com um item HIGH;
- no [PR #4](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/4#issuecomment-6204631749) disse que faltava `models: read`, o que é falso para a versão da action usada, que funciona sem essa permissão ([run 38822832749](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38822832749)).

A revisão é útil como segunda opinião, mas não é determinística nem completa: um "nada encontrado" não prova ausência de problema. Como já havia afirmação errada, o commit provocativo (`client_secret_label`) não foi necessário.

A falha de autorização foi corrigida antes do merge (`prepare("SELECT * FROM notas WHERE aluno = ? AND usuario_id = ?").bind(nome, usuario.id)`, commit [2db67ba](https://github.com/Marcos-Ricardo07/site-avaliacao/commit/2db67ba0448c31fbf086c40902d6d40dccf7f2ea)). O 4º comentário ([run 38825238001](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38825238001)) confirmou: [issuecomment-6204611708](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/3#issuecomment-6204611708). CI verde, `CLEAN`, merge em [7595cd7](https://github.com/Marcos-Ricardo07/site-avaliacao/commit/7595cd70c693bdab04874b956c5fcab568f2eefe).

## Tarefa 4 – migrações depois do merge

- PR com `migrar.yml` + `migrations/0002_adiciona_coluna.sql` (`ALTER TABLE notas ADD COLUMN observacao TEXT;`): https://github.com/Marcos-Ricardo07/site-avaliacao/pull/4. CI verde, comentário da IA em [issuecomment-6204631749](https://github.com/Marcos-Ricardo07/site-avaliacao/pull/4#issuecomment-6204631749), merge em [8e34cb7](https://github.com/Marcos-Ricardo07/site-avaliacao/commit/8e34cb739ffba4d3821edeaa1ed4d82551f4eb4a).
- Workflow `migrar` na main: https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38825478521
  - wrangler: `Migrations to be applied: 0002_adiciona_coluna.sql` → `0002_adiciona_coluna.sql ✅`
  - Bônus: o step `actions/ai-inference@v3` gerou o resumo e o step "Escreve no resumo da execução" gravou-o em `$GITHUB_STEP_SUMMARY`, sob o título "Migrações aplicadas", na aba Summary da execução.
- `npx wrangler d1 execute avaliacao-db --remote --command "PRAGMA table_info(notas)"`:

  | cid | name | type | notnull | dflt_value | pk |
  |---|---|---|---|---|---|
  | 0 | id | INTEGER | 0 | null | 1 |
  | 1 | aluno | TEXT | 1 | null | 0 |
  | 2 | disciplina | TEXT | 1 | null | 0 |
  | 3 | nota | REAL | 1 | null | 0 |
  | 4 | usuario_id | INTEGER | 0 | null | 0 |
  | 5 | criado_em | TEXT | 0 | CURRENT_TIMESTAMP | 0 |
  | 6 | **observacao** | **TEXT** | 0 | null | 0 |

- PR só com texto no `public/index.html` (sem migração): https://github.com/Marcos-Ricardo07/site-avaliacao/pull/5. CI verde, merge em [de83379](https://github.com/Marcos-Ricardo07/site-avaliacao/commit/de83379672695173b6bf9d3591bc654551614868).
  - `gh run list --workflow migrar.yml` mostra uma única execução (`38825478521`, commit `8e34cb7`). **Nenhuma** para `de83379`, por causa do filtro `paths: ['migrations/**']`.
  - Execuções do migrar: https://github.com/Marcos-Ricardo07/site-avaliacao/actions/workflows/migrar.yml
  - Commit do merge: https://github.com/Marcos-Ricardo07/site-avaliacao/commit/de83379672695173b6bf9d3591bc654551614868

## Perguntas

**1) Por que o `ci.yml` roda duas vezes num push em branch com PR aberto, e qual execução o status check considera.**
O `ci.yml` escuta `push` sem filtro de branch e também `pull_request` para a main. Um push numa branch com PR aberto dispara os dois eventos, e foi o que aconteceu no PR #1: [push](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820199812) e [pull_request](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820206535) para o mesmo commit. As duas publicam um check com o mesmo nome, `verificar`, no commit de cabeça do PR. O ruleset exige esse check pelo nome, e o GitHub considera o resultado mais recente com esse nome nesse commit. Aqui as duas execuções sempre tiveram o mesmo resultado; a do `pull_request` é a que testa o código já mesclado com a main.

**2) Por que PR de fork não recebe `secrets.COPILOT_PAT` e qual ataque isso impede.**
No evento `pull_request` vindo de um fork, o workflow roda o código e o YAML escolhidos por quem abriu o PR. Por isso o GitHub não entrega os secrets do repositório e dá ao `GITHUB_TOKEN` só permissão de leitura. Isso impede a exfiltração de segredos: sem essa regra, qualquer pessoa poderia abrir um PR que muda o workflow ou o script para enviar o `COPILOT_PAT` (ou o token da Cloudflare) a um servidor externo e usá-lo em nome do dono do repositório.

**3) Por que o `revisao-ia.yml` declara `permissions` em vez de usar as permissões padrão do `GITHUB_TOKEN`.**
É o princípio do menor privilégio: o workflow recebe só o que precisa (`contents: read` para o checkout e `pull-requests: write` para comentar). O padrão do token depende da configuração do repositório ou da organização e pode dar escrita em tudo. O teste da T3 mostrou que, com `permissions` declarado, o `GITHUB_TOKEN` só recebe o que está listado: sem `pull-requests: write`, o log mostrou apenas `Contents: read` e `Metadata: read`, e o comentário falhou com "Resource not accessible by integration". Assim, um step comprometido (por exemplo, uma dependência instalada via npm) não consegue alterar código nem configurações do repositório.

**4) Se a revisão da IA pode substituir o status check.**
Não. O `verificar` é determinístico e bloqueia o merge, enquanto a revisão da IA não bloqueia nada: o job `revisar` fica verde mesmo quando a IA aponta uma vulnerabilidade. Além disso, a IA não é confiável como portão: no PR #3 ela deu um **falso negativo**, dizendo que não havia outros erros de lógica numa rota que deixava qualquer usuário logado ler as notas de outros, e depois classificou o mesmo problema como "Médio" e como "HIGH". Ela serve como complemento à revisão humana e aos checks, não como substituto.

## Desvios do enunciado

1. **`ci.yml`: o `git grep` encontrava o próprio `ci.yml`.** O arquivo contém o padrão `GOCSPX-` dentro do comando, então a primeira execução falhou com `.github/workflows/ci.yml:15: ... ##[error]Possível segredo no repositório` ([run 38819875725](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38819875725)). Excluí só esse arquivo da busca, com o pathspec `':!.github/workflows/ci.yml'`.

2. **`revisao-ia.yml` e `migrar.yml`: `actions/ai-inference@v1` → `@v3`.**
   - Com `@v1`, o step `ia` falhava com `API error: TypeError: Cannot use 'in' operator to search for 'choices' in OK` ([run 38820422367](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820422367)). O log mostrava que essa versão usa o GitHub Models (`endpoint: https://models.github.ai/inference`) com o `GITHUB_TOKEN`.
   - A primeira hipótese foi falta de permissão. Adicionei `models: read`, o log confirmou `Models: read` no token, e a falha continuou igual ([run 38820729791](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820729791)). Portanto não era permissão.
   - Testando o endpoint com `curl`, ele respondia `OK` em texto puro (HTTP 200) a qualquer requisição, inclusive ao catálogo de modelos. A action esperava JSON com `choices`.
   - A release v3 da action ([actions/ai-inference#236](https://github.com/actions/ai-inference/pull/236), "remove github-models support and make copilot the only provider") troca o GitHub Models pelo **Copilot CLI**, autenticado por `COPILOT_GITHUB_TOKEN`. É exatamente o que o YAML do enunciado já prepara (`npm install -g @github/copilot` + `COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_PAT }}`).
   - Com `@v3`, `models: read` deixou de ser necessário: o `revisao-ia` funciona só com `contents: read` + `pull-requests: write` ([run 38822832749](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38822832749)), então a permissão foi removida, mantendo o mínimo. O `migrar.yml` também ficou só com `contents: read`.

3. **`model: auto` no step de IA.** Com `@v3`, o modelo padrão da action (`gpt-4.1`) não está disponível no plano Copilot Free. O stderr do CLI, numa execução em modo debug, mostrou `Error: Model "gpt-4.1" from --model flag is not available.` ([run 38820911669](https://github.com/Marcos-Ricardo07/site-avaliacao/actions/runs/38820911669)). `model: auto` deixa o Copilot escolher um modelo disponível no plano.

4. **Secret `COPILOT_PAT` recriado.** Na mesma execução, uma tentativa anterior falhou com `invalid HTTP header value for Authorization`, ou seja, o valor guardado no secret estava malformado. O secret foi regravado com um PAT fine-grained novo (permissão Copilot Requests), e o PAT antigo foi apagado. Nenhum valor de segredo aparece neste repositório nem nos logs.

5. **`functions/api/busca.js`: filtro por usuário.** Além da correção pedida (`prepare(...).bind(nome)`), a consulta passou a filtrar por `usuario_id = ?`, para corrigir a falha de autorização descrita na crítica à IA.
