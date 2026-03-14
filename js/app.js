console.log("App carregada com sucesso!");

const SUPABASE_URL = "https://xrtmhxpyvqvrjlwtyakv.supabase.co";
const SUPABASE_KEY = "sb_publishable_C2SR6u5i0KpIQdozqFJEdg_ij2IbLsg";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const formTarefa = document.getElementById("form-tarefa");
const inputTitulo = document.getElementById("titulo");
const inputDescricao = document.getElementById("descricao");
const listaTarefas = document.getElementById("lista-tarefas");
const btnRecarregar = document.getElementById("btn-recarregar");
const contadorTarefas = document.getElementById("contador-tarefas");
const botoesFiltro = document.querySelectorAll(".filtro-btn");

const formEditarTarefa = document.getElementById("form-editar-tarefa");
const inputEditarId = document.getElementById("editar-id");
const inputEditarTitulo = document.getElementById("editar-titulo");
const inputEditarDescricao = document.getElementById("editar-descricao");

const modalEditarElemento = document.getElementById("modal-editar-tarefa");
const modalEditar = new bootstrap.Modal(modalEditarElemento);

let filtroAtual = "todas";
let tarefasCache = [];

function formatarData(dataIso) {
  if (!dataIso) {
    return "Desconhecida";
  }

  return new Date(dataIso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function atualizarContador(total) {
  contadorTarefas.textContent = `${total} ${total === 1 ? "tarefa" : "tarefas"}`;
}

function atualizarBotoesFiltro() {
  botoesFiltro.forEach((botao) => {
    const filtroBotao = botao.dataset.filtro;

    if (filtroBotao === filtroAtual) {
      botao.classList.remove("btn-outline-dark");
      botao.classList.add("btn-dark");
    } else {
      botao.classList.remove("btn-dark");
      botao.classList.add("btn-outline-dark");
    }
  });
}

function aplicarFiltro(tarefas) {
  if (filtroAtual === "pendentes") {
    return tarefas.filter((tarefa) => !tarefa.concluida);
  }

  if (filtroAtual === "concluidas") {
    return tarefas.filter((tarefa) => tarefa.concluida);
  }

  return tarefas;
}

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
          <span title="${tarefa.concluida ? "Reabra a tarefa para editar" : "Editar tarefa"}">
            <button
              class="btn btn-sm ${tarefa.concluida ? "btn-outline-secondary" : "btn-outline-primary"}"
              onclick="${tarefa.concluida ? "mostrarMensagemEdicao()" : `abrirEdicao(${tarefa.id})`}"
            >
              Editar
            </button>
          </span>

          <button
            class="btn btn-sm ${tarefa.concluida ? "btn-outline-warning" : "btn-outline-success"}"
            onclick="alternarConclusao(${tarefa.id}, ${tarefa.concluida})"
          >
            ${tarefa.concluida ? "Reabrir" : "Concluir"}
          </button>

          <button
            class="btn btn-sm btn-outline-danger"
            onclick="apagarTarefa(${tarefa.id})"
          >
            Apagar
          </button>
        </div>
      </div>
    </li>
  `;
}

function mostrarMensagemEdicao() {
  alert("Esta tarefa está concluída. Reabra a tarefa para poder editar.");
}

function renderizarTarefas(tarefas) {
  if (!tarefas || tarefas.length === 0) {
    listaTarefas.innerHTML = `
      <li class="list-group-item text-muted">
        Nenhuma tarefa encontrada neste filtro.
      </li>
    `;
    return;
  }

  const html = tarefas.map((tarefa) => gerarHtmlTarefa(tarefa)).join("");
  listaTarefas.innerHTML = html;
}

async function carregarTarefas() {
  listaTarefas.innerHTML = `
    <li class="list-group-item">A carregar tarefas...</li>
  `;

  const { data, error } = await client
    .from("tarefas")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Erro ao carregar tarefas:", error);
    listaTarefas.innerHTML = `
      <li class="list-group-item text-danger">
        Erro ao carregar: ${error.message}
      </li>
    `;
    return;
  }

  tarefasCache = data;

  atualizarContador(data.length);

  const tarefasFiltradas = aplicarFiltro(data);
  renderizarTarefas(tarefasFiltradas);
  atualizarBotoesFiltro();
}

async function criarTarefa(event) {
  event.preventDefault();

  const titulo = inputTitulo.value.trim();
  const descricao = inputDescricao.value.trim();

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

  formTarefa.reset();
  carregarTarefas();
}

function abrirEdicao(id) {
  const tarefa = tarefasCache.find((item) => item.id === id);

  if (!tarefa) {
    alert("Tarefa não encontrada.");
    return;
  }

  if (tarefa.concluida) {
    alert("Reabra a tarefa antes de editar.");
    return;
  }

  inputEditarId.value = tarefa.id;
  inputEditarTitulo.value = tarefa.titulo;
  inputEditarDescricao.value = tarefa.descricao ?? "";
  modalEditar.show();
}

async function guardarEdicao(event) {
  event.preventDefault();

  const id = Number(inputEditarId.value);
  const titulo = inputEditarTitulo.value.trim();
  const descricao = inputEditarDescricao.value.trim();

  if (!titulo) {
    alert("O título é obrigatório.");
    return;
  }

  const { error } = await client
    .from("tarefas")
    .update({
      titulo,
      descricao
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao editar tarefa:", error);
    alert("Erro ao editar tarefa: " + error.message);
    return;
  }

  modalEditar.hide();
  carregarTarefas();
}

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

  carregarTarefas();
}

async function apagarTarefa(id) {
  const confirmar = confirm("Deseja realmente apagar esta tarefa?");

  if (!confirmar) {
    return;
  }

  const { error } = await client
    .from("tarefas")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao apagar tarefa:", error);
    alert("Erro ao apagar tarefa: " + error.message);
    return;
  }

  carregarTarefas();
}

botoesFiltro.forEach((botao) => {
  botao.addEventListener("click", () => {
    filtroAtual = botao.dataset.filtro;
    carregarTarefas();
  });
});

formTarefa.addEventListener("submit", criarTarefa);
formEditarTarefa.addEventListener("submit", guardarEdicao);
btnRecarregar.addEventListener("click", carregarTarefas);

carregarTarefas();

window.abrirEdicao = abrirEdicao;
window.alternarConclusao = alternarConclusao;
window.apagarTarefa = apagarTarefa;