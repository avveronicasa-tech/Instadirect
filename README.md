# InstaDirect

Automação de DM para Instagram (comentário/story/DM vira mensagem automática),
usando a API oficial da Meta. Rodando na sua própria conta Vercel + Neon.

## O que já funciona

- Login por senha (`ADMIN_PASSWORD`), protegendo todo o painel.
- Banco de dados Postgres (Neon), com as tabelas criadas automaticamente.
- Assistente em **Configuração** (`/setup`): cadastro do ID/chave do app da
  Meta (uma vez só) + lista de **contas do Instagram conectadas**, com botão
  pra adicionar quantas quiser, trocar a conta ativa e desconectar.
- **Múltiplas contas**: cada conta conectada guarda seu próprio token. O
  seletor na barra lateral troca qual conta está "ativa" no painel — as
  automações, contatos, eventos e fluxos são sempre isolados por conta.
- Webhook (`/api/webhook/instagram`): valida a assinatura HMAC da Meta,
  descobre de qual conta conectada veio cada evento, e decide entre fluxo,
  automação simples, ou nada — nessa ordem de prioridade.
- OAuth completo: autorizar → trocar code por token → token de longa
  duração → salvar/atualizar a conta na lista, sem apagar as outras.
- Cron diário que renova o token de todas as contas conectadas.
- **Automações** (`/automacoes`): criar, ativar/pausar e excluir — sempre
  na conta ativa.
- **Fluxos** (`/fluxos`): editor visual de verdade (canvas com React Flow) —
  arrasta blocos, liga puxando uma linha da bolinha até outro bloco, zoom,
  pan, botão "Organizar" pra auto-arrumar.
  - Blocos: Enviar mensagem (com botões clicáveis de verdade — quick
    replies — ou um único botão de link), Esperar, Pedir e-mail, Só para
    quem segue, Etiquetar.
  - 3 tipos de gatilho por fluxo: Comentário, Resposta a story, DM recebida
    — com lista de palavras-chave e tipo de correspondência (contém/exata).
  - Respostas públicas no comentário: uma lista, sorteando uma a cada vez
    (pra não repetir sempre o mesmo texto).
  - **Formato de arquivo `.json` compatível com o DirectPro original**
    (`{ formato: 1, fluxos: [{ name, trigger, keywords, nodes, edges, ... }] }`).
    Um fluxo exportado de um sistema importa certinho no outro.
  - Botões: Ativar/Pausar, Exportar, Duplicar, Apagar — igual ao original.
  - Quando um fluxo e uma automação usam a mesma palavra-chave, o fluxo tem
    prioridade.
  - "Só para quem segue" é um bloco **honesto**: a API do Instagram não
    permite verificar isso de verdade, então ele só pede e espera o toque
    — não confere nada (documentado também na tela).
  - Nó "Esperar" é resolvido por um cron diário ou quando a pessoa manda
    outra mensagem — sem QStash, não sai na hora exata (mesma limitação
    documentada pro lembrete das automações simples).
- **Contatos** e **Atividade**: mostram dados reais, filtrados pela conta
  ativa.
- Páginas de Política de Privacidade e Termos (exigidas pela Meta).

- **Disparos** (`/disparos`): envio manual de mensagem pra quem já
  interagiu, igual ao DirectPro.
  - Composer com inserir variável (`{{first_name}}`), botão de link
    opcional e prévia ao vivo.
  - Lista de contatos com busca, "Marcar todos" e o tempo que falta pra
    fechar a janela de 24h de cada pessoa — quem está mais perto de
    expirar aparece primeiro.
  - Só envia pra quem ainda está dentro da janela de 24h (confere nessa
    hora, não só na hora de listar) — quem expirou nesse meio-tempo é
    avisado no resultado, não trava o envio dos outros.
  - Limite de 150 destinatários por disparo, com uma pequena pausa entre
    cada envio pra respeitar a taxa da Meta.

## O que ainda falta (próximas etapas)

- **Lembrete depois de X minutos das Automações simples** (diferente do nó
  "Esperar" dos Fluxos, que já funciona): a coluna já existe na tabela, mas
  ainda não foi ligada.
- Fila com trava atômica (`FOR UPDATE SKIP LOCKED`) pra nunca enviar em
  dobro, como o DirectPro original faz.
- Limite de envio (mensagens por segundo/hora) ainda não está aplicado.
- Detecção de resposta a story: hoje reconhece pelo campo `reply_to.story`
  que a Meta manda no evento — ainda não filtra por um story específico
  (a palavra-chave vale pra resposta a qualquer story).

## Como publicar

1. Suba o **conteúdo** desta pasta (não a pasta em si) num repositório
   GitHub.
2. Importe na Vercel.
3. Em **Environment Variables**, adicione `ADMIN_PASSWORD` com a senha que
   você quer usar pra entrar no painel.
4. Depois do primeiro deploy: aba **Storage → Create Database → Neon** →
   plano Free → **Connect** ao projeto.
5. **Deployments → ⋯ → Redeploy** (isso ativa o banco; as tabelas são
   criadas sozinhas no primeiro acesso).
6. Abra o site, entre com a senha, vá em **Configuração** e siga o
   assistente pra conectar sua conta do Instagram.

## Estrutura

```
app/
  page.tsx                     Painel (dados reais do banco)
  login/                       Tela de senha
  setup/                       Assistente de conexão com a Meta
  automacoes/                  CRUD de automações
  contatos/ atividade/         Listagens
  api/
    login, logout              Sessão por senha
    setup/credentials          Salvar ID/chave do app
    oauth/instagram/           Autorizar + callback
    webhook/instagram          Recebe eventos da Meta
    cron/refresh-token         Renovação diária do token
lib/
  db.ts       Conexão Postgres + schema automático
  auth.ts     Sessão por senha (Web Crypto, funciona no middleware)
  meta.ts     Chamadas à Graph API do Instagram
  webhook-signature.ts   Validação HMAC do webhook
middleware.ts  Protege todo o painel exigindo login
```
