export const contaAtiva = {
  handle: "@veronicasa.oficial",
  inicial: "V",
  automacaoAtiva: false,
};

export const contasConectadas = [
  { handle: "@veronicasa.oficial", inicial: "V", conectada: true },
];

export const stats = {
  pessoasAlcancadas: { valor: 20, legenda: "5 novas em 7 dias" },
  mensagensEntregues: { valor: 0, legenda: "vs. 7 dias antes" },
  automacoesAtivas: { valor: 0, legenda: "nenhuma ligada" },
  naFila: { valor: 0, legenda: "nada pendente" },
};

export const ultimasInteracoes: {
  acao: string;
  usuario: string;
  quando: string;
}[] = [
  { acao: "Mandou mensagem", usuario: "@eunicemartinsterapeuta", quando: "ontem" },
  { acao: "Mandou mensagem", usuario: "@eunicemartinsterapeuta", quando: "ontem" },
  { acao: "Mandou mensagem", usuario: "@eunicemartinsterapeuta", quando: "ontem" },
  { acao: "Mandou mensagem", usuario: "@jaowasd", quando: "há 3 dias" },
  { acao: "Mandou mensagem", usuario: "@joaobarbosados491", quando: "há 3 dias" },
  { acao: "Mandou mensagem", usuario: "@academiabrsocialmedia", quando: "há 5 dias" },
  { acao: "Mandou mensagem", usuario: "@academiabrsocialmedia", quando: "há 5 dias" },
];
