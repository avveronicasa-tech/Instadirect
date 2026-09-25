import { Pool, type QueryResultRow } from "pg";

// A Vercel + Neon costuma expor a conexão em POSTGRES_URL (ou DATABASE_URL,
// dependendo de como a integração foi criada). Aceitamos as duas.
const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var __idPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __idSchemaReady: Promise<void> | undefined;
}

function getPool(): Pool {
  if (!connectionString) {
    throw new Error(
      "Banco de dados não configurado. Crie um banco (Vercel → Storage → Neon) e reimplante o projeto."
    );
  }
  if (!global.__idPool) {
    global.__idPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return global.__idPool;
}

const SCHEMA_SQL = `
create table if not exists settings (
  key text primary key,
  value text
);

create table if not exists ig_accounts (
  id serial primary key,
  ig_user_id text unique not null,
  username text,
  access_token text not null,
  token_expira_em bigint,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id serial primary key,
  ig_user_id text not null,
  username text,
  tags text[] default '{}',
  email text,
  created_at timestamptz default now()
);

create table if not exists automations (
  id serial primary key,
  nome text not null,
  palavra_chave text not null,
  tipo_correspondencia text not null default 'contem',
  dm_texto text not null default '',
  botao_texto text,
  botao_url text,
  responder_comentario boolean default true,
  comentario_texto text,
  lembrete_minutos int,
  lembrete_texto text,
  ativa boolean default true,
  created_at timestamptz default now()
);

create table if not exists flows (
  id serial primary key,
  nome text not null,
  gatilho_palavra text,
  grafo jsonb not null default '{}'::jsonb,
  ativo boolean default false,
  created_at timestamptz default now()
);

create table if not exists flow_runs (
  id serial primary key,
  flow_id int references flows(id) on delete cascade,
  ig_user_id text not null,
  no_atual text,
  estado jsonb default '{}'::jsonb,
  atualizado_em timestamptz default now()
);

create table if not exists events (
  id serial primary key,
  tipo text not null,
  ig_user_id text,
  username text,
  automation_id int references automations(id) on delete set null,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists message_queue (
  id serial primary key,
  ig_user_id text not null,
  mensagem jsonb not null,
  enviar_apos timestamptz default now(),
  enviado boolean default false,
  created_at timestamptz default now()
);

-- Suporte a múltiplas contas: cada linha passa a pertencer a uma conta.
alter table contacts add column if not exists account_id int references ig_accounts(id) on delete cascade;
alter table automations add column if not exists account_id int references ig_accounts(id) on delete cascade;
alter table events add column if not exists account_id int references ig_accounts(id) on delete cascade;
alter table flows add column if not exists account_id int references ig_accounts(id) on delete cascade;

-- O mesmo comentarista pode existir em contas diferentes, então o "único"
-- passa a ser (conta + pessoa), não só a pessoa.
alter table contacts drop constraint if exists contacts_ig_user_id_key;
create unique index if not exists contacts_conta_pessoa_idx on contacts(account_id, ig_user_id);
`;

async function ensureSchema(): Promise<void> {
  const pool = getPool();
  if (!global.__idSchemaReady) {
    global.__idSchemaReady = pool.query(SCHEMA_SQL).then(() => undefined);
  }
  return global.__idSchemaReady;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureSchema();
  const pool = getPool();
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>(
    "select value from settings where key = $1",
    [key]
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await query(
    `insert into settings (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value`,
    [key, value]
  );
}

export async function isDatabaseConfigured(): Promise<boolean> {
  return Boolean(connectionString);
}

export type ContaInstagram = {
  id: number;
  ig_user_id: string;
  username: string | null;
  access_token: string;
  token_expira_em: string | null;
};

export async function listarContas(): Promise<ContaInstagram[]> {
  return query<ContaInstagram>(
    "select id, ig_user_id, username, access_token, token_expira_em from ig_accounts order by created_at asc"
  );
}

export async function salvarOuAtualizarConta(params: {
  igUserId: string;
  username: string;
  accessToken: string;
  expiraEm: number;
}): Promise<number> {
  const [linha] = await query<{ id: number }>(
    `insert into ig_accounts (ig_user_id, username, access_token, token_expira_em)
     values ($1, $2, $3, $4)
     on conflict (ig_user_id) do update set
       username = excluded.username,
       access_token = excluded.access_token,
       token_expira_em = excluded.token_expira_em
     returning id`,
    [params.igUserId, params.username, params.accessToken, params.expiraEm]
  );
  return linha.id;
}

export async function getContaPorIgUserId(
  igUserId: string
): Promise<ContaInstagram | null> {
  const linhas = await query<ContaInstagram>(
    "select id, ig_user_id, username, access_token, token_expira_em from ig_accounts where ig_user_id = $1",
    [igUserId]
  );
  return linhas[0] ?? null;
}

export async function desconectarConta(id: number): Promise<void> {
  await query("delete from ig_accounts where id = $1", [id]);
}
