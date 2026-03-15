/* =========================================================
   CONFIGURAÇÃO DO SUPABASE
   URL e chave pública do projeto
   ========================================================= */
const SUPABASE_URL = "https://xrtmhxpyvqvrjlwtyakv.supabase.co";
const SUPABASE_KEY = "sb_publishable_C2SR6u5i0KpIQdozqFJEdg_ij2IbLsg";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================================================
   REFERÊNCIAS DOS ELEMENTOS DO DOM
   Centraliza todos os elementos usados no JS
   ========================================================= */
const elementos = {
  formTarefa: document.getElementById("form-tarefa"),
  inputTitulo: document.getElementById("titulo"),
  inputDescricao: document.getElementById("descricao"),

  listaTarefas: document.getElementById("lista-tarefas"),
  btnRecarregar: document.getElementById("btn-recarregar"),
  contadorTarefas: document.getElementById("contador-tarefas"),
  botoesFiltro: document.querySelectorAll(".filtro-btn"),
  inputBusca: document.getElementById("input-busca"),

  totalTarefas: document.getElementById("total-tarefas"),
  totalPendentes: document.getElementById("total-pendentes"),
  totalConcluidas: document.getElementById("total-concluidas"),

  formEditarTarefa: document.getElementById("form-editar-tarefa"),
  inputEditarId: document.getElementById("editar-id"),
  inputEditarTitulo: document.getElementById("editar-titulo"),
  inputEditarDescricao: document.getElementById("editar-descricao"),

  modalEditarElemento: document.getElementById("modal-editar-tarefa"),
  mensagemEdicaoBloqueada: document.getElementById("mensagem-edicao-bloqueada")
};

/* =========================================================
   INSTÂNCIA DO MODAL BOOTSTRAP
   ========================================================= */
const modalEditar = new bootstrap.Modal(elementos.modalEditarElemento);

/* =========================================================
   ESTADO GLOBAL DA APLICAÇÃO
   Guarda filtro atual, busca e cache das tarefas
   ========================================================= */
const estado = {
  filtroAtual: "todas",
  termoBusca: "",
  tarefasCache: [],
  timersAviso: {
    entrada: null,
    saida: null,
    ocultar: null
  }
};

/* =========================================================
   FUNÇÃO DE FORMATAÇÃO DE DATA
   Recebe ISO e devolve data mais amigável
   ========================================================= */
function formatarData(dataIso) {
  if (!dataIso) return "Desconhecida";

  return new Date(dataIso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/* =========================================================
   FUNÇÃO PARA ATUALIZAR O BADGE DO TOPO
   ========================================================= */
function atualizarContador(total) {
  elementos.contadorTarefas.textContent = `${total} ${total === 1 ? "tarefa" : "tarefas"}`;
}

/* =========================================================
   FUNÇÃO PARA ATUALIZAR O DASHBOARD
   Mostra totais no topo da página
   ========================================================= */
function atualizarDashboard(tarefas) {
  const total = tarefas.length;
  const pendentes = tarefas.filter((tarefa) => !tarefa.concluida).length;
  const concluidas = tarefas.filter((tarefa) => tarefa.concluida).length;

  elementos.totalTarefas.textContent = total;
  elementos.totalPendentes.textContent = pendentes;
  elementos.totalConcluidas.textContent = concluidas;
}

/* =========================================================
   FUNÇÃO PARA DESTACAR O FILTRO ATIVO
   ========================================================= */
function atualizarBotoesFiltro() {
  elementos.botoesFiltro.forEach((botao) => {
    const ativo = botao.dataset.filtro === estado.filtroAtual;
    botao.classList.toggle("btn-dark", ativo);
    botao.classList.toggle("btn-outline-dark", !ativo);
  });
}

/* =========================================================
   BUSCA DA TAREFA PELO ID
   Usa o cache carregado da API
   ========================================================= */
function obterTarefaPorId(id) {
  return estado.tarefasCache.find((item) => item.id === id);
}

/* =========================================================
   ALERTA VISUAL PARA EDIÇÃO BLOQUEADA
   Usado quando a tarefa está concluída
   ========================================================= */
function mostrarAvisoEdicaoBloqueada() {
  const aviso = elementos.mensagemEdicaoBloqueada;
  const { timersAviso } = estado;

  clearTimeout(timersAviso.entrada);
  clearTimeout(timersAviso.saida);
  clearTimeout(timersAviso.ocultar);

  aviso.classList.remove("d-none", "saindo", "visivel");

  timersAviso.entrada = setTimeout(() => {
    aviso.classList.add("visivel");
  }, 10);

  timersAviso.saida = setTimeout(() => {
    aviso.classList.remove("visivel");
    aviso.classList.add("saindo");

    timersAviso.ocultar = setTimeout(() => {
      aviso.classList.add("d-none");
      aviso.classList.remove("saindo");
    }, 600);
  }, 5000);
}

/* =========================================================
   ORDENAÇÃO INTELIGENTE
   Pendentes primeiro, concluídas depois
   Dentro de cada grupo, mais recentes primeiro
   ========================================================= */
function ordenarTarefas(tarefas) {
  return [...tarefas].sort((a, b) => {
    if (a.concluida !== b.concluida) {
      return a.concluida - b.concluida;
    }

    return b.id - a.id;
  });
}

/* =========================================================
   FILTRO POR STATUS
   ========================================================= */
function aplicarFiltro(tarefas) {
  switch (estado.filtroAtual) {
    case "pendentes":
      return tarefas.filter((tarefa) => !tarefa.concluida);
    case "concluidas":
      return tarefas.filter((tarefa) => tarefa.concluida);
    default:
      return tarefas;
  }
}

/* =========================================================
   FILTRO POR TEXTO DE BUSCA
   Pesquisa em título e descrição
   ========================================================= */
function aplicarBusca(tarefas) {
  const termo = estado.termoBusca.trim().toLowerCase();

  if (!termo) return tarefas;

  return tarefas.filter((tarefa) => {
    const titulo = (tarefa.titulo ?? "").toLowerCase();
    const descricao = (tarefa.descricao ?? "").toLowerCase();

    return titulo.includes(termo) || descricao.includes(termo);
  });
}

/* =========================================================
   CRIAÇÃO DOS BOTÕES INDIVIDUAIS
   ========================================================= */
function gerarBotaoEditar(tarefa) {
  const titulo = tarefa.concluida
    ? "Reabra a tarefa para editar"
    : "Editar tarefa";

  const classeBotao = tarefa.concluida
    ? "btn-outline-secondary"
    : "btn-outline-primary";

  return `
    <span title="${titulo}">
      <button
        class="btn btn-sm ${classeBotao}"
        data-action="editar"
        data-id="${tarefa.id}"
      >
        <i class="bi bi-pencil-square me-1"></i>Editar
      </button>
    </span>
  `;
}

function gerarBotaoConclusao(tarefa) {
  const classeBotao = tarefa.concluida
    ? "btn-outline-warning"
    : "btn-outline-success";

  const textoBotao = tarefa.concluida ? "Reabrir" : "Concluir";
  const icone = tarefa.concluida ? "bi-arrow-counterclockwise" : "bi-check2-circle";

  return `
    <button
      class="btn btn-sm ${classeBotao}"
      data-action="concluir"
      data-id="${tarefa.id}"
      data-concluida="${tarefa.concluida}"
    >
      <i class="bi ${icone} me-1"></i>${textoBotao}
    </button>
  `;
}

function gerarBotaoApagar(tarefa) {
  return `
    <button
      class="btn btn-sm btn-outline-danger"
      data-action="apagar"
      data-id="${tarefa.id}"
    >
      <i class="bi bi-trash3 me-1"></i>Apagar
    </button>
  `;
}

/* =========================================================
   HTML DE CADA TAREFA
   ========================================================= */
function gerarHtmlTarefa(tarefa) {
  return `
    <li class="list-group-item ${tarefa.concluida ? "tarefa-concluida" : ""}">
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div class="flex-grow-1">
          <div class="fw-bold titulo-tarefa">${tarefa.titulo}</div>
          <div class="tarefa-descricao mb-2">${tarefa.descricao ?? ""}</div>

          <div class="tarefa-meta d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-1 gap-sm-0">
            <span>Estado: ${tarefa.concluida ? "Concluída" : "Pendente"}</span>
            <span class="d-none d-sm-inline mx-2">|</span>
            <span>Criada em ${formatarData(tarefa.created_at)}</span>
          </div>
        </div>

        <div class="d-flex gap-2 flex-wrap">
          ${gerarBotaoEditar(tarefa)}
          ${gerarBotaoConclusao(tarefa)}
          ${gerarBotaoApagar(tarefa)}
        </div>
      </div>
    </li>
  `;
}

/* =========================================================
   ESTADOS VISUAIS DA LISTA
   ========================================================= */
function renderizarEstadoVazio() {
  elementos.listaTarefas.innerHTML = `
    <li class="list-group-item text-muted">
      Nenhuma tarefa encontrada para os filtros atuais.
    </li>
  `;
}

function renderizarEstadoCarregando() {
  elementos.listaTarefas.innerHTML = `
    <li class="list-group-item">A carregar tarefas...</li>
  `;
}

function renderizarEstadoErro(mensagem) {
  elementos.listaTarefas.innerHTML = `
    <li class="list-group-item text-danger">
      Erro ao carregar: ${mensagem}
    </li>
  `;
}

/* =========================================================
   RENDERIZAÇÃO FINAL DAS TAREFAS
   ========================================================= */
function renderizarTarefas(tarefas) {
  if (!tarefas || tarefas.length === 0) {
    renderizarEstadoVazio();
    return;
  }

  elementos.listaTarefas.innerHTML = tarefas.map(gerarHtmlTarefa).join("");
}

/* =========================================================
   PREPARAÇÃO COMPLETA DOS DADOS PARA EXIBIÇÃO
   Ordem:
   1. ordenar
   2. filtrar por status
   3. filtrar por busca
   ========================================================= */
function prepararTarefasParaExibicao() {
  const tarefasOrdenadas = ordenarTarefas(estado.tarefasCache);
  const tarefasFiltradas = aplicarFiltro(tarefasOrdenadas);
  const tarefasBuscadas = aplicarBusca(tarefasFiltradas);

  renderizarTarefas(tarefasBuscadas);
  atualizarBotoesFiltro();
  atualizarContador(estado.tarefasCache.length);
  atualizarDashboard(estado.tarefasCache);
}

/* =========================================================
   CARREGAR TAREFAS DO SUPABASE
   ========================================================= */
async function carregarTarefas() {
  renderizarEstadoCarregando();

  const { data, error } = await client
    .from("tarefas")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Erro ao carregar tarefas:", error);
    renderizarEstadoErro(error.message);
    return;
  }

  estado.tarefasCache = data;
  prepararTarefasParaExibicao();
}

/* =========================================================
   CRIAR NOVA TAREFA
   ========================================================= */
async function criarTarefa(event) {
  event.preventDefault();

  const titulo = elementos.inputTitulo.value.trim();
  const descricao = elementos.inputDescricao.value.trim();

  if (!titulo) {
    alert("O título é obrigatório.");
    return;
  }

  const { error } = await client
    .from("tarefas")
    .insert([
      {
        titulo,
        descricao,
        concluida: false
      }
    ]);

  if (error) {
    console.error("Erro ao guardar tarefa:", error);
    alert("Erro ao guardar tarefa: " + error.message);
    return;
  }

  elementos.formTarefa.reset();
  await carregarTarefas();
}

/* =========================================================
   ABRIR MODAL DE EDIÇÃO
   ========================================================= */
function abrirEdicao(id) {
  const tarefa = obterTarefaPorId(id);

  if (!tarefa) {
    alert("Tarefa não encontrada.");
    return;
  }

  if (tarefa.concluida) {
    mostrarAvisoEdicaoBloqueada();
    return;
  }

  elementos.inputEditarId.value = tarefa.id;
  elementos.inputEditarTitulo.value = tarefa.titulo;
  elementos.inputEditarDescricao.value = tarefa.descricao ?? "";
  modalEditar.show();
}

/* =========================================================
   GUARDAR EDIÇÃO
   ========================================================= */
async function guardarEdicao(event) {
  event.preventDefault();

  const id = Number(elementos.inputEditarId.value);
  const titulo = elementos.inputEditarTitulo.value.trim();
  const descricao = elementos.inputEditarDescricao.value.trim();

  if (!titulo) {
    alert("O título é obrigatório.");
    return;
  }

  const { error } = await client
    .from("tarefas")
    .update({ titulo, descricao })
    .eq("id", id);

  if (error) {
    console.error("Erro ao editar tarefa:", error);
    alert("Erro ao editar tarefa: " + error.message);
    return;
  }

  modalEditar.hide();
  await carregarTarefas();
}

/* =========================================================
   CONCLUIR / REABRIR TAREFA
   ========================================================= */
async function alternarConclusao(id, estadoAtual) {
  const { error } = await client
    .from("tarefas")
    .update({ concluida: !estadoAtual })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar tarefa:", error);
    alert("Erro ao atualizar tarefa: " + error.message);
    return;
  }

  await carregarTarefas();
}

/* =========================================================
   APAGAR TAREFA
   ========================================================= */
async function apagarTarefa(id) {
  const confirmar = confirm("Deseja realmente apagar esta tarefa?");

  if (!confirmar) return;

  const { error } = await client
    .from("tarefas")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao apagar tarefa:", error);
    alert("Erro ao apagar tarefa: " + error.message);
    return;
  }

  await carregarTarefas();
}

/* =========================================================
   TRATAR CLIQUES NA LISTA
   Usa delegação de eventos para os botões
   ========================================================= */
async function tratarCliqueLista(event) {
  const botao = event.target.closest("button[data-action]");

  if (!botao) return;

  const acao = botao.dataset.action;
  const id = Number(botao.dataset.id);

  if (acao === "editar") {
    const tarefa = obterTarefaPorId(id);

    if (tarefa?.concluida) {
      mostrarAvisoEdicaoBloqueada();
      return;
    }

    abrirEdicao(id);
    return;
  }

  if (acao === "concluir") {
    const concluida = botao.dataset.concluida === "true";
    await alternarConclusao(id, concluida);
    return;
  }

  if (acao === "apagar") {
    await apagarTarefa(id);
  }
}

/* =========================================================
   CONFIGURAÇÃO DOS EVENTOS DA APLICAÇÃO
   ========================================================= */
function configurarEventos() {
  elementos.botoesFiltro.forEach((botao) => {
    botao.addEventListener("click", () => {
      estado.filtroAtual = botao.dataset.filtro;
      prepararTarefasParaExibicao();
    });
  });

  elementos.inputBusca.addEventListener("input", (event) => {
    estado.termoBusca = event.target.value;
    prepararTarefasParaExibicao();
  });

  elementos.formTarefa.addEventListener("submit", criarTarefa);
  elementos.formEditarTarefa.addEventListener("submit", guardarEdicao);
  elementos.btnRecarregar.addEventListener("click", carregarTarefas);
  elementos.listaTarefas.addEventListener("click", tratarCliqueLista);
}

/* =========================================================
   INICIALIZAÇÃO DA APLICAÇÃO
   ========================================================= */
function inicializar() {
  configurarEventos();
  carregarTarefas();
}

inicializar();