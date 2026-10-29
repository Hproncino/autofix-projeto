// Dados padrão para inicialização do sistema
const dadosIniciais = {
  config: { 
    nome: 'AutoFix Oficina', 
    cnpj: '00.123.456/0001-00', 
    telefone: '(11) 99999-8888', 
    endereco: 'Rua das Oficinas, 100 - Centro' 
  },
  agendamentos: [
    { nome: 'Mariana Lima', veiculo: 'HB20 (KLP1234)', tipo: 'Pastilhas de freio', data: '15/10/2026 - 14:00' }
  ],
  ordens: [
    { id: 1001, cliente: 'Carlos Santos (Civic - ABC1D23)', serviço: 'Troca de óleo sintético 5W30, filtro de óleo e alinhamento.', emissor: 'AutoFix Oficina | (11) 99999-8888', status: 'Concluído' },
    { id: 1002, cliente: 'Mariana Lima (HB20 - KLP1234)', serviço: 'Substituição das pastilhas de freio dianteiras.', emissor: 'AutoFix Oficina | (11) 99999-8888', status: 'Agendado' },
    { id: 1003, cliente: 'Roberto Alves (Corolla - XYZ9876)', serviço: 'Troca de correia dentada e revisão.', emissor: 'AutoFix Oficina | (11) 99999-8888', status: 'Cancelado' }
  ],
  estoque: [
    { id: 1, nome: 'Óleo 5W30 Sintético', qtd: 45 },
    { id: 2, nome: 'Pastilha de Freio HB20', qtd: 2 },
    { id: 3, nome: 'Filtro de Óleo', qtd: 18 },
    { id: 4, nome: 'Filtro de Ar do Motor', qtd: 12 },
    { id: 5, nome: 'Fluido de Freio DOT 4', qtd: 8 },
    { id: 6, nome: 'Aditivo para Radiador', qtd: 3 },
    { id: 7, nome: 'Velas de Ignição', qtd: 16 },
    { id: 8, nome: 'Correia Dentada', qtd: 4 },
    { id: 9, nome: 'Lâmpada Automotiva H7', qtd: 10 },
    { id: 10, nome: 'Palheta do Limpador', qtd: 6 },
    { id: 11, nome: 'Pastilha de Freio Dianteira', qtd: 7 },
    { id: 12, nome: 'Bateria Automotiva 60Ah', qtd: 2 }
  ],
  contadorOS: 1004
};

const STATUS_OS = {
  STAND_BY: 'Stand By',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído - aguardando retirada',
  ATRASADO: 'Atrasado',
  CANCELADO: 'Cancelado'
};

// Leitura Segura do LocalStorage
let AppData;
try {
  const dadosSalvos = localStorage.getItem('autofix_db');
  AppData = dadosSalvos ? JSON.parse(dadosSalvos) : dadosIniciais;
} catch (e) {
  console.error('Erro ao ler do localStorage, carregando dados iniciais:', e);
  AppData = dadosIniciais;
}

let mesCalendario = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let dataCalendarioSelecionada = obterChaveDataCalendario(new Date());
let filtroOSAtual = 'todos';

if (!AppData.estoqueBaseAdicionado) {
  const idsExistentes = new Set(AppData.estoque.map(item => item.id));
  dadosIniciais.estoque.forEach(item => {
    if (!idsExistentes.has(item.id)) AppData.estoque.push({ ...item });
  });
  AppData.estoqueBaseAdicionado = true;
  salvarBD();
}

// Salvamento Seguro no LocalStorage
function salvarBD() {
  try {
    localStorage.setItem('autofix_db', JSON.stringify(AppData));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
    mostrarAlerta('Atenção: Não foi possível salvar os dados na memória do navegador.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderizarTudo();
  document.getElementById('agCpf')?.addEventListener('input', formatarCpf);
  document.getElementById('agPlaca')?.addEventListener('input', formatarPlaca);
  setInterval(atualizarPrazosOS, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) atualizarPrazosOS();
  });
  document.getElementById('modal-detalhes-os')?.addEventListener('click', event => {
    if (event.target.id === 'modal-detalhes-os') fecharDetalhesOS();
  });
  document.getElementById('modal-confirmacao')?.addEventListener('click', event => {
    if (event.target.id === 'modal-confirmacao') fecharConfirmacao();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      fecharDetalhesOS();
      fecharConfirmacao();
    }
  });
});

function renderizarTudo() {
  renderizarDashboard();
  renderizarConfig();
  renderizarAgendamentos();
  renderizarOS();
  renderizarEstoque();
  renderizarItensAgendamento();
}

function atualizarPrazosOS() {
  const statusAlterado = AppData.ordens.some(os => {
    const linha = document.querySelector(`tr[data-os-id="${os.id}"]`);
    return linha && linha.dataset.status !== obterStatusOS(os);
  });

  renderizarDashboard();
  if (statusAlterado) {
    renderizarOS();
    renderizarAgendamentos();
    const modal = document.getElementById('modal-detalhes-os');
    if (!modal.hidden && modal.dataset.osId) abrirDetalhesOS(Number(modal.dataset.osId));
  }
}

// --- DASHBOARD AUTOMÁTICO ---
function renderizarDashboard() {
  const agendaEl = document.getElementById('dash-qtd-agenda');
  const totalOsEl = document.getElementById('dash-total-os');
  const alertaEl = document.getElementById('dash-pecas-alerta');
  const concluidasEl = document.getElementById('dash-os-concluidas');

  if (agendaEl) agendaEl.innerText = AppData.agendamentos.filter(ag => {
    const status = obterStatusAgendamento(ag);
    return status !== STATUS_OS.CONCLUIDO && status !== STATUS_OS.CANCELADO;
  }).length;
  if (totalOsEl) totalOsEl.innerText = AppData.ordens.length;

  const pecasAlerta = AppData.estoque.filter(item => item.qtd < 5).length;
  if (alertaEl) alertaEl.innerText = pecasAlerta;

  const qtdConcluidos = AppData.ordens.filter(os => obterStatusOS(os) === STATUS_OS.CONCLUIDO).length;
  if (concluidasEl) concluidasEl.innerText = qtdConcluidos;

  const totalOS = AppData.ordens.length;
  const percentual = status => totalOS
    ? Math.round((AppData.ordens.filter(os => obterStatusOS(os) === status).length / totalOS) * 100)
    : 0;
  atualizarBarras(
    percentual(STATUS_OS.STAND_BY),
    percentual(STATUS_OS.EM_ANDAMENTO),
    percentual(STATUS_OS.ATRASADO),
    percentual(STATUS_OS.CONCLUIDO),
    percentual(STATUS_OS.CANCELADO)
  );

  renderizarCalendario();
  renderizarResumoAgendamentos();
}

function obterChaveDataCalendario(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function obterDataAgendamento(valor) {
  const correspondencia = String(valor || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!correspondencia) return null;

  const dia = Number(correspondencia[1]);
  const mes = Number(correspondencia[2]);
  let ano = Number(correspondencia[3]);
  if (ano < 100) ano += 2000;

  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
  return data;
}

function obterStatusBaseOS(os) {
  if (!os) return STATUS_OS.STAND_BY;
  if (os.status === 'Agendado') return STATUS_OS.STAND_BY;
  if (os.status === 'Concluído') return STATUS_OS.CONCLUIDO;
  return os.status || STATUS_OS.STAND_BY;
}

function obterStatusOS(os, momento = new Date()) {
  const status = obterStatusBaseOS(os);
  if (status === STATUS_OS.CONCLUIDO || status === STATUS_OS.CANCELADO || !os.prazoConclusao) return status;

  const prazo = new Date(os.prazoConclusao);
  return !Number.isNaN(prazo.getTime()) && prazo < momento ? STATUS_OS.ATRASADO : status;
}

function obterStatusAgendamento(agendamento) {
  const os = AppData.ordens.find(ordem => ordem.id === agendamento.osId);
  return os ? obterStatusOS(os) : STATUS_OS.STAND_BY;
}

function atualizarBarras(standBy, emAndamento, atrasadas, concluidas, canceladas) {
  const valores = [
    ['standby', standBy],
    ['exec', emAndamento],
    ['atrasado', atrasadas],
    ['ok', concluidas],
    ['erro', canceladas]
  ];

  valores.forEach(([chave, percentual]) => {
    const texto = document.getElementById(`txt-pct-${chave}`);
    const barra = document.getElementById(`bar-prog-${chave}`);
    if (texto) texto.innerText = `${percentual}%`;
    if (barra) barra.style.width = `${percentual}%`;
  });
}

function renderizarCalendario() {
  const mesEl = document.getElementById('dash-calendario-mes');
  const calendarioEl = document.getElementById('dash-calendario');
  const eventosEl = document.getElementById('dash-calendario-eventos');
  if (!mesEl || !calendarioEl || !eventosEl) return;

  const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(mesCalendario);
  mesEl.textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  const agendamentosPorDia = new Map();
  AppData.agendamentos.forEach(agendamento => {
    const data = obterDataAgendamento(agendamento.data);
    if (!data) return;
    const chave = obterChaveDataCalendario(data);
    agendamentosPorDia.set(chave, [...(agendamentosPorDia.get(chave) || []), agendamento]);
  });

  const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const inicioMes = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth(), 1);
  const quantidadeDias = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 0).getDate();
  const deslocamentoInicio = (inicioMes.getDay() + 6) % 7;
  const quantidadeCelulas = Math.ceil((deslocamentoInicio + quantidadeDias) / 7) * 7;
  const hoje = obterChaveDataCalendario(new Date());

  calendarioEl.innerHTML = diasSemana.map(dia => `<span class="calendario-dia-semana">${dia}</span>`).join('');
  for (let indice = 0; indice < quantidadeCelulas; indice += 1) {
    const dia = indice - deslocamentoInicio + 1;
    if (dia < 1 || dia > quantidadeDias) {
      calendarioEl.insertAdjacentHTML('beforeend', '<span class="calendario-dia-vazio" aria-hidden="true"></span>');
      continue;
    }

    const data = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth(), dia);
    const chave = obterChaveDataCalendario(data);
    const agendamentos = agendamentosPorDia.get(chave) || [];
    const classes = [
      'calendario-dia',
      chave === hoje ? 'hoje' : '',
      chave === dataCalendarioSelecionada ? 'selecionado' : '',
      agendamentos.length ? 'tem-agendamento' : ''
    ].filter(Boolean).join(' ');
    const descricao = agendamentos.length
      ? `${dia}, ${agendamentos.length} agendamento${agendamentos.length === 1 ? '' : 's'}`
      : String(dia);

    calendarioEl.insertAdjacentHTML('beforeend', `
      <button type="button" class="${classes}" onclick="selecionarDiaCalendario('${chave}')" aria-label="${descricao}" aria-pressed="${chave === dataCalendarioSelecionada}">
        <span>${dia}</span>
        ${agendamentos.length ? '<i aria-hidden="true"></i>' : ''}
      </button>
    `);
  }

  const agendamentosSelecionados = agendamentosPorDia.get(dataCalendarioSelecionada) || [];
  const dataSelecionada = new Date(`${dataCalendarioSelecionada}T00:00:00`);
  const dataLegivel = Number.isNaN(dataSelecionada.getTime())
    ? 'Dia selecionado'
    : new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(dataSelecionada);
  eventosEl.innerHTML = `
    <h4>${dataLegivel}</h4>
    ${agendamentosSelecionados.length
      ? agendamentosSelecionados.map(agendamento => {
        const status = obterStatusAgendamento(agendamento);
        const classeStatus = obterClasseStatusOS(status);
        const horario = String(agendamento.data || '').match(/\b\d{1,2}:\d{2}\b/)?.[0] || '';
        return `
          <div class="calendario-evento">
            <span class="calendario-evento-horario">${escaparHtml(horario || '—')}</span>
            <span class="calendario-evento-cliente">${escaparHtml(agendamento.nome || 'Cliente')}</span>
            <span class="calendario-evento-status ${classeStatus}">${escaparHtml(status)}</span>
          </div>
        `;
      }).join('')
      : '<p class="calendario-sem-eventos">Nenhum agendamento neste dia.</p>'}
  `;
}

function selecionarDiaCalendario(chave) {
  dataCalendarioSelecionada = chave;
  renderizarCalendario();
}

function mudarMesCalendario(direcao) {
  mesCalendario = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + direcao, 1);
  dataCalendarioSelecionada = obterChaveDataCalendario(mesCalendario);
  renderizarCalendario();
}

function renderizarResumoAgendamentos() {
  const resumoEl = document.getElementById('dash-resumo-agendamentos');
  if (!resumoEl) return;

  const resumo = [
    { status: STATUS_OS.STAND_BY, titulo: 'Stand By', classe: 'standby' },
    { status: STATUS_OS.EM_ANDAMENTO, titulo: 'Em andamento', classe: 'em-andamento' },
    { status: STATUS_OS.ATRASADO, titulo: 'Atrasados', classe: 'atrasado' },
    { status: STATUS_OS.CONCLUIDO, titulo: 'Concluídos', classe: 'concluido' },
    { status: STATUS_OS.CANCELADO, titulo: 'Cancelados', classe: 'cancelado' }
  ];

  resumoEl.innerHTML = resumo.map(item => {
    const quantidade = AppData.agendamentos.filter(agendamento => obterStatusAgendamento(agendamento) === item.status).length;
    return `
      <div class="resumo-agendamento-item ${item.classe}">
        <span class="resumo-agendamento-indicador" aria-hidden="true"></span>
        <span class="resumo-agendamento-titulo">${item.titulo}</span>
        <strong>${quantidade}</strong>
      </div>
    `;
  }).join('') + `
    <div class="resumo-agendamento-total">
      <span>Total de agendamentos</span>
      <strong>${AppData.agendamentos.length}</strong>
    </div>
  `;
}

// --- CONFIGURAÇÕES ---
function renderizarConfig() {
  const cfgNome = document.getElementById('cfgNome');
  const cfgCnpj = document.getElementById('cfgCnpj');
  const cfgTelefone = document.getElementById('cfgTelefone');
  const cfgEndereco = document.getElementById('cfgEndereco');
  const logoEmpresa = document.getElementById('logo-empresa');

  if (cfgNome) cfgNome.value = AppData.config.nome || '';
  if (cfgCnpj) cfgCnpj.value = AppData.config.cnpj || '';
  if (cfgTelefone) cfgTelefone.value = AppData.config.telefone || '';
  if (cfgEndereco) cfgEndereco.value = AppData.config.endereco || '';
  if (logoEmpresa) logoEmpresa.innerText = AppData.config.nome || 'AutoFix';
}

function salvarConfiguracoes(e) {
  e.preventDefault();
  AppData.config = {
    nome: document.getElementById('cfgNome').value,
    cnpj: document.getElementById('cfgCnpj').value,
    telefone: document.getElementById('cfgTelefone').value,
    endereco: document.getElementById('cfgEndereco').value
  };
  
  const emissorFormatado = AppData.config.telefone ? `${AppData.config.nome} | ${AppData.config.telefone}` : AppData.config.nome;
  AppData.ordens.forEach(os => os.emissor = emissorFormatado);

  salvarBD();
  renderizarTudo();
  mostrarAlerta('Configurações atualizadas!');
}

// --- AGENDAMENTOS ---
function renderizarAgendamentos() {
  const container = document.getElementById('lista-agendamentos');
  if (!container) return;
  container.innerHTML = '';
  
  AppData.agendamentos.forEach((ag, indice) => {
    const ordem = ag.osId ? AppData.ordens.find(os => os.id === ag.osId) : null;
    if (ordem && obterStatusBaseOS(ordem) !== STATUS_OS.STAND_BY) return;
    const status = ordem ? obterStatusOS(ordem) : STATUS_OS.STAND_BY;
    container.innerHTML += `
      <div class="card-agenda">
        <div class="agenda-topo">
          <b>${ag.nome}</b>
          <span class="badge ${status === STATUS_OS.ATRASADO ? 'erro' : 'exec'}">${escaparHtml(status)}</span>
        </div>
        <p>${ag.veiculo || 'Veículo não informado'}${ag.placa ? ` - ${ag.placa}` : ''} - ${ag.tipo}</p>
        ${ag.cpf ? `<small>CPF: ${ag.cpf}</small>` : ''}
        <small>${ag.data}</small>
        <button class="btn-deletar" onclick="retirarAgendamento(${indice})">Cancelar agendamento</button>
      </div>
    `;
  });
}

function salvarAgendamento(e) {
  e.preventDefault();
  const cpf = document.getElementById('agCpf').value.trim();
  const nome = document.getElementById('agNome').value;
  const veiculo = document.getElementById('agVeiculo').value;
  const placa = document.getElementById('agPlaca').value.trim().toUpperCase();
  const dataHora = document.getElementById('agData').value;
  const prazoConclusao = document.getElementById('agPrazo').value;
  const tipoSelecionado = document.getElementById('agTipo').value;
  const tipoCustomizado = document.getElementById('agTipoCustomizado').value.trim();
  const tipo = tipoSelecionado === 'customizado' ? tipoCustomizado : tipoSelecionado;
  const defeito = document.getElementById('agDefeito').value;

  if (cpf.replace(/\D/g, '').length !== 11) {
    mostrarAlerta('Informe um CPF válido com 11 números.');
    return;
  }
  if (tipoSelecionado === 'customizado' && !tipoCustomizado) {
    mostrarAlerta('Descreva o serviço customizado.');
    return;
  }
  if (!prazoConclusao || new Date(prazoConclusao) <= new Date(dataHora)) {
    mostrarAlerta('A previsão de conclusão deve ser posterior à data e ao horário do agendamento.');
    return;
  }
  
  const dataFormatada = new Date(dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const emissorFormatado = AppData.config.telefone ? `${AppData.config.nome} | ${AppData.config.telefone}` : AppData.config.nome;
  const itens = [...document.querySelectorAll('.item-agenda-check:checked')].map(check => ({
    estoqueId: Number(check.value),
    quantidade: Number(document.querySelector(`.item-agenda-qtd[data-item-id="${check.value}"]`).value)
  }));
  for (const item of itens) {
    const estoque = AppData.estoque.find(registro => registro.id === item.estoqueId);
    if (!estoque || !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > estoque.qtd) {
      mostrarAlerta('Confira as quantidades dos itens selecionados.');
      return;
    }
  }

  itens.forEach(item => {
    AppData.estoque.find(registro => registro.id === item.estoqueId).qtd -= item.quantidade;
  });

  const idOS = AppData.contadorOS++;

  AppData.agendamentos.unshift({ cpf, nome, veiculo, placa, tipo, data: dataFormatada, osId: idOS });

  AppData.ordens.unshift({
    id: idOS,
    cliente: `${nome} (${veiculo} - ${placa})`,
    serviço: `[${tipo}] ${defeito}`,
    emissor: emissorFormatado,
    status: STATUS_OS.STAND_BY,
    prazoConclusao,
    itensEstoque: itens,
    estoqueBaixado: true
  });

  salvarBD();
  renderizarTudo();

  document.getElementById('agNome').value = '';
  document.getElementById('agCpf').value = '';
  document.getElementById('agVeiculo').value = '';
  document.getElementById('agPlaca').value = '';
  document.getElementById('agData').value = '';
  document.getElementById('agPrazo').value = '';
  document.getElementById('agTipo').value = '';
  document.getElementById('agTipoCustomizado').value = '';
  alternarServicoCustomizado();
  document.getElementById('agDefeito').value = '';

  mostrarAlerta('Agendamento salvo com sucesso!');
}

function obterClasseStatusOS(status) {
  if (status === STATUS_OS.CONCLUIDO) return 'concluido';
  if (status === STATUS_OS.CANCELADO) return 'cancelado';
  if (status === STATUS_OS.ATRASADO) return 'atrasado';
  if (status === STATUS_OS.EM_ANDAMENTO) return 'em-andamento';
  return 'standby';
}

function alternarServicoCustomizado() {
  const tipo = document.getElementById('agTipo');
  const campo = document.getElementById('campo-servico-customizado');
  const input = document.getElementById('agTipoCustomizado');
  if (!tipo || !campo || !input) return;
  const customizado = tipo.value === 'customizado';
  campo.hidden = !customizado;
  input.required = customizado;
  if (!customizado) input.value = '';
}

function formatarCpf(event) {
  const numeros = event.target.value.replace(/\D/g, '').slice(0, 11);
  event.target.value = numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatarPlaca(event) {
  event.target.value = event.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7).toUpperCase();
}

// --- ORDENS DE SERVIÇO ---
function renderizarOS() {
  const corpo = document.getElementById('corpo-tabela-os');
  if (!corpo) return;
  corpo.innerHTML = '';
  
  AppData.ordens.forEach(os => {
    const status = obterStatusOS(os);
    const classeStatus = obterClasseStatusOS(status);
    const statusEditaveis = [
      STATUS_OS.STAND_BY,
      STATUS_OS.EM_ANDAMENTO,
      STATUS_OS.CONCLUIDO,
      STATUS_OS.CANCELADO
    ];
    const opcoesStatus = status === STATUS_OS.ATRASADO
      ? `<option value="${STATUS_OS.ATRASADO}" selected disabled>${STATUS_OS.ATRASADO}</option>`
      : '';
    
    corpo.innerHTML += `
      <tr data-os-id="${os.id}" data-status="${escaparHtml(status)}" class="linha-os" onclick="abrirDetalhesOS(${os.id})">
        <td>#${os.id}</td>
        <td>${os.cliente}</td>
        <td>${os.serviço}${os.itensEstoque?.length ? `<br><small>Itens: ${os.itensEstoque.map(item => `${AppData.estoque.find(reg => reg.id === item.estoqueId)?.nome || 'Item removido'} × ${item.quantidade}`).join(', ')}</small>` : ''}</td>
        <td>${os.emissor}</td>
        <td>${escaparHtml(formatarPrazoOS(os.prazoConclusao))}</td>
        <td>
          <select class="select-status status-${classeStatus}" onclick="event.stopPropagation()" onchange="alterarStatusOS(${os.id}, this)">
            ${opcoesStatus}
            ${statusEditaveis.map(opcao => `<option value="${opcao}" ${status === opcao ? 'selected' : ''}>${opcao}</option>`).join('')}
          </select>
        </td>
        <td>
          <button type="button" class="btn-acao-os btn-excluir-os" onclick="event.stopPropagation(); excluirOS(${os.id})">Excluir</button>
        </td>
      </tr>
    `;
  });

  if (filtroOSAtual !== 'todos') {
    corpo.querySelectorAll('tr').forEach(linha => {
      linha.style.display = linha.dataset.status === filtroOSAtual ? '' : 'none';
    });
  }
}

function formatarPrazoOS(valor) {
  if (!valor) return 'Não definido';
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? 'Não definido'
    : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function abrirDetalhesOS(id) {
  const os = AppData.ordens.find(ordem => ordem.id === id);
  if (!os) return;

  const agendamento = AppData.agendamentos.find(ag =>
    ag.osId === os.id ||
    os.cliente === `${ag.nome} (${ag.veiculo})` ||
    os.cliente === `${ag.nome} (${ag.veiculo} - ${ag.placa})`
  );
  const cliente = agendamento?.nome || os.cliente.split(' (')[0];
  const veiculo = agendamento
    ? `${agendamento.veiculo || 'Não informado'}${agendamento.placa ? ` - ${agendamento.placa}` : ''}`
    : os.cliente.match(/\((.*)\)$/)?.[1] || 'Não informado';
  const tipo = agendamento?.tipo || 'Não informado';
  const defeito = agendamento ? obterDefeito(os.serviço, agendamento.tipo) : os.serviço;
  const itens = (os.itensEstoque || []).map(item => {
    const estoque = AppData.estoque.find(registro => registro.id === item.estoqueId);
    return `${estoque?.nome || 'Item removido'} × ${item.quantidade}`;
  });

  document.getElementById('modal-os-titulo').textContent = `OS #${os.id}`;
  document.getElementById('modal-os-detalhes').innerHTML = `
    <div class="modal-os-status status-${obterClasseStatusOS(obterStatusOS(os))}"><span>Status</span><strong>${escaparHtml(obterStatusOS(os))}</strong></div>
    <div class="modal-os-grade">
      <div><span>Cliente</span><strong>${escaparHtml(cliente)}</strong></div>
      <div><span>CPF</span><strong>${escaparHtml(agendamento?.cpf || 'Não informado')}</strong></div>
      <div><span>Veículo e placa</span><strong>${escaparHtml(veiculo)}</strong></div>
      <div><span>Tipo de serviço</span><strong>${escaparHtml(tipo)}</strong></div>
      <div><span>Data do agendamento</span><strong>${escaparHtml(agendamento?.data || 'Não informado')}</strong></div>
      <div><span>Previsão de conclusão</span><strong>${escaparHtml(formatarPrazoOS(os.prazoConclusao))}</strong></div>
    </div>
    <form class="modal-os-bloco prazo-os-form" onsubmit="salvarPrazoOS(event, ${os.id})">
      <label for="prazo-os-${os.id}">Atualizar previsão de conclusão</label>
      <div class="prazo-os-controles">
        <input type="datetime-local" id="prazo-os-${os.id}" value="${escaparHtml(os.prazoConclusao || '')}" required>
        <button type="submit">Salvar prazo</button>
      </div>
    </form>
    <div class="modal-os-bloco"><span>Detalhes / sintomas relatados</span><p>${escaparHtml(defeito)}</p></div>
    <div class="modal-os-bloco">
      <div class="modal-os-bloco-titulo">
        <span>Itens previstos</span>
        ${obterStatusBaseOS(os) === STATUS_OS.STAND_BY ? `<button type="button" class="btn-acao-os btn-editar-itens-os" onclick="event.stopPropagation(); editarItensOS(${os.id})">Alterar itens</button>` : ''}
      </div>
      <p>${itens.length ? escaparHtml(itens.join(', ')) : 'Nenhum item previsto.'}</p>
    </div>
  `;

  const modal = document.getElementById('modal-detalhes-os');
  modal.dataset.osId = String(id);
  modal.hidden = false;
  document.body.classList.add('modal-aberto');
  modal.querySelector('.modal-os-fechar').focus();
}

function salvarPrazoOS(event, id) {
  event.preventDefault();
  const os = AppData.ordens.find(ordem => ordem.id === id);
  const campoPrazo = document.getElementById(`prazo-os-${id}`);
  if (!os || !campoPrazo || Number.isNaN(new Date(campoPrazo.value).getTime())) return;

  os.prazoConclusao = campoPrazo.value;
  salvarBD();
  renderizarTudo();
  abrirDetalhesOS(id);
}

function editarItensOS(id) {
  const os = AppData.ordens.find(ordem => ordem.id === id);
  if (!os || obterStatusBaseOS(os) !== STATUS_OS.STAND_BY) return;

  const modalDetalhes = document.getElementById('modal-os-detalhes');
  modalDetalhes.innerHTML = `
    <div class="modal-os-bloco">
      <span>Alterar itens previstos da OS #${os.id}</span>
      <p>Selecione os itens e ajuste as quantidades. O estoque será atualizado ao salvar.</p>
      <div id="itens-edicao-os" class="itens-edicao-os">${renderizarOpcoesItensOS(os)}</div>
    </div>
    <div class="acoes-editor-os">
      <button type="button" class="btn-cancelar-edicao" onclick="abrirDetalhesOS(${os.id})">Cancelar</button>
      <button type="button" onclick="salvarItensOS(${os.id})">Salvar itens</button>
    </div>
  `;
}

function renderizarOpcoesItensOS(os) {
  if (!AppData.estoque.length) return '<small>Nenhum item cadastrado no estoque.</small>';
  const itensAtuais = os.itensEstoque || [];
  return AppData.estoque.map(item => {
    const itemAtual = itensAtuais.find(registro => registro.estoqueId === item.id);
    const quantidadeDisponivel = item.qtd + (os.estoqueBaixado ? itemAtual?.quantidade || 0 : 0);
    return `
      <label class="item-selecao">
        <span><input type="checkbox" class="item-os-check" value="${item.id}" ${itemAtual ? 'checked' : ''}> ${escaparHtml(item.nome)} (disponível: ${quantidadeDisponivel})</span>
        <input type="number" class="item-os-qtd" data-item-id="${item.id}" min="1" max="${quantidadeDisponivel}" value="${itemAtual?.quantidade || 1}" aria-label="Quantidade de ${escaparHtml(item.nome)}">
      </label>
    `;
  }).join('');
}

function salvarItensOS(id) {
  const os = AppData.ordens.find(ordem => ordem.id === id);
  if (!os || obterStatusBaseOS(os) !== STATUS_OS.STAND_BY) return;

  const itens = [...document.querySelectorAll('.item-os-check:checked')].map(check => ({
    estoqueId: Number(check.value),
    quantidade: Number(document.querySelector(`.item-os-qtd[data-item-id="${check.value}"]`).value)
  }));
  const itensAnteriores = os.itensEstoque || [];
  if (os.estoqueBaixado && !devolverItensAoEstoque(os)) return;

  for (const item of itens) {
    const estoque = AppData.estoque.find(registro => registro.id === item.estoqueId);
    if (!estoque || !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > estoque.qtd) {
      mostrarAlerta('Confira as quantidades dos itens selecionados.');
      os.itensEstoque = itensAnteriores;
      descontarItensDoEstoque(os);
      return;
    }
  }

  os.itensEstoque = itens;
  descontarItensDoEstoque(os);
  salvarBD();
  renderizarTudo();
  abrirDetalhesOS(id);
}

function descontarItensDoEstoque(os) {
  (os.itensEstoque || []).forEach(item => {
    const estoque = AppData.estoque.find(registro => registro.id === item.estoqueId);
    if (estoque) estoque.qtd -= item.quantidade;
  });
  os.estoqueBaixado = true;
}

function obterDefeito(servico, tipo) {
  const prefixo = `[${tipo}] `;
  return servico.startsWith(prefixo) ? servico.slice(prefixo.length) : servico;
}

function escaparHtml(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fecharDetalhesOS() {
  const modal = document.getElementById('modal-detalhes-os');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  delete modal.dataset.osId;
  document.body.classList.remove('modal-aberto');
}

function alterarStatusOS(id, selectElement) {
  const novoStatus = selectElement.value;
  const os = AppData.ordens.find(o => o.id === id);
  
  if (!os) return;
  if (novoStatus === obterStatusBaseOS(os)) {
    renderizarOS();
    return;
  }
  abrirConfirmacao(
    `Deseja realmente alterar o status da OS #${os.id} de "${obterStatusOS(os)}" para "${novoStatus}"?`,
    () => concluirAlteracaoStatusOS(os, novoStatus),
    { confirmarTexto: 'Alterar status' }
  );
}

function concluirAlteracaoStatusOS(os, novoStatus) {
  if (novoStatus === STATUS_OS.CONCLUIDO && !os.estoqueBaixado) {
    for (const item of os.itensEstoque || []) {
      const estoque = AppData.estoque.find(registro => registro.id === item.estoqueId);
      if (!estoque || estoque.qtd < item.quantidade) {
        mostrarAlerta(`Estoque insuficiente para concluir a OS. Confira ${estoque?.nome || 'um dos itens vinculados'}.`);
        renderizarOS();
        return;
      }
    }
    descontarItensDoEstoque(os);
  }
  os.status = novoStatus;
  salvarBD();
  renderizarTudo();
}

function devolverItensAoEstoque(os) {
  const itens = os.itensEstoque || [];
  const registros = itens.map(item => AppData.estoque.find(registro => registro.id === item.estoqueId));
  if (registros.some(registro => !registro)) {
    mostrarAlerta('Não foi possível devolver os itens: uma peça vinculada não existe mais no estoque.');
    return false;
  }

  itens.forEach((item, indice) => {
    registros[indice].qtd += item.quantidade;
  });
  os.estoqueBaixado = false;
  return true;
}

function excluirOS(id) {
  const os = AppData.ordens.find(ordem => ordem.id === id);
  if (!os) return;

  if (os.itensEstoque?.length) {
    abrirConfirmacao(
      `Deseja realmente excluir a OS #${os.id}? Escolha se os itens vinculados devem voltar ao inventário.`,
      () => excluirOSConfirmada(os, true),
      {
        confirmarTexto: 'Devolver itens e excluir',
        alternativaTexto: 'Excluir sem devolver',
        aoEscolherAlternativa: () => excluirOSConfirmada(os, false)
      }
    );
    return;
  }

  abrirConfirmacao(`Deseja realmente excluir a OS #${os.id}?`, () => excluirOSConfirmada(os, false), {
    confirmarTexto: 'Excluir OS',
    classeConfirmar: 'btn-confirmar-perigo'
  });
}

function excluirOSConfirmada(os, devolverItens) {
  if (devolverItens && os.estoqueBaixado && !devolverItensAoEstoque(os)) return;
  AppData.ordens = AppData.ordens.filter(ordem => ordem.id !== os.id);
  AppData.agendamentos = AppData.agendamentos.filter(ag =>
    ag.osId !== os.id &&
    os.cliente !== `${ag.nome} (${ag.veiculo})` &&
    os.cliente !== `${ag.nome} (${ag.veiculo} - ${ag.placa})`
  );
  salvarBD();
  renderizarTudo();
}

function abrirConfirmacao(mensagem, aoConfirmar, opcoes = {}) {
  const modal = document.getElementById('modal-confirmacao');
  const acoes = document.getElementById('modal-confirmacao-acoes');
  document.getElementById('modal-confirmacao-titulo').textContent = opcoes.titulo || 'Confirmar ação';
  document.getElementById('modal-confirmacao-mensagem').textContent = mensagem;
  acoes.innerHTML = '';
  modal.setAttribute('role', 'dialog');
  modal.dataset.atualizarOsAoFechar = 'true';

  const cancelar = document.createElement('button');
  cancelar.type = 'button';
  cancelar.className = 'btn-confirmacao btn-cancelar';
  cancelar.textContent = 'Cancelar';
  cancelar.onclick = fecharConfirmacao;
  acoes.appendChild(cancelar);

  if (opcoes.alternativaTexto && opcoes.aoEscolherAlternativa) {
    const alternativa = document.createElement('button');
    alternativa.type = 'button';
    alternativa.className = 'btn-confirmacao btn-alternativa';
    alternativa.textContent = opcoes.alternativaTexto;
    alternativa.onclick = () => {
      fecharConfirmacao();
      opcoes.aoEscolherAlternativa();
    };
    acoes.appendChild(alternativa);
  }

  const confirmar = document.createElement('button');
  confirmar.type = 'button';
  confirmar.className = `btn-confirmacao ${opcoes.classeConfirmar || ''}`;
  confirmar.textContent = opcoes.confirmarTexto || 'Confirmar';
  confirmar.onclick = () => {
    fecharConfirmacao();
    aoConfirmar();
  };
  acoes.appendChild(confirmar);

  modal.hidden = false;
  document.body.classList.add('modal-aberto');
  confirmar.focus();
}

function mostrarAlerta(mensagem) {
  const modal = document.getElementById('modal-confirmacao');
  const acoes = document.getElementById('modal-confirmacao-acoes');
  document.getElementById('modal-confirmacao-titulo').textContent = 'Aviso';
  document.getElementById('modal-confirmacao-mensagem').textContent = mensagem;
  acoes.innerHTML = '';
  modal.setAttribute('role', 'alertdialog');
  modal.dataset.atualizarOsAoFechar = 'false';

  const confirmar = document.createElement('button');
  confirmar.type = 'button';
  confirmar.className = 'btn-confirmacao';
  confirmar.textContent = 'Entendi';
  confirmar.onclick = fecharConfirmacao;
  acoes.appendChild(confirmar);

  modal.hidden = false;
  document.body.classList.add('modal-aberto');
  confirmar.focus();
}

function fecharConfirmacao() {
  const modal = document.getElementById('modal-confirmacao');
  if (!modal || modal.hidden) return;
  const atualizarOS = modal.dataset.atualizarOsAoFechar !== 'false';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  delete modal.dataset.atualizarOsAoFechar;
  document.body.classList.remove('modal-aberto');
  if (atualizarOS) renderizarOS();
}

function filtrarOS(status, btn) {
  filtroOSAtual = status;
  document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const linhas = document.querySelectorAll('#tabela-os tbody tr');
  linhas.forEach(linha => {
    if (status === 'todos' || linha.getAttribute('data-status') === status) {
      linha.style.display = '';
    } else {
      linha.style.display = 'none';
    }
  });
}

// --- ESTOQUE ---
function renderizarEstoque() {
  const grid = document.getElementById('lista-estoque');
  if (!grid) return;
  grid.innerHTML = '';

  AppData.estoque.forEach(item => {
    const badgeClass = item.qtd < 5 ? 'badge erro' : 'badge ok';
    const badgeTexto = item.qtd < 5 ? 'Repor Estoque' : 'Estoque Normal';

    grid.innerHTML += `
      <div class="card-item">
        <b>${item.nome}</b>
        <p style="margin: 8px 0; font-size: 0.85rem;">Quantidade: <strong>${item.qtd}</strong></p>
        <span class="${badgeClass}">${badgeTexto}</span>
        <button class="btn-deletar" onclick="deletarEstoque(${item.id})">Deletar</button>
      </div>
    `;
  });
}

function adicionarEstoque(e) {
  e.preventDefault();
  const nome = document.getElementById('nomeItem').value;
  const qtd = parseInt(document.getElementById('qtdItem').value);

  AppData.estoque.push({ id: Date.now(), nome, qtd });
  
  salvarBD();
  renderizarTudo();

  document.getElementById('nomeItem').value = '';
  document.getElementById('qtdItem').value = '';
}

function deletarEstoque(id) {
  AppData.estoque = AppData.estoque.filter(item => item.id !== id);
  salvarBD();
  renderizarTudo();
}

// Navegação entre abas
function mudar(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar a, .menu a').forEach(a => a.classList.remove('active'));
  
  const paginaAlvo = document.getElementById(id);
  if (paginaAlvo) {
    paginaAlvo.classList.add('active');
  }
  
  if (el) {
    el.classList.add('active');
  }
}

function retirarAgendamento(indice) {
  const agendamento = AppData.agendamentos[indice];
  if (!agendamento) return;
  abrirConfirmacao(`Cancelar o agendamento de ${agendamento.nome}?`, () => {
    const ordem = agendamento.osId && AppData.ordens.find(os => os.id === agendamento.osId);
    if (ordem && obterStatusBaseOS(ordem) === STATUS_OS.STAND_BY) ordem.status = STATUS_OS.CANCELADO;
    AppData.agendamentos.splice(indice, 1);
    salvarBD();
    renderizarTudo();
  }, { titulo: 'Cancelar agendamento', confirmarTexto: 'Cancelar agendamento' });
}

function renderizarItensAgendamento() {
  const container = document.getElementById('itens-disponiveis-agenda');
  if (!container) return;
  if (!AppData.estoque.length) {
    container.innerHTML = '<small>Nenhum item cadastrado no estoque.</small>';
    return;
  }
  container.innerHTML = AppData.estoque.map(item => `
    <label class="item-selecao">
      <span><input type="checkbox" class="item-agenda-check" value="${item.id}"> ${item.nome} (disponível: ${item.qtd})</span>
      <input type="number" class="item-agenda-qtd" data-item-id="${item.id}" min="1" max="${item.qtd}" value="1" aria-label="Quantidade de ${item.nome}">
    </label>
  `).join('');
}
