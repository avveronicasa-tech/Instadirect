# InstaDirect

Automação de DM para Instagram (comentário/story/DM vira mensagem automática),
usando a API oficial da Meta. Rodando na sua própria conta Vercel + Neon.

## O que já funciona

- Login por senha (`ADMIN_PASSWORD`), protegendo todo o painel.
- Banco de dados Postgres (Neon), com as tabelas criadas automaticamente.
- Assistente em **Configuração** (`/setup`): cadastro do ID/chave do app da
  Meta (uma vez só) + lista de **contas do Instagram conectadas**, com botão
  pra adicionar quantas quiser e trocar a conta ativa.
- **Múltiplas contas**: cada conta conectada guarda seu próprio token. O
  seletor na barra lateral troca qual conta está "ativa" no painel — as
  automações, contatos e eventos são sempre isolados por conta.
- Webhook (`/api/webhook/instagram`): valida a assinatura HMAC da Meta,
  descobre de qual conta conectada veio cada evento, casa com a
  palavra-chave de uma automação ativa daquela conta e responde
  automaticamente (resposta pública opcional no comentário + DM com botão
  de link).
- OAuth completo: autorizar → trocar code por token → token de longa
  duração → salvar/atualizar a conta na lista, sem apagar as outras.
- Cron diário (`vercel.json`) que renova o token de todas as contas
  conectadas.
- **Automações** (`/automacoes`): criar, ativar/pausar e excluir — sempre
  na conta ativa.
- **Contatos** e **Atividade**: mostram dados reais, filtrados pela conta
  ativa.
- Páginas de Política de Privacidade e Termos (exigidas pela Meta).

## O que ainda falta (próximas etapas)

- **Fluxos**: o editor visual (estilo ManyChat, com blocos e setas) ainda
  não existe — hoje é só uma página "em construção". É o próximo módulo
  grande.
- **Disparos**: envio manual de mensagem pra quem já interagiu.
- **Lembrete depois de X minutos**: a coluna já existe na tabela, mas o
  processamento por fila (`message_queue`) ainda não foi implementado —
  hoje a automação só responde na hora.
- Fila com trava atômica (`FOR UPDATE SKIP LOCKED`) pra nunca enviar em
  dobro, como o DirectPro original faz.
- Limite de envio (mensagens por segundo/hora) ainda não está aplicado.
- Importar/exportar fluxo em `.json`.

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
