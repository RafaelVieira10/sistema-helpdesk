// ===== Sistema de Help Desk – "Balcão" =====
// Os dados ficam salvos no navegador (localStorage).

const CHAVE = "helpdesk_chamados";
let chamados = [];

// ---------- Persistência ----------
function carregar() {
  try {
    const dados = localStorage.getItem(CHAVE);
    chamados = dados ? JSON.parse(dados) : exemplos();
  } catch (e) {
    chamados = exemplos();
  }
}

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(chamados)); } catch (e) { /* sem armazenamento */ }
}

function exemplos() {
  const agora = Date.now();
  const h = 3600000;
  return [
    criarObjeto(1, "Impressora do 2º andar não imprime", "Mariana Souza", "Hardware", "Alta",
      "A impressora mostra erro de papel atolado, mas não há papel preso.", "Aberto", agora - 2 * h),
    criarObjeto(2, "Esqueci a senha do sistema acadêmico", "Carlos Lima", "Acesso / Senha", "Média",
      "Tentei recuperar pelo e-mail, mas o link não chega.", "Em andamento", agora - 26 * h),
    criarObjeto(3, "Wi-Fi caindo no laboratório 3", "Ana Ribeiro", "Rede / Internet", "Alta",
      "A conexão cai a cada 10 minutos em todos os computadores.", "Aberto", agora - 5 * h),
    criarObjeto(4, "Instalar o VS Code na máquina 12", "Pedro Alves", "Software", "Baixa",
      "Preciso do editor para as aulas de programação.", "Resolvido", agora - 72 * h)
  ];
}

function criarObjeto(id, titulo, solicitante, categoria, prioridade, descricao, status, data) {
  return {
    id, titulo, solicitante, categoria, prioridade, descricao, status,
    criadoEm: data,
    historico: [{ data, texto: "Chamado aberto" }]
  };
}

function proximoId() {
  return chamados.length ? Math.max(...chamados.map(c => c.id)) + 1 : 1;
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

function classeStatus(status) {
  return "st-" + status.split(" ")[0];
}

function mostrarAviso(msg) {
  const el = $("#aviso");
  el.textContent = msg;
  el.classList.add("mostrar");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("mostrar"), 2500);
}

// ---------- Renderização ----------
function atualizarResumo() {
  $("#cAberto").textContent = chamados.filter(c => c.status === "Aberto").length;
  $("#cAndamento").textContent = chamados.filter(c => c.status === "Em andamento").length;
  $("#cResolvido").textContent = chamados.filter(c => c.status === "Resolvido").length;
  $("#cUrgente").textContent = chamados.filter(c => c.prioridade === "Alta" && c.status !== "Resolvido").length;
}

function renderizar() {
  const termo = $("#busca").value.trim().toLowerCase();
  const fStatus = $("#fStatus").value;
  const fPrioridade = $("#fPrioridade").value;
  const ordemPrioridade = { Alta: 0, "Média": 1, Baixa: 2 };

  const filtrados = chamados
    .filter(c => !fStatus || c.status === fStatus)
    .filter(c => !fPrioridade || c.prioridade === fPrioridade)
    .filter(c => !termo ||
      c.titulo.toLowerCase().includes(termo) ||
      c.solicitante.toLowerCase().includes(termo) ||
      String(c.id) === termo.replace("#", ""))
    .sort((a, b) =>
      (a.status === "Resolvido") - (b.status === "Resolvido") ||
      ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade] ||
      b.criadoEm - a.criadoEm);

  const lista = $("#lista");
  if (!filtrados.length) {
    lista.innerHTML = chamados.length
      ? `<div class="vazio">Nenhum chamado corresponde aos filtros. Tente limpar a busca.</div>`
      : `<div class="vazio">Nenhum chamado ainda. Clique em “Abrir chamado” para registrar o primeiro.</div>`;
  } else {
    lista.innerHTML = filtrados.map(c => `
      <button class="ticket ${classeStatus(c.status)}" data-id="${c.id}">
        <div class="canhoto">
          <span class="num">#${c.id}</span>
          <span class="rotulo">${formatarData(c.criadoEm).split(" ")[0]}</span>
        </div>
        <div class="corpo">
          <h3>${escapar(c.titulo)}</h3>
          <p class="meta">${escapar(c.solicitante)} | ${escapar(c.categoria)}</p>
          <div class="etiquetas">
            <span class="etiqueta status">${c.status}</span>
            <span class="etiqueta p-${c.prioridade}">Prioridade ${c.prioridade.toLowerCase()}</span>
          </div>
        </div>
      </button>`).join("");
  }
  atualizarResumo();
}

// ---------- Formulário (criar / editar) ----------
function abrirFormulario(chamado = null) {
  const form = $("#formChamado");
  form.reset();
  form.querySelectorAll(".erro").forEach(e => (e.textContent = ""));
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
  $("#modalForm").showModal();
  $("#titulo").focus();
}

function validar() {
  const regras = {
    titulo: v => v.length >= 5 || "Escreva um título com pelo menos 5 caracteres.",
    solicitante: v => v.length >= 3 || "Informe seu nome (mínimo 3 caracteres).",
    descricao: v => v.length >= 10 || "Descreva o problema com pelo menos 10 caracteres."
  };
  let ok = true;
  for (const campo in regras) {
    const res = regras[campo]($("#" + campo).value.trim());
    const erro = document.querySelector(`.erro[data-para="${campo}"]`);
    erro.textContent = res === true ? "" : res;
    if (res !== true) ok = false;
  }
  return ok;
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
    Object.assign(c, dados);
    c.historico.push({ data: Date.now(), texto: "Chamado editado" });
    mostrarAviso(`Chamado #${c.id} salvo`);
  } else {
    const novo = criarObjeto(proximoId(), dados.titulo, dados.solicitante, dados.categoria,
      dados.prioridade, dados.descricao, "Aberto", Date.now());
    chamados.push(novo);
    mostrarAviso(`Chamado #${novo.id} aberto`);
  }
  salvar();
  renderizar();
  $("#modalForm").close();
});

// ---------- Detalhes ----------
function abrirDetalhe(id) {
  const c = chamados.find(x => x.id === id);
  if (!c) return;
  $("#conteudoDetalhe").innerHTML = `
    <h2>#${c.id} ${escapar(c.titulo)}</h2>
    <p class="meta">Aberto por ${escapar(c.solicitante)} em ${formatarData(c.criadoEm)} | ${escapar(c.categoria)}</p>
    <div class="etiquetas ${classeStatus(c.status)}">
      <span class="etiqueta status">${c.status}</span>
      <span class="etiqueta p-${c.prioridade}">Prioridade ${c.prioridade.toLowerCase()}</span>
    </div>
    <h3>Descrição</h3>
    <p class="detalhe-desc">${escapar(c.descricao)}</p>
    <div class="trocar-status">
      <label for="novoStatus"><strong>Status:</strong></label>
      <select id="novoStatus">
        ${["Aberto", "Em andamento", "Resolvido"].map(s =>
          `<option ${s === c.status ? "selected" : ""}>${s}</option>`).join("")}
      </select>
      <button class="btn" id="btnStatus">Atualizar status</button>
    </div>
    <h3>Histórico</h3>
    <ul class="historico">
      ${c.historico.slice().reverse().map(h =>
        `<li><time>${formatarData(h.data)}</time>${escapar(h.texto)}</li>`).join("")}
    </ul>
    <div class="acoes">
      <button class="btn btn-perigo" id="btnExcluir">Excluir</button>
      <button class="btn" id="btnEditar">Editar</button>
      <button class="btn btn-principal" data-fechar>Fechar</button>
    </div>`;

  $("#btnStatus").onclick = () => {
    const novo = $("#novoStatus").value;
    if (novo === c.status) return;
    c.historico.push({ data: Date.now(), texto: `Status alterado de "${c.status}" para "${novo}"` });
    c.status = novo;
    salvar(); renderizar(); abrirDetalhe(c.id);
    mostrarAviso(`Status atualizado para ${novo}`);
  };
  $("#btnEditar").onclick = () => { $("#modalDetalhe").close(); abrirFormulario(c); };
  $("#btnExcluir").onclick = () => {
    if (!confirm(`Excluir o chamado #${c.id}? Essa ação não pode ser desfeita.`)) return;
    chamados = chamados.filter(x => x.id !== c.id);
    salvar(); renderizar();
    $("#modalDetalhe").close();
    mostrarAviso(`Chamado #${c.id} excluído`);
  };

  if (!$("#modalDetalhe").open) $("#modalDetalhe").showModal();
}

// ---------- Eventos gerais ----------
$("#btnNovo").addEventListener("click", () => abrirFormulario());
$("#lista").addEventListener("click", e => {
  const t = e.target.closest(".ticket");
  if (t) abrirDetalhe(Number(t.dataset.id));
});
document.addEventListener("click", e => {
  if (e.target.matches("[data-fechar]")) e.target.closest("dialog").close();
});
["#busca", "#fStatus", "#fPrioridade"].forEach(sel =>
  $(sel).addEventListener("input", renderizar));

// Clicar num contador filtra pelo status
document.querySelectorAll(".contador[data-status]").forEach(el => {
  el.style.cursor = "pointer";
  el.addEventListener("click", () => {
    $("#fStatus").value = $("#fStatus").value === el.dataset.status ? "" : el.dataset.status;
    renderizar();
  });
});

// ---------- Início ----------
carregar();
renderizar();
