/* ══ ASSISTENTE PRUMO — função serverless (Vercel) ══
   Faz UMA chamada ao Claude por requisição. O loop de ferramentas roda no navegador: as ferramentas
   usam os mesmos cálculos do app (calcMes, calcCaixaMes, calcCicloVida), então a resposta do assistente
   nunca diverge do que a tela mostra. Aqui ficam só o que não pode ir pro cliente: a chave da API,
   o prompt de sistema e a lista de ferramentas (o cliente manda apenas as mensagens).

   Variáveis de ambiente (Vercel → Settings → Environment Variables):
     ANTHROPIC_API_KEY   chave da API (console.anthropic.com)
     ASSISTENTE_EMAILS   e-mails autorizados, separados por vírgula — sem isso ninguém usa */
import Anthropic from "@anthropic-ai/sdk";
import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_PROJECT_ID = "fincontrol-4f015";
// Chaves públicas que assinam os ID tokens do Firebase Auth — verificação sem service account
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const MAX_BODY_CHARS = 400000;
const MAX_MESSAGES = 80;

const client = new Anthropic(); // lê ANTHROPIC_API_KEY

const SYSTEM = `Você é o assistente financeiro do Prumo, um app de finanças pessoais. Conversa com o dono da conta sobre os dados dele: orçamento do mês, fluxo de caixa, fixas, patrimônio, metas e a projeção de longo prazo (ciclo de vida).

Como o Prumo conta as coisas — use exatamente estes conceitos:
- "Pode gastar" é o número principal do app, por competência (o gasto conta no dia em que aconteceu, cartão inclusive), só a parte do usuário: renda − fixas do mês (todas, pagas ou não) − parcelas − variável já lançado. Por dia = pode gastar ÷ dias restantes do mês, contando hoje.
- "Saldo na conta" é o regime de caixa (a fatura conta no mês em que vence). Não é orçamento: serve para saber se a conta aguenta. A diferença entre os dois quase sempre é o cartão — a fatura do mês traz compras de meses anteriores.
- A fatura do cartão de cada mês vem pronta em "fatura_cartao", pelo mês em que vence: "valor_cheio" é o que o banco cobra; "sua_parte" tira as partes divididas e os reembolsos; "parcelado" é quanto dela é de parcelas; "fixas_no_cartao_previstas" aparece quando a fatura ainda não tem compra real e o caixa conta as fixas de cartão no lugar. Use esses números como estão — nunca estime a fatura por subtração.
- Fixa "teto" (ex.: iFood) é um limite de gasto da categoria: os lançamentos dela consomem o valor, e só o saldo do teto entra nas contas.
- Fixas da categoria de investimentos são o aporte mensal. Poupar é prioridade inegociável para este usuário: nunca sugira reduzir ou pausar o aporte para sobrar dinheiro. Cortes de despesa servem para aumentar a poupança.
- O ciclo de vida projeta o patrimônio financeiro em valores reais (já sem inflação), com capitalização mensal: acumula até a aposentadoria e consome depois, até a expectativa de vida. As premissas de retorno e yield seguem os perfis da Suno (Conservador 4%/4%, Moderado 5%/4,5%, Arrojado 6,5%/5,5%, Sofisticado 7%/6% ao ano). "Capital necessário" depende da estratégia: preservar (viver do yield), consumir (zerar no fim) ou legado.

Dados:
- A primeira mensagem traz um retrato dos dados do app no momento em que a conversa começou, entre as tags <dados_do_prumo>. Os números ali são calculados pelo próprio app — use-os como estão.
- Para qualquer número que não esteja no retrato, ou para cenários "e se", use as ferramentas. Nunca faça de cabeça uma projeção que uma ferramenta calcula: as ferramentas usam o mesmo motor do app, e a resposta precisa bater com a tela.
- Os meses com dados estão em "meses_com_dados" no retrato (de/até): o ano aberto no app, os últimos meses do ano anterior e o ano seguinte. Meses futuros só têm o que já é conhecido (fixas e parcelas), sem gasto variável. Se perguntarem sobre algo fora desse intervalo, diga que o app não tem o dado.
- Se um dado não existe ou está zerado (ex.: patrimônio não preenchido), diga isso em vez de supor um valor.

Limites:
- Você não é consultor de investimentos credenciado: não recomende ativos, fundos, ações ou corretoras específicas. Pode explicar conceitos, fazer contas de planejamento e mostrar o efeito de premissas diferentes, deixando claro que premissa não é promessa de retorno.

Formato da resposta (a tela é um chat pequeno, no celular):
- Português do Brasil, direto e curto: comece pela resposta, depois o porquê em poucas linhas.
- Valores em reais no formato R$ 1.234,56.
- Pode usar listas com "- " e **negrito**. Não use tabelas, títulos com # nem blocos de código.`;

const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });

const TOOLS = [
  {
    name: "consultar_mes",
    description: "Retorna a conta completa de um mês dentro de meses_com_dados (inclusive do ano seguinte): pode gastar (competência) com renda, fixas, parcelas e variável; o saldo na conta (caixa) daquele mês; a fatura do cartão que vence nele (valor cheio, sua parte e parcelado); e o gasto por categoria. Use quando a pergunta for sobre um mês específico que não está detalhado no retrato inicial, ou quando o usuário disser que lançou algo depois do início da conversa.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        ano_mes: { type: "string", description: "Mês no formato AAAA-MM, ex.: 2026-08" },
      },
      required: ["ano_mes"],
      additionalProperties: false,
    },
  },
  {
    name: "listar_lancamentos",
    description: "Lista os lançamentos (gastos) de um mês dentro de meses_com_dados, com descrição, data, valor da parte do usuário, categoria e forma de pagamento, mais o total. Use para perguntas como \"quanto gastei de iFood em agosto\", \"qual foi meu maior gasto\" ou \"o que entrou no cartão\".",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        ano_mes: { type: "string", description: "Mês no formato AAAA-MM" },
        categoria: nullable({ type: "string", description: "Nome ou id da categoria para filtrar (subcategorias entram junto); null para todas" }),
        busca: nullable({ type: "string", description: "Trecho da descrição para filtrar, ex.: \"uber\"; null para não filtrar" }),
      },
      required: ["ano_mes", "categoria", "busca"],
      additionalProperties: false,
    },
  },
  {
    name: "simular_ciclo_vida",
    description: "Roda a projeção de ciclo de vida do app (patrimônio até a aposentadoria e depois) com as premissas atuais do usuário, trocando só os campos informados, e devolve o resultado atual e o simulado lado a lado: patrimônio na aposentadoria, capital necessário, idade em que atinge a meta, idade em que o dinheiro acaba, aporte e retorno necessários, patrimônio no fim. Use para qualquer pergunta \"e se\" sobre aposentadoria, independência financeira, aporte ou retorno. Campos null mantêm a premissa atual.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        idade_aposentadoria: nullable({ type: "number", description: "Idade em que quer parar de aportar e passar a viver do patrimônio" }),
        renda_desejada: nullable({ type: "number", description: "Renda mensal desejada na aposentadoria, em R$ de hoje" }),
        aporte_mensal: nullable({ type: "number", description: "Aporte mensal a partir de hoje, em R$" }),
        retorno_real: nullable({ type: "number", description: "Retorno real anual na acumulação, em %, ex.: 6.5" }),
        yield: nullable({ type: "number", description: "Yield anual na aposentadoria, em %, ex.: 5.5" }),
        patrimonio_inicial: nullable({ type: "number", description: "Patrimônio financeiro de partida, em R$" }),
        estrategia: nullable({ type: "string", enum: ["preservacao", "consumir", "legado"], description: "O que fazer com o patrimônio na aposentadoria" }),
      },
      required: ["idade_aposentadoria", "renda_desejada", "aporte_mensal", "retorno_real", "yield", "patrimonio_inicial", "estrategia"],
      additionalProperties: false,
    },
  },
  {
    name: "simular_compra",
    description: "Simula uma compra (à vista ou parcelada) nos próximos meses, podendo cruzar para o ano seguinte até o fim de meses_com_dados, e devolve, mês a mês, o pode gastar e o saldo na conta antes e depois da compra, e o mês que fica mais apertado. Use quando o usuário perguntar se pode comprar algo, em quantas vezes vale parcelar ou qual o melhor mês para uma compra.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        valor_total: { type: "number", description: "Valor total da compra em R$" },
        parcelas: { type: "integer", description: "Número de parcelas; 1 para à vista" },
        ano_mes_inicio: { type: "string", description: "Mês da compra (primeira parcela), formato AAAA-MM" },
        forma: { type: "string", enum: ["cartao", "pix"], description: "cartao: cai na fatura; pix: sai da conta no próprio mês" },
      },
      required: ["valor_total", "parcelas", "ano_mes_inicio", "forma"],
      additionalProperties: false,
    },
  },
];

// Cliente só pode mandar turnos de usuário/assistente — instrução de sistema é exclusiva do servidor
function validarMensagens(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return "messages inválido";
  if (messages[0].role !== "user") return "a conversa precisa começar pelo usuário";
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return "papel de mensagem inválido";
    if (typeof m.content !== "string" && !Array.isArray(m.content)) return "conteúdo inválido";
  }
  return null;
}

async function usuarioAutorizado(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], JWKS, {
      issuer: "https://securetoken.google.com/" + FIREBASE_PROJECT_ID,
      audience: FIREBASE_PROJECT_ID,
    });
    const permitidos = (process.env.ASSISTENTE_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const email = String(payload.email || "").toLowerCase();
    if (!payload.email_verified || !email || !permitidos.includes(email)) return null;
    return { uid: payload.sub, email };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "método não permitido" });
  }
  const user = await usuarioAutorizado(req);
  if (!user) return res.status(401).json({ erro: "não autorizado — confira se seu e-mail está em ASSISTENTE_EMAILS na Vercel" });

  const body = req.body || {};
  if (JSON.stringify(body).length > MAX_BODY_CHARS) return res.status(413).json({ erro: "conversa longa demais — comece uma nova" });
  const invalido = validarMensagens(body.messages);
  if (invalido) return res.status(400).json({ erro: invalido });

  try {
    const response = await client.beta.messages.create({
      model: "claude-sonnet-5-5", // Sonnet: metade do preço do Opus, suficiente pra perguntas sobre os dados do app
      max_tokens: 16000,
      // Recusa por classificador de segurança: refaz no modelo recomendado em vez de devolver a recusa
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      cache_control: { type: "ephemeral" }, // sistema + ferramentas + retrato dos dados se repetem a cada passo do loop
      system: SYSTEM,
      tools: TOOLS,
      messages: body.messages,
    });
    return res.status(200).json({
      content: response.content,
      stop_reason: response.stop_reason,
      stop_details: response.stop_details ?? null,
      model: response.model,
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ erro: "muitas perguntas seguidas — espere um pouco" });
    if (error instanceof Anthropic.BadRequestError) {
      console.error("[assistente] 400", error.message);
      return res.status(400).json({ erro: "a conversa ficou inconsistente — comece uma nova" });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("[assistente] chave da API inválida");
      return res.status(500).json({ erro: "assistente mal configurado" });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[assistente] API", error.status, error.message);
      return res.status(502).json({ erro: "o assistente está indisponível agora" });
    }
    console.error("[assistente]", error);
    return res.status(500).json({ erro: "erro inesperado" });
  }
}
