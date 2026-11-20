// ===== Sistema de Help Desk – "Balcão" =====
// Os dados ficam salvos no navegador (localStorage).

const CHAVE = "helpdesk_chamados";
const CHAVE_TEMA = "helpdesk_tema";

const STATUS = ["Aberto", "Em andamento", "Resolvido"];
const CATEGORIAS = ["Hardware", "Software", "Rede / Internet", "Acesso / Senha", "Outros"];
const TECNICOS = ["João Martins (N1)", "Fernanda Costa (N1)", "Ricardo Nunes (Infra)"];
const SEM_TECNICO = "Não atribuído";

// Prazo (SLA) para resolver o chamado, em horas, conforme a prioridade
const SLA_HORAS = { Alta: 4, "Média": 24, Baixa: 72 };
const ORDEM_PRIORIDADE = { Alta: 0, "Média": 1, Baixa: 2 };

const HORA = 3600000;

let chamados = [];
let apenasAtrasados = false;

// ---------- Persistência ----------
function carregar() {
  try {
    const dados = localStorage.getItem(CHAVE);
    chamados = dados ? JSON.parse(dados).map(normalizar) : exemplos();
  } catch (e) {
    chamados = exemplos();
  }
}

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(chamados)); } catch (e) { /* sem armazenamento */ }
}

// Garante que chamados salvos por versões antigas tenham todos os campos
function normalizar(c) {
  c.responsavel = c.responsavel || SEM_TECNICO;
  c.historico = (c.historico || []).map(h => ({ tipo: "sistema", ...h }));
  if (c.status === "Resolvido" && !c.resolvidoEm) {
    const ultimo = c.historico.filter(h => h.texto.includes('"Resolvido"')).pop();
    c.resolvidoEm = ultimo ? ultimo.data : c.criadoEm;
  }
  return c;
}

function exemplos() {
  const agora = Date.now();
  const lista = [
    criarObjeto(1, "Impressora do 2º andar não imprime", "Mariana Souza", "Hardware", "Alta",
      "A impressora mostra erro de papel atolado, mas não há papel preso.", agora - 2 * HORA),
    criarObjeto(2, "Esqueci a senha do sistema acadêmico", "Carlos Lima", "Acesso / Senha", "Média",
      "Tentei recuperar pelo e-mail, mas o link não chega.", agora - 26 * HORA),
    criarObjeto(3, "Wi-Fi caindo no laboratório 3", "Ana Ribeiro", "Rede / Internet", "Alta",
      "A conexão cai a cada 10 minutos em todos os computadores.", agora - 5 * HORA),
    criarObjeto(4, "Instalar o VS Code na máquina 12", "Pedro Alves", "Software", "Baixa",
      "Preciso do editor para as aulas de programação.", agora - 72 * HORA),
    criarObjeto(5, "Monitor piscando na recepção", "Juliana Rocha", "Hardware", "Média",
      "O monitor apaga e acende sozinho várias vezes por hora.", agora - 50 * HORA),
    criarObjeto(6, "Acesso ao e-mail institucional bloqueado", "Lucas Ferreira", "Acesso / Senha", "Alta",
      "Aparece a mensagem \"conta suspensa\" ao entrar.", agora - 30 * HORA)
  ];

  // Simula o andamento de alguns chamados para a demonstração
  atribuir(lista[1], TECNICOS[0], agora - 25 * HORA);
  mudarStatus(lista[1], "Em andamento", agora - 25 * HORA);
  comentar(lista[1], TECNICOS[0], "Verificando o servidor de e-mail. Retorno em breve.", agora - 24 * HORA);

  atribuir(lista[2], TECNICOS[2], agora - 4 * HORA);

  atribuir(lista[3], TECNICOS[1], agora - 70 * HORA);
  mudarStatus(lista[3], "Em andamento", agora - 70 * HORA);
  mudarStatus(lista[3], "Resolvido", agora - 66 * HORA);
  comentar(lista[3], "Pedro Alves", "Funcionou, obrigado!", agora - 65 * HORA);

  atribuir(lista[4], TECNICOS[2], agora - 48 * HORA);
  mudarStatus(lista[4], "Resolvido", agora - 20 * HORA);
  comentar(lista[4], TECNICOS[2], "Cabo de vídeo substituído.", agora - 20 * HORA);

  atribuir(lista[5], TECNICOS[0], agora - 29 * HORA);
  mudarStatus(lista[5], "Resolvido", agora - 27 * HORA);

  return lista;
}

function criarObjeto(id, titulo, solicitante, categoria, prioridade, descricao, data) {
  return {
    id, titulo, solicitante, categoria, prioridade, descricao,
    status: "Aberto",
    responsavel: SEM_TECNICO,
    criadoEm: data,
    resolvidoEm: null,
    historico: [{ data, tipo: "sistema", texto: "Chamado aberto" }]
  };
}

function proximoId() {
  return chamados.length ? Math.max(...chamados.map(c => c.id)) + 1 : 1;
}

// ---------- Regras de negócio ----------
function registrar(c, texto, data = Date.now()) {
  c.historico.push({ data, tipo: "sistema", texto });
}

function mudarStatus(c, novo, data = Date.now()) {
  if (novo === c.status) return false;
  registrar(c, `Status alterado de "${c.status}" para "${novo}"`, data);
  c.status = novo;
  c.resolvidoEm = novo === "Resolvido" ? data : null;
  return true;
}

function atribuir(c, tecnico, data = Date.now()) {
  if (tecnico === c.responsavel) return false;
  registrar(c, tecnico === SEM_TECNICO
    ? "Atribuição removida"
    : `Atribuído a ${tecnico}`, data);
  c.responsavel = tecnico;
  return true;
}

function comentar(c, autor, texto, data = Date.now()) {
  c.historico.push({ data, tipo: "comentario", autor, texto });
}

function prazoFinal(c) {
  return c.criadoEm + SLA_HORAS[c.prioridade] * HORA;
}

// Verdadeiro se o chamado passou (ou passou ao ser resolvido) do prazo do SLA
function foraDoPrazo(c) {
  const referencia = c.status === "Resolvido" ? c.resolvidoEm : Date.now();
  return referencia > prazoFinal(c);
}

function atrasado(c) {
  return c.status !== "Resolvido" && foraDoPrazo(c);
}

// ---------- Utilidades ----------
const $ = sel => document.querySelector(sel);

function escapar(txt) {
  const div = document.createElement("div");
  div.textContent = txt;
  return div.innerHTML;
}

function formatarData(ms) {
  return new Date(ms).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatarDiaMes(ms) {
  return new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatarDuracao(ms) {
  //   = espaço que não quebra linha (mantém "5 h" junto)
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
  const d = Math.floor(h / 24);
  return `${d} d${h % 24 ? ` ${h % 24} h` : ""}`;
}

function tempoRelativo(ms) {
  const diff = Date.now() - ms;
  if (diff < 60000) return "agora mesmo";
  return "há " + formatarDuracao(diff).split(" ")[0];
}

function classeStatus(status) {
  return "st-" + status.split(" ")[0];
}

function iniciais(nome) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}

function mostrarAviso(msg) {
  const el = $("#aviso");
  el.textContent = msg;
  el.classList.add("mostrar");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("mostrar"), 2500);
}

// Diálogo de confirmação próprio (substitui o confirm() do navegador)
function confirmar(titulo, texto, rotuloOk = "Confirmar") {
  const modal = $("#modalConfirmar");
  $("#confirmarTitulo").textContent = titulo;
  $("#confirmarTexto").textContent = texto;
  $("#confirmarOk").textContent = rotuloOk;
  modal.returnValue = "";
  modal.showModal();
  return new Promise(resolve =>
    modal.addEventListener("close", () => resolve(modal.returnValue === "sim"), { once: true }));
}

function opcoes(lista, selecionado) {
  return lista.map(v => `<option ${v === selecionado ? "selected" : ""}>${escapar(v)}</option>`).join("");
}

// ---------- Renderização ----------
function atualizarResumo() {
  const pendentes = chamados.filter(c => c.status !== "Resolvido");
  $("#cAberto").textContent = chamados.filter(c => c.status === "Aberto").length;
  $("#cAndamento").textContent = chamados.filter(c => c.status === "Em andamento").length;
  $("#cResolvido").textContent = chamados.filter(c => c.status === "Resolvido").length;
  $("#cAtrasado").textContent = chamados.filter(atrasado).length;

  const resolvidos = chamados.filter(c => c.status === "Resolvido");
  if (resolvidos.length) {
    const media = resolvidos.reduce((s, c) => s + (c.resolvidoEm - c.criadoEm), 0) / resolvidos.length;
    const noPrazo = resolvidos.filter(c => !foraDoPrazo(c)).length;
    $("#kTempo").textContent = formatarDuracao(media);
    $("#kSla").textContent = Math.round(noPrazo / resolvidos.length * 100) + "%";
  } else {
    $("#kTempo").textContent = "–";
    $("#kSla").textContent = "–";
  }
  $("#kAlta").textContent = pendentes.filter(c => c.prioridade === "Alta").length;
  $("#kSemTecnico").textContent = pendentes.filter(c => c.responsavel === SEM_TECNICO).length;

  // Gráfico de barras por categoria (feito só com HTML/CSS)
  const contagem = CATEGORIAS.map(cat => ({
    cat,
    total: chamados.filter(c => c.categoria === cat).length,
    pendentes: pendentes.filter(c => c.categoria === cat).length
  }));
  const maior = Math.max(1, ...contagem.map(x => x.total));
  $("#graficoCategorias").innerHTML = contagem.map(x => `
    <button class="barra" data-categoria="${escapar(x.cat)}"
      title="${x.total} chamado(s), ${x.pendentes} pendente(s) – clique para filtrar">
      <span class="barra-nome">${escapar(x.cat)}</span>
      <span class="barra-trilho">
        <span class="barra-total" style="width:${x.total / maior * 100}%"></span>
        <span class="barra-pend" style="width:${x.pendentes / maior * 100}%"></span>
      </span>
      <span class="barra-valor">${x.total}</span>
    </button>`).join("") +
    `<p class="legenda"><span class="ponto pend"></span>Pendentes <span class="ponto total"></span>Resolvidos</p>`;

  // Destaca o contador que está filtrando
  document.querySelectorAll(".contador[data-status]").forEach(el =>
    el.setAttribute("aria-pressed", String($("#fStatus").value === el.dataset.status)));
  $("#contadorAtraso").setAttribute("aria-pressed", String(apenasAtrasados));
}

function filtrosAtivos() {
  return Boolean($("#busca").value.trim() || $("#fStatus").value || $("#fPrioridade").value ||
    $("#fCategoria").value || apenasAtrasados);
}

function renderizar() {
  const termo = $("#busca").value.trim().toLowerCase();
  const fStatus = $("#fStatus").value;
  const fPrioridade = $("#fPrioridade").value;
  const fCategoria = $("#fCategoria").value;
  const ordem = $("#ordem").value;

  const comparadores = {
    prioridade: (a, b) =>
      (a.status === "Resolvido") - (b.status === "Resolvido") ||
      atrasado(b) - atrasado(a) ||
      ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] ||
      b.criadoEm - a.criadoEm,
    recentes: (a, b) => b.criadoEm - a.criadoEm,
    antigos: (a, b) => a.criadoEm - b.criadoEm
  };

  const filtrados = chamados
    .filter(c => !fStatus || c.status === fStatus)
    .filter(c => !fPrioridade || c.prioridade === fPrioridade)
    .filter(c => !fCategoria || c.categoria === fCategoria)
    .filter(c => !apenasAtrasados || atrasado(c))
    .filter(c => !termo ||
      c.titulo.toLowerCase().includes(termo) ||
      c.solicitante.toLowerCase().includes(termo) ||
      c.descricao.toLowerCase().includes(termo) ||
      String(c.id) === termo.replace("#", ""))
    .sort(comparadores[ordem]);

  const lista = $("#lista");
  if (!filtrados.length) {
    lista.innerHTML = chamados.length
      ? `<div class="vazio">Nenhum chamado corresponde aos filtros. Tente limpar a busca.</div>`
      : `<div class="vazio">Nenhum chamado ainda. Clique em “Abrir chamado” para registrar o primeiro.</div>`;
  } else {
    lista.innerHTML = filtrados.map(c => {
      const comentarios = c.historico.filter(h => h.tipo === "comentario").length;
      return `
      <button class="ticket ${classeStatus(c.status)}${atrasado(c) ? " atrasado" : ""}" data-id="${c.id}">
        <div class="canhoto">
          <span class="num">#${c.id}</span>
          <span class="rotulo">${formatarDiaMes(c.criadoEm)}</span>
        </div>
        <div class="corpo">
          <h3>${escapar(c.titulo)}</h3>
          <p class="meta">${escapar(c.solicitante)} · ${escapar(c.categoria)} · ${tempoRelativo(c.criadoEm)}</p>
          <div class="etiquetas">
            <span class="etiqueta status">${c.status}</span>
            <span class="etiqueta p-${c.prioridade}">Prioridade ${c.prioridade.toLowerCase()}</span>
            ${atrasado(c) ? `<span class="etiqueta sla">⏱ Fora do prazo</span>` : ""}
          </div>
        </div>
        <div class="lateral">
          ${c.responsavel === SEM_TECNICO
            ? `<span class="avatar vazio-av" title="Sem técnico atribuído">?</span>`
            : `<span class="avatar" title="Responsável: ${escapar(c.responsavel)}">${iniciais(c.responsavel)}</span>`}
          ${comentarios ? `<span class="n-coment" title="${comentarios} comentário(s)">💬 ${comentarios}</span>` : ""}
        </div>
      </button>`;
    }).join("");
  }

  $("#totalLista").textContent = filtrados.length === chamados.length
    ? `${chamados.length} chamado(s)`
    : `Mostrando ${filtrados.length} de ${chamados.length} chamado(s)`;
  $("#btnLimpar").hidden = !filtrosAtivos();
  atualizarResumo();
}

// ---------- Formulário (criar / editar) ----------
function atualizarDicas() {
  const p = $("#prioridade").value;
  $("#dicaSla").textContent = `Prazo de atendimento: ${SLA_HORAS[p]} h`;
  $("#contaDescricao").textContent = `${$("#descricao").value.length}/500`;
}

function abrirFormulario(chamado = null) {
  const form = $("#formChamado");
  form.reset();
  form.querySelectorAll(".erro").forEach(e => (e.textContent = ""));
  form.querySelectorAll("[aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
  $("#idEdicao").value = chamado ? chamado.id : "";
  $("#tituloForm").textContent = chamado ? `Editar chamado #${chamado.id}` : "Abrir chamado";
  $("#btnSalvar").textContent = chamado ? "Salvar alterações" : "Abrir chamado";
  if (chamado) {
    $("#titulo").value = chamado.titulo;
    $("#solicitante").value = chamado.solicitante;
    $("#categoria").value = chamado.categoria;
    $("#prioridade").value = chamado.prioridade;
    $("#descricao").value = chamado.descricao;
  }
  atualizarDicas();
  $("#modalForm").showModal();
  $("#titulo").focus();
}

function validar() {
  const regras = {
    titulo: v => v.length >= 5 || "Escreva um título com pelo menos 5 caracteres.",
    solicitante: v => v.length >= 3 || "Informe seu nome (mínimo 3 caracteres).",
    descricao: v => v.length >= 10 || "Descreva o problema com pelo menos 10 caracteres."
  };
  let primeiroErro = null;
  for (const campo in regras) {
    const input = $("#" + campo);
    const res = regras[campo](input.value.trim());
    document.querySelector(`.erro[data-para="${campo}"]`).textContent = res === true ? "" : res;
    if (res === true) input.removeAttribute("aria-invalid");
    else {
      input.setAttribute("aria-invalid", "true");
      primeiroErro = primeiroErro || input;
    }
  }
  if (primeiroErro) primeiroErro.focus();
  return !primeiroErro;
}

$("#formChamado").addEventListener("submit", e => {
  e.preventDefault();
  if (!validar()) return;

  const dados = {
    titulo: $("#titulo").value.trim(),
    solicitante: $("#solicitante").value.trim(),
    categoria: $("#categoria").value,
    prioridade: $("#prioridade").value,
    descricao: $("#descricao").value.trim()
  };
  const idEdicao = Number($("#idEdicao").value);

  if (idEdicao) {
    const c = chamados.find(x => x.id === idEdicao);
    const nomes = { titulo: "título", solicitante: "solicitante", categoria: "categoria",
      prioridade: "prioridade", descricao: "descrição" };
    const alterados = Object.keys(dados).filter(k => dados[k] !== c[k]).map(k => nomes[k]);
    if (alterados.length) {
      Object.assign(c, dados);
      registrar(c, `Chamado editado (${alterados.join(", ")})`);
    }
    mostrarAviso(`Chamado #${c.id} salvo`);
  } else {
    const novo = criarObjeto(proximoId(), dados.titulo, dados.solicitante, dados.categoria,
      dados.prioridade, dados.descricao, Date.now());
    chamados.push(novo);
    mostrarAviso(`Chamado #${novo.id} aberto`);
  }
  salvar();
  renderizar();
  $("#modalForm").close();
});

// ---------- Detalhes ----------
function itemHistorico(h) {
  if (h.tipo === "comentario") {
    return `<li class="comentario">
      <span class="avatar pequeno">${iniciais(h.autor)}</span>
      <div class="balao">
        <div class="balao-topo"><strong>${escapar(h.autor)}</strong><time>${formatarData(h.data)}</time></div>
        <p>${escapar(h.texto)}</p>
      </div>
    </li>`;
  }
  return `<li class="evento"><time>${formatarData(h.data)}</time>${escapar(h.texto)}</li>`;
}

function abrirDetalhe(id) {
  const c = chamados.find(x => x.id === id);
  if (!c) return;

  const prazo = prazoFinal(c);
  let textoPrazo;
  if (c.status === "Resolvido") {
    textoPrazo = `Resolvido em ${formatarDuracao(c.resolvidoEm - c.criadoEm)} ` +
      (foraDoPrazo(c) ? "(fora do prazo)" : "(dentro do prazo)");
  } else if (atrasado(c)) {
    textoPrazo = `Prazo estourado há ${formatarDuracao(Date.now() - prazo)}`;
  } else {
    textoPrazo = `Restam ${formatarDuracao(prazo - Date.now())} do prazo`;
  }
  const autores = [`${c.solicitante} (solicitante)`, ...TECNICOS];

  $("#conteudoDetalhe").innerHTML = `
    <div class="detalhe-topo">
      <h2>#${c.id} ${escapar(c.titulo)}</h2>
      <button class="btn btn-icone" data-fechar aria-label="Fechar">✕</button>
    </div>
    <p class="meta">Aberto por ${escapar(c.solicitante)} em ${formatarData(c.criadoEm)} · ${escapar(c.categoria)}</p>
    <div class="etiquetas ${classeStatus(c.status)}">
      <span class="etiqueta status">${c.status}</span>
      <span class="etiqueta p-${c.prioridade}">Prioridade ${c.prioridade.toLowerCase()}</span>
      <span class="etiqueta ${atrasado(c) || (c.status === "Resolvido" && foraDoPrazo(c)) ? "sla" : "neutra"}">⏱ ${textoPrazo}</span>
    </div>

    <h3>Descrição</h3>
    <p class="detalhe-desc">${escapar(c.descricao)}</p>

    <div class="painel-acoes">
      <label>Status
        <select id="novoStatus">${opcoes(STATUS, c.status)}</select>
      </label>
      <label>Técnico responsável
        <select id="novoResponsavel">${opcoes([SEM_TECNICO, ...TECNICOS], c.responsavel)}</select>
      </label>
    </div>

    <h3>Comentários e histórico</h3>
    <form id="formComentario" class="form-comentario">
      <textarea id="textoComentario" rows="2" maxlength="300" placeholder="Escreva uma resposta ou observação…" aria-label="Comentário"></textarea>
      <div class="form-comentario-rodape">
        <select id="autorComentario" aria-label="Comentar como">
          ${autores.map((a, i) => `<option value="${i}">${escapar(a)}</option>`).join("")}
        </select>
        <button class="btn btn-principal" type="submit">Comentar</button>
      </div>
    </form>
    <ul class="historico">
      ${c.historico.slice().reverse().map(itemHistorico).join("")}
    </ul>

    <div class="acoes">
      <button class="btn btn-perigo" id="btnExcluir">Excluir</button>
      <button class="btn" id="btnEditar">Editar</button>
      <button class="btn btn-principal" data-fechar>Fechar</button>
    </div>`;

  const atualizar = msg => {
    salvar(); renderizar(); abrirDetalhe(c.id);
    if (msg) mostrarAviso(msg);
  };

  $("#novoStatus").onchange = e => {
    if (mudarStatus(c, e.target.value)) atualizar(`Status atualizado para ${c.status}`);
  };
  $("#novoResponsavel").onchange = e => {
    if (atribuir(c, e.target.value)) {
      // Atribuir um técnico a um chamado aberto já o coloca "Em andamento"
      if (c.responsavel !== SEM_TECNICO && c.status === "Aberto") mudarStatus(c, "Em andamento");
      atualizar(c.responsavel === SEM_TECNICO ? "Atribuição removida" : `Atribuído a ${c.responsavel}`);
    }
  };
  $("#formComentario").onsubmit = e => {
    e.preventDefault();
    const texto = $("#textoComentario").value.trim();
    if (!texto) { $("#textoComentario").focus(); return; }
    const i = Number($("#autorComentario").value);
    comentar(c, i === 0 ? c.solicitante : TECNICOS[i - 1], texto);
    atualizar("Comentário adicionado");
    $("#autorComentario").value = String(i);
  };
  $("#btnEditar").onclick = () => { $("#modalDetalhe").close(); abrirFormulario(c); };
  $("#btnExcluir").onclick = async () => {
    const ok = await confirmar("Excluir chamado",
      `Excluir o chamado #${c.id} – “${c.titulo}”? Essa ação não pode ser desfeita.`, "Excluir");
    if (!ok) return;
    chamados = chamados.filter(x => x.id !== c.id);
    salvar(); renderizar();
    $("#modalDetalhe").close();
    mostrarAviso(`Chamado #${c.id} excluído`);
  };

  if (!$("#modalDetalhe").open) $("#modalDetalhe").showModal();
}

// ---------- Exportação ----------
function exportarCsv() {
  const colunas = ["Nº", "Título", "Solicitante", "Categoria", "Prioridade", "Status",
    "Responsável", "Aberto em", "Resolvido em", "Fora do prazo"];
  const celula = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const linhas = chamados.map(c => [
    c.id, c.titulo, c.solicitante, c.categoria, c.prioridade, c.status, c.responsavel,
    formatarData(c.criadoEm), c.resolvidoEm ? formatarData(c.resolvidoEm) : "",
    foraDoPrazo(c) ? "Sim" : "Não"
  ]);
  // ";" e BOM para o Excel em português abrir com acentos e colunas corretas
  const csv = "﻿" + [colunas, ...linhas].map(l => l.map(celula).join(";")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `chamados_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  mostrarAviso("Planilha exportada");
}

// ---------- Tema claro / escuro ----------
function temaAtual() {
  return document.documentElement.dataset.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function atualizarIconeTema() {
  $("#iconeTema").textContent = temaAtual() === "dark" ? "☀" : "☾";
}

$("#btnTema").addEventListener("click", () => {
  const novo = temaAtual() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = novo;
  try { localStorage.setItem(CHAVE_TEMA, novo); } catch (e) { /* sem armazenamento */ }
  atualizarIconeTema();
});

// ---------- Eventos gerais ----------
$("#btnNovo").addEventListener("click", () => abrirFormulario());
$("#lista").addEventListener("click", e => {
  const t = e.target.closest(".ticket");
  if (t) abrirDetalhe(Number(t.dataset.id));
});
document.addEventListener("click", e => {
  if (e.target.closest("[data-fechar]")) e.target.closest("dialog").close();
});
// Clicar fora da janela (no fundo escuro) fecha o modal
document.querySelectorAll("dialog").forEach(d =>
  d.addEventListener("click", e => { if (e.target === d) d.close(); }));

["#busca", "#fStatus", "#fPrioridade", "#fCategoria", "#ordem"].forEach(sel =>
  $(sel).addEventListener("input", renderizar));
$("#prioridade").addEventListener("input", atualizarDicas);
$("#descricao").addEventListener("input", atualizarDicas);

// Clicar num contador filtra pelo status
document.querySelectorAll(".contador[data-status]").forEach(el =>
  el.addEventListener("click", () => {
    $("#fStatus").value = $("#fStatus").value === el.dataset.status ? "" : el.dataset.status;
    renderizar();
  }));
$("#contadorAtraso").addEventListener("click", () => {
  apenasAtrasados = !apenasAtrasados;
  renderizar();
});
// Clicar numa barra do gráfico filtra pela categoria
$("#graficoCategorias").addEventListener("click", e => {
  const b = e.target.closest(".barra");
  if (!b) return;
  $("#fCategoria").value = $("#fCategoria").value === b.dataset.categoria ? "" : b.dataset.categoria;
  renderizar();
});

$("#btnLimpar").addEventListener("click", () => {
  ["#busca", "#fStatus", "#fPrioridade", "#fCategoria"].forEach(sel => ($(sel).value = ""));
  apenasAtrasados = false;
  renderizar();
});
$("#btnExportar").addEventListener("click", exportarCsv);
$("#btnRestaurar").addEventListener("click", async () => {
  const ok = await confirmar("Restaurar dados de exemplo",
    "Todos os chamados atuais serão substituídos pelos chamados de exemplo.", "Restaurar");
  if (!ok) return;
  chamados = exemplos();
  salvar(); renderizar();
  mostrarAviso("Dados de exemplo restaurados");
});

// Atalho: tecla N abre um novo chamado
document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest("input, textarea, select") || document.querySelector("dialog[open]")) return;
  e.preventDefault();
  abrirFormulario();
});

// ---------- Início ----------
$("#categoria").innerHTML = opcoes(CATEGORIAS);
$("#fCategoria").innerHTML += opcoes(CATEGORIAS);
carregar();
renderizar();
atualizarIconeTema();
// Atualiza tempos relativos e prazos a cada minuto
setInterval(renderizar, 60000);
