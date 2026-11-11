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

// Garante compatibilidade com dados salvos em versões anteriores.
AppData.config ||= { ...dadosIniciais.config };
AppData.agendamentos ||= [];
AppData.ordens ||= [];
AppData.estoque ||= [];
if (!Array.isArray(AppData.historico)) AppData.historico = [];
AppData.orcamentos ||= [];
AppData.movimentacoesEstoque ||= [];
AppData.contadorOS ||= dadosIniciais.contadorOS;
AppData.contadorOrcamento ||= 1;

// Migra os dados do módulo antigo de estoque para o banco único do sistema.
// Isso evita perder peças e movimentações que estavam em chaves separadas.
if (!AppData.estoqueLegadoMigrado) {
  try {
    const estoqueLegado = JSON.parse(localStorage.getItem('autofix_estoque') || '[]');
    const nomesExistentes = new Set(
      AppData.estoque.map(item => String(item.nome || '').trim().toLowerCase())
    );

    estoqueLegado.forEach((item, indice) => {
      const nome = String(item.nome || '').trim();
      if (!nome || nomesExistentes.has(nome.toLowerCase())) return;

      AppData.estoque.push({
        id: Number(item.id) || Date.now() + indice,
        nome,
        qtd: Number(item.quantidade ?? item.qtd) || 0,
        codigo: item.codigo || '',
        minimo: Number(item.minimo) || 0,
        precoVenda: Number(item.precoVenda ?? item.preco) || 0,
        categoria: item.categoria || ''
      });
      nomesExistentes.add(nome.toLowerCase());
    });

    const movimentacoesLegadas = JSON.parse(
      localStorage.getItem('autofix_movimentacoes') || '[]'
    );
    movimentacoesLegadas.forEach((mov, indice) => {
      AppData.movimentacoesEstoque.push({
        id: Number(mov.id) || Date.now() + indice,
        estoqueId: mov.estoqueId || null,
        produto: mov.produto || mov.nome || 'Peça',
        tipo: mov.tipo || 'movimentação',
        quantidade: Number(mov.quantidade) || 0,
        quantidadeAnterior: Number(mov.quantidadeAnterior) || 0,
        quantidadeAtual: Number(mov.quantidadeAtual) || 0,
        observacao: mov.observacao || mov.detalhe || '',
        data: mov.data || new Date().toISOString()
      });
    });
  } catch (erro) {
    console.error('Não foi possível migrar os dados antigos do estoque:', erro);
  }

  AppData.estoqueLegadoMigrado = true;
  try {
    localStorage.setItem('autofix_db', JSON.stringify(AppData));
  } catch (erro) {
    console.error('Não foi possível salvar a migração do estoque:', erro);
  }
}


let mesCalendario = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

let dataCalendarioSelecionada = obterChaveDataCalendario(new Date());

let filtroOSAtual = 'todos';

let buscaOSAtual = '';



if (!AppData.estoqueBaseAdicionado) {

  const idsExistentes = new Set(AppData.estoque.map(item => item.id));

  dadosIniciais.estoque.forEach(item => {

    if (!idsExistentes.has(item.id)) AppData.estoque.push({ ...item });

  });

  AppData.estoqueBaseAdicionado = true;

  salvarBD();

}



function registrarHistorico(modulo, acao, descricao) {

  if (!Array.isArray(AppData.historico)) AppData.historico = [];

  AppData.historico.unshift({

    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

    modulo,

    acao,

    descricao,

    ocorridoEm: new Date().toISOString()

  });

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



  document.getElementById('modal-edicao-estoque')?.addEventListener('click', event => {

    if (event.target.id === 'modal-edicao-estoque') fecharEdicaoEstoque();

  });



  document.addEventListener('keydown', event => {

    if (event.key === 'Escape') {

      fecharDetalhesOS();

      fecharDetalhesOrcamento();

      fecharConfirmacao();

      fecharEdicaoEstoque();

    }

  });



  inicializarModuloPecas();

});



function renderizarTudo() {

  renderizarDashboard();

  renderizarConfig();

  renderizarAgendamentos();

  renderizarOS();

  renderizarEstoque();

  renderizarItensAgendamento();

  renderizarItensOrcamento();

  renderizarOrcamentos();

  renderizarHistorico();

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

    itensEstoque: itens.map(item => {
      const produto = AppData.estoque.find(registro => registro.id === item.estoqueId);
      return {
        ...item,
        nome: produto.nome,
        precoUnitario: obterPrecoEstoque(produto)
      };
    }),

    estoqueBaixado: true

  });



  registrarHistorico('agendamentos', 'criação', `Agendamento criado para ${nome} em ${dataFormatada}.`);

  registrarHistorico('ordens', 'criação', `OS #${idOS} criada para ${nome}.`);

  if (itens.length) registrarHistorico('estoque', 'alteração', `Estoque atualizado pelos itens vinculados à OS #${idOS}.`);

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

    const agendamento = AppData.agendamentos.find(ag => ag.osId === os.id);

    const termosBusca = [

      os.cliente,

      agendamento?.nome,

      agendamento?.cpf,

      agendamento?.veiculo,

      agendamento?.placa

    ].filter(Boolean).join(' ');

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

      <tr data-os-id="${os.id}" data-status="${escaparHtml(status)}" data-busca="${escaparHtml(termosBusca)}" class="linha-os" onclick="abrirDetalhesOS(${os.id})">

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



  aplicarFiltrosOS();

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

  registrarHistorico('ordens', 'alteração', `Prazo da OS #${id} atualizado.`);

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

      <div class="itens-cabecalho">

        <div>

          <span class="itens-legenda">Materiais e peças</span>

          <strong>Alterar itens previstos da OS #${os.id}</strong>

        </div>

        <span id="contador-itens-os" class="contador-itens">${(os.itensEstoque || []).length} selecionados</span>

      </div>

      <p>Selecione os itens e ajuste as quantidades. O estoque será atualizado ao salvar.</p>

      <div class="busca-itens">

        <span class="busca-itens-icone">⌕</span>

        <input type="search" id="busca-itens-os" placeholder="Buscar item por nome..." oninput="filtrarItens('os', this.value)" autocomplete="off">

      </div>

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

  const opcoes = AppData.estoque.map(item => {

    const itemAtual = itensAtuais.find(registro => registro.estoqueId === item.id);

    const quantidadeDisponivel = item.qtd + (os.estoqueBaixado ? itemAtual?.quantidade || 0 : 0);

    return `

      <label class="item-selecao ${itemAtual ? 'selecionado' : ''}" data-item-nome="${escaparHtml(item.nome.toLowerCase())}">

        <span class="item-identificacao">

          <input type="checkbox" class="item-os-check" value="${item.id}" ${itemAtual ? 'checked' : ''} onchange="atualizarResumoItens('os')">

          <span class="item-icone">●</span>

          <span class="item-nome">${escaparHtml(item.nome)}<small>${quantidadeDisponivel} disponíveis</small></span>

        </span>

        <span class="item-quantidade">

          <small>Qtd.</small>

          <input type="number" class="item-os-qtd" data-item-id="${item.id}" min="1" max="${quantidadeDisponivel}" value="${itemAtual?.quantidade || 1}" aria-label="Quantidade de ${escaparHtml(item.nome)}">

        </span>

      </label>

    `;

  }).join('');

  return `<div class="itens-lista">${opcoes}</div>`;

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



  os.itensEstoque = itens.map(item => {
    const produto = AppData.estoque.find(registro => registro.id === item.estoqueId);
    const itemAnterior = itensAnteriores.find(registro => registro.estoqueId === item.estoqueId);
    return {
      ...item,
      nome: itemAnterior?.nome || produto.nome,
      precoUnitario: itemAnterior?.precoUnitario ?? obterPrecoEstoque(produto)
    };
  });

  descontarItensDoEstoque(os);

  registrarHistorico('ordens', 'alteração', `Itens previstos da OS #${id} atualizados.`);

  registrarHistorico('estoque', 'alteração', `Estoque atualizado pelos itens da OS #${id}.`);

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

  registrarHistorico('ordens', 'alteração', `Status da OS #${os.id} alterado para "${novoStatus}".`);

  if (novoStatus === STATUS_OS.CONCLUIDO && os.itensEstoque?.length) {

    registrarHistorico('estoque', 'alteração', `Estoque atualizado na conclusão da OS #${os.id}.`);

  }

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

  registrarHistorico('ordens', 'exclusão', `OS #${os.id} excluída.`);

  if (devolverItens && os.itensEstoque?.length) {

    registrarHistorico('estoque', 'alteração', `Itens da OS #${os.id} devolvidos ao estoque.`);

  }

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

  aplicarFiltrosOS();

}



function buscarOS(valor) {

  buscaOSAtual = valor;

  aplicarFiltrosOS();

}



function normalizarTexto(valor) {

  return String(valor || '')

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .toLocaleLowerCase();

}



function aplicarFiltrosOS() {

  const linhas = document.querySelectorAll('#tabela-os tbody tr');

  const busca = normalizarTexto(buscaOSAtual).trim();

  linhas.forEach(linha => {

    const correspondeStatus = filtroOSAtual === 'todos' || linha.getAttribute('data-status') === filtroOSAtual;

    const correspondeBusca = !busca || normalizarTexto(linha.dataset.busca).includes(busca);

    linha.style.display = correspondeStatus && correspondeBusca ? '' : 'none';

  });

}



// --- ESTOQUE ---

function gerarPrecoDemonstrativo(id) {
  const precos = [29.9, 49.9, 79.9, 119.9, 189.9];
  return precos[Math.abs(Number(id) || 0) % precos.length];
}

function obterPrecoEstoque(item) {
  const precoSalvo = item.precoVenda ?? item.preco;
  if (
    precoSalvo !== undefined
    && precoSalvo !== null
    && precoSalvo !== ''
    && Number.isFinite(Number(precoSalvo))
    && Number(precoSalvo) > 0
  ) {
    return Number(precoSalvo);
  }

  return gerarPrecoDemonstrativo(item.id);
}

function formatarPrecoEstoque(preco) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(preco);
}

function renderizarEstoque() {

  const grid = document.getElementById('lista-estoque');

  if (!grid) return;

  grid.innerHTML = AppData.estoque.map(item => {
    const badgeClass = item.qtd < 5 ? 'badge erro' : 'badge ok';
    const badgeTexto = item.qtd < 5 ? 'Repor Estoque' : 'Estoque Normal';
    const preco = obterPrecoEstoque(item);
    const id = Number(item.id);

    return `

      <div class="card-item">

        <b>${escaparHtml(item.nome)}</b>

        <p style="margin: 8px 0; font-size: 0.85rem;">Quantidade: <strong>${item.qtd}</strong></p>

        <p class="preco-estoque">Preço unitário: <strong>${formatarPrecoEstoque(preco)}</strong></p>

        <small class="preco-demonstrativo-nota">Valor demonstrativo</small>

        <span class="${badgeClass}">${badgeTexto}</span>

        <div class="acoes-estoque">

          <button class="btn-alterar-estoque" onclick="editarEstoque(${id})">Alterar</button>

          <button class="btn-deletar" onclick="deletarEstoque(${id})">Excluir</button>

        </div>

      </div>

    `;
  }).join('');

}



function adicionarEstoque(e) {

  e.preventDefault();

  const nome = document.getElementById('nomeItem').value.trim();
  const qtd = Number(document.getElementById('qtdItem').value);
  const precoInformado = document.getElementById('precoItem').value;
  const id = Date.now();
  const precoVenda = precoInformado === '' ? gerarPrecoDemonstrativo(id) : Number(precoInformado);

  if (!nome || !Number.isInteger(qtd) || qtd < 0 || !Number.isFinite(precoVenda) || precoVenda <= 0) {
    mostrarAlerta('Informe o nome da peça, uma quantidade inteira não negativa e um preço maior que zero.');
    return;
  }

  AppData.estoque.push({ id, nome, qtd, precoVenda });
  registrarHistorico(
    'estoque',
    'criação',
    `Item "${nome}" adicionado com quantidade inicial ${qtd} e preço demonstrativo ${formatarPrecoEstoque(precoVenda)}.`
  );

  salvarBD();

  renderizarTudo();

  e.target.reset();

}



function editarEstoque(id) {

  const item = AppData.estoque.find(registro => registro.id === id);

  if (!item) return;



  document.getElementById('edicao-nome-estoque').value = item.nome;

  document.getElementById('edicao-qtd-estoque').value = item.qtd;

  document.getElementById('edicao-preco-estoque').value = obterPrecoEstoque(item);

  const modal = document.getElementById('modal-edicao-estoque');

  modal.dataset.itemId = String(id);

  modal.hidden = false;

  document.body.classList.add('modal-aberto');

  document.getElementById('edicao-nome-estoque').focus();

}



function confirmarEdicaoEstoque(event) {

  event.preventDefault();

  const modal = document.getElementById('modal-edicao-estoque');

  const id = Number(modal.dataset.itemId);

  const item = AppData.estoque.find(registro => registro.id === id);

  const nome = document.getElementById('edicao-nome-estoque').value.trim();

  const qtd = Number(document.getElementById('edicao-qtd-estoque').value);
  const precoVenda = Number(document.getElementById('edicao-preco-estoque').value);

  if (!item || !nome || !Number.isInteger(qtd) || qtd < 0 || !Number.isFinite(precoVenda) || precoVenda <= 0) {
    mostrarAlerta('Informe um nome, uma quantidade inteira não negativa e um preço maior que zero.');
    return;
  }

  fecharEdicaoEstoque();

  abrirConfirmacao(
    `Confirma a alteração do item "${item.nome}" para "${nome}", com quantidade ${qtd} e preço demonstrativo ${formatarPrecoEstoque(precoVenda)}?`,
    () => {

      const nomeAnterior = item.nome;

      const quantidadeAnterior = item.qtd;
      const precoAnterior = obterPrecoEstoque(item);

      item.nome = nome;

      item.qtd = qtd;
      item.precoVenda = precoVenda;

      registrarHistorico(

        'estoque',

        'alteração',

        `Item "${nomeAnterior}" alterado para "${nome}" (${quantidadeAnterior} → ${qtd}; ${formatarPrecoEstoque(precoAnterior)} → ${formatarPrecoEstoque(precoVenda)}).`

      );

      salvarBD();

      renderizarTudo();

    },

    { titulo: 'Confirmar alteração', confirmarTexto: 'Alterar item' }

  );

}



function fecharEdicaoEstoque() {

  const modal = document.getElementById('modal-edicao-estoque');

  if (!modal || modal.hidden) return;

  modal.hidden = true;

  delete modal.dataset.itemId;

  document.body.classList.remove('modal-aberto');

}



function deletarEstoque(id) {

  const item = AppData.estoque.find(registro => registro.id === id);

  if (!item) return;



  abrirConfirmacao(

    `Deseja realmente excluir o item "${item.nome}" do estoque?`,

    () => {

      AppData.estoque = AppData.estoque.filter(registro => registro.id !== id);

      registrarHistorico('estoque', 'exclusão', `Item "${item.nome}" removido do estoque.`);

      salvarBD();

      renderizarTudo();

    },

    { titulo: 'Confirmar exclusão', confirmarTexto: 'Excluir item', classeConfirmar: 'btn-confirmar-perigo' }

  );

}



function renderizarHistorico() {

  const lista = document.getElementById('lista-historico');

  if (!lista) return;



  const moduloSelecionado = document.getElementById('filtro-historico-modulo')?.value || 'todos';

  const acaoSelecionada = document.getElementById('filtro-historico-acao')?.value || 'todos';

  const historico = AppData.historico.filter(registro =>
    (moduloSelecionado === 'todos' || registro.modulo === moduloSelecionado) &&
    (acaoSelecionada === 'todos' || registro.acao === acaoSelecionada)
  );



  if (!historico.length) {

    lista.innerHTML = '<div class="historico-vazio">Nenhuma alteração registrada para os filtros selecionados.</div>';

    return;

  }



  const nomesModulos = {

    ordens: 'Ordem de serviço',

    agendamentos: 'Agendamento',

    estoque: 'Estoque'

  };

  lista.innerHTML = historico.map(registro => {

    const data = new Date(registro.ocorridoEm);

    const dataFormatada = Number.isNaN(data.getTime())

      ? 'Data indisponível'

      : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    return `

      <article class="historico-registro">

        <div class="historico-icone" aria-hidden="true">↗️</div>

        <div class="historico-detalhes">

          <div class="historico-registro-topo">

            <strong>${escaparHtml(registro.descricao)}</strong>

            <span class="historico-modulo">${escaparHtml(nomesModulos[registro.modulo] || registro.modulo)}</span>

          </div>

          <div class="historico-registro-rodape">

            <span class="historico-acao">${escaparHtml(registro.acao)}</span>

            <time datetime="${escaparHtml(registro.ocorridoEm)}">${dataFormatada}</time>

          </div>

        </div>

      </article>

    `;

  }).join('');

}

function alterarFiltrosHistorico() {
  renderizarHistorico();
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

    registrarHistorico('agendamentos', 'cancelamento', `Agendamento de ${agendamento.nome} cancelado.`);

    if (ordem) registrarHistorico('ordens', 'alteração', `OS #${ordem.id} marcada como cancelada.`);

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

    <label class="item-selecao" data-item-nome="${escaparHtml(item.nome.toLowerCase())}">

      <span class="item-identificacao">

        <input type="checkbox" class="item-agenda-check" value="${item.id}" onchange="atualizarResumoItens('agenda')">

        <span class="item-icone">●</span>

        <span class="item-nome">${item.nome}<small>${item.qtd} disponíveis</small></span>

      </span>

      <span class="item-quantidade">

        <small>Qtd.</small>

        <input type="number" class="item-agenda-qtd" data-item-id="${item.id}" min="1" max="${item.qtd}" value="1" aria-label="Quantidade de ${item.nome}">

      </span>

    </label>

  `).join('');

  atualizarResumoItens('agenda');

}



function atualizarResumoItens(tipo) {

  const seletor = tipo === 'os' ? '.item-os-check:checked' : '.item-agenda-check:checked';

  const contador = document.getElementById(`contador-itens-${tipo}`);

  if (contador) contador.textContent = `${document.querySelectorAll(seletor).length} selecionados`;

}



function filtrarItens(tipo, termo) {

  const containerId = tipo === 'os' ? 'itens-edicao-os' : 'itens-disponiveis-agenda';

  const container = document.getElementById(containerId);

  if (!container) return;



  const busca = termo.trim().toLocaleLowerCase();

  container.querySelectorAll('.item-selecao').forEach(item => {

    item.hidden = busca && !item.dataset.itemNome.includes(busca);

  });

}

// =============================================

// MÓDULO DE ORÇAMENTO DE PEÇAS E ESTOQUE

// =============================================



AppData.orcamentos ||= [];

AppData.movimentacoesEstoque ||= [];

AppData.contadorOrcamento ||= 1;



// =============================================

// ORÇAMENTO DE PEÇAS
// =============================================


function obterDadosClienteOS(os) {
  const agendamento = AppData.agendamentos.find(ag => ag.osId === os.id);
  if (agendamento) {
    return {
      cliente: agendamento.nome || '',
      veiculo: agendamento.veiculo || '',
      placa: agendamento.placa || ''
    };
  }

  const correspondencia = String(os.cliente || '').match(/^(.*?)\s*\((.*)\)$/);
  if (!correspondencia) {
    return { cliente: String(os.cliente || ''), veiculo: '', placa: '' };
  }

  const cliente = correspondencia[1].trim();
  const detalhes = correspondencia[2].trim();
  const separador = detalhes.lastIndexOf(' - ');
  return separador < 0
    ? { cliente, veiculo: detalhes, placa: '' }
    : {
      cliente,
      veiculo: detalhes.slice(0, separador).trim(),
      placa: detalhes.slice(separador + 3).trim()
    };
}

function obterItensOrcamentoOS(os) {
  return (os?.itensEstoque || []).map(itemOS => {
    const produto = AppData.estoque.find(item => item.id === itemOS.estoqueId);
    const precoSalvo = Number(itemOS.precoUnitario);
    const precoUnitario = Number.isFinite(precoSalvo) && precoSalvo > 0
      ? precoSalvo
      : produto ? obterPrecoEstoque(produto) : null;
    const quantidade = Number(itemOS.quantidade);

    return {
      estoqueId: itemOS.estoqueId,
      nome: itemOS.nome || produto?.nome || 'Item removido do estoque',
      quantidade,
      precoUnitario,
      subtotal: precoUnitario === null ? null : arredondarMoeda(precoUnitario * quantidade)
    };
  });
}

function arredondarMoeda(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function atualizarTotalOrcamento() {
  const osId = document.getElementById('orcOS')?.value;
  const os = AppData.ordens.find(ordem => String(ordem.id) === osId);
  const subtotalItens = arredondarMoeda(obterItensOrcamentoOS(os).reduce(
    (soma, item) => soma + (Number.isFinite(item.subtotal) ? item.subtotal : 0),
    0
  ));
  const maoDeObra = Number(document.getElementById('orcMaoObra')?.value) || 0;

  document.getElementById('orcSubtotalItens').textContent = formatarPrecoEstoque(subtotalItens);
  document.getElementById('orcResumoMaoObra').textContent = formatarPrecoEstoque(maoDeObra);
  document.getElementById('orcTotal').textContent = formatarPrecoEstoque(arredondarMoeda(subtotalItens + maoDeObra));
}

function selecionarOrdemOrcamento(osId) {
  const os = AppData.ordens.find(ordem => String(ordem.id) === String(osId));
  const dadosCliente = os
    ? obterDadosClienteOS(os)
    : { cliente: '', veiculo: '', placa: '' };

  document.getElementById('orcCliente').value = dadosCliente.cliente;
  document.getElementById('orcVeiculo').value = dadosCliente.veiculo;
  document.getElementById('orcPlaca').value = dadosCliente.placa;
  renderizarItensOrcamento();
  atualizarTotalOrcamento();
}

function criarOrcamento(event) {

  event.preventDefault();

  const osId = document.getElementById('orcOS').value;
  const os = AppData.ordens.find(ordem => String(ordem.id) === osId);
  const dadosCliente = os
    ? obterDadosClienteOS(os)
    : { cliente: '', veiculo: '', placa: '' };
  const cliente = dadosCliente.cliente;
  const veiculo = dadosCliente.veiculo;
  const placa = dadosCliente.placa;
  const observacao = document.getElementById('orcObservacao').value.trim();
  const maoDeObra = Number(document.getElementById('orcMaoObra').value);

  if (!os || !cliente || !veiculo || !placa) {
    mostrarAlerta('Selecione uma ordem de serviço com os dados do cliente, veículo e placa.');
    return;

  }

  if (!Number.isFinite(maoDeObra) || maoDeObra < 0) {
    mostrarAlerta('Informe um custo de mão de obra válido, igual ou maior que zero.');
    return;
  }

  const itens = obterItensOrcamentoOS(os);
  if (itens.some(item =>
    !Number.isInteger(item.quantidade)
    || item.quantidade < 1
    || !Number.isFinite(item.precoUnitario)
    || item.precoUnitario < 0
  )) {
    mostrarAlerta('Confira os itens da ordem de serviço e seus preços antes de criar o orçamento.');
    return;
  }

  const subtotalItens = arredondarMoeda(itens.reduce((soma, item) => soma + item.subtotal, 0));
  const custoMaoDeObra = arredondarMoeda(maoDeObra);
  const orcamento = {

    id: AppData.contadorOrcamento++,

    osId: os.id,

    cliente,

    veiculo,

    placa,

    observacao,

    itens,

    subtotalItens,

    maoDeObra: custoMaoDeObra,

    total: arredondarMoeda(subtotalItens + custoMaoDeObra),

    status: 'Pendente',

    criadoEm: new Date().toISOString()

  };



  AppData.orcamentos.unshift(orcamento);



  registrarHistorico(

    'orcamentos',

    'criação',

    `Orçamento #${orcamento.id} criado para ${cliente}.`

  );



  salvarBD();

  document.getElementById('form-orcamento').reset();
  renderizarItensOrcamento();
  renderizarOrcamentos();
  atualizarTotalOrcamento();



  mostrarAlerta('Orçamento criado com sucesso!');

}





// Mostrar peças disponíveis

function renderizarItensOrcamento() {

  const container = document.getElementById('orc-lista-pecas');

  if (!container) return;

  const seletor = document.getElementById('orcOS');
  if (!seletor) return;

  const osSelecionada = seletor.value;
  const ordensAtivas = AppData.ordens.filter(os => obterStatusOS(os) !== STATUS_OS.CANCELADO);
  seletor.innerHTML = `
    <option value="">Selecione uma ordem de serviço</option>
    ${ordensAtivas.map(os => {
      const dados = obterDadosClienteOS(os);
      const veiculo = [dados.veiculo, dados.placa].filter(Boolean).join(' - ');
      return `<option value="${escaparHtml(os.id)}">OS #${escaparHtml(os.id)} — ${escaparHtml(dados.cliente)} — ${escaparHtml(veiculo)}</option>`;
    }).join('')}
  `;
  if (ordensAtivas.some(os => String(os.id) === osSelecionada)) {
    seletor.value = osSelecionada;
  }

  const os = ordensAtivas.find(ordem => String(ordem.id) === seletor.value);
  const itens = obterItensOrcamentoOS(os);
  container.innerHTML = !os
    ? '<p>Selecione uma ordem de serviço para carregar os itens.</p>'
    : itens.length
      ? itens.map(item => `
        <div class="orc-peca">
          <strong>${escaparHtml(item.nome)}</strong>
          <span>${item.quantidade} × ${Number.isFinite(item.precoUnitario) ? formatarPrecoEstoque(item.precoUnitario) : 'Preço indisponível'}</span>
          <strong>${Number.isFinite(item.subtotal) ? formatarPrecoEstoque(item.subtotal) : 'Subtotal indisponível'}</strong>
        </div>
      `).join('')
      : '<p>Esta ordem de serviço não possui itens vinculados; o orçamento poderá incluir apenas a mão de obra.</p>';

}





// Listar orçamentos

let filtroOrcamentoAtual = 'todos';

function filtrarOrcamentos(status, botao) {
  filtroOrcamentoAtual = status;
  document.querySelectorAll('.filtros-orcamentos .btn-filtro').forEach(item => {
    item.classList.toggle('active', item === botao);
  });
  renderizarOrcamentos();
}

function renderizarOrcamentos() {
  const container = document.getElementById('lista-orcamentos');
  if (!container) return;

  const orcamentos = AppData.orcamentos.filter(orc =>
    filtroOrcamentoAtual === 'todos' || orc.status === filtroOrcamentoAtual
  );
  container.innerHTML = orcamentos.map(orc => {
    const classeStatus = {
      Pendente: 'pendente',
      Aprovado: 'aprovado',
      Recusado: 'recusado'
    }[orc.status] || 'pendente';
    return `
      <button type="button" class="orcamento-lista-item" onclick="abrirDetalhesOrcamento(${Number(orc.id)})" aria-label="Abrir orçamento ${escaparHtml(orc.id)} de ${escaparHtml(orc.cliente)}">
        <span class="orcamento-lista-identificacao">
          <strong>Orçamento #${escaparHtml(orc.id)}</strong>
          <span>${escaparHtml(orc.cliente)}</span>
        </span>
        <span class="orcamento-status ${classeStatus}">${escaparHtml(orc.status)}</span>
      </button>
    `;
  }).join('') || `<p class="orcamentos-vazio">${filtroOrcamentoAtual === 'todos' ? 'Nenhum orçamento cadastrado.' : `Nenhum orçamento com status "${escaparHtml(filtroOrcamentoAtual)}".`}</p>`;
}

function abrirDetalhesOrcamento(id) {
  const orc = AppData.orcamentos.find(item => item.id === id);
  if (!orc) return;

  const itens = Array.isArray(orc.itens) ? orc.itens : [];
  const subtotalItens = Number.isFinite(Number(orc.subtotalItens))
    ? Number(orc.subtotalItens)
    : itens.reduce((soma, item) => soma + (Number(item.subtotal) || 0), 0);
  const maoDeObra = Number(orc.maoDeObra) || 0;
  const total = Number.isFinite(Number(orc.total))
    ? Number(orc.total)
    : subtotalItens + maoDeObra;
  const veiculoPlaca = [orc.veiculo, orc.placa].filter(Boolean).join(' - ');
  const modal = document.getElementById('modal-detalhes-orcamento');

  document.getElementById('modal-orcamento-titulo').textContent = `Orçamento #${orc.id}`;
  document.getElementById('modal-orcamento-detalhes').innerHTML = `
    <div class="modal-os-grade">
      ${orc.osId ? `<div><span>Ordem de serviço</span><strong>#${escaparHtml(orc.osId)}</strong></div>` : ''}
      <div><span>Cliente</span><strong>${escaparHtml(orc.cliente)}</strong></div>
      <div><span>Veículo e placa</span><strong>${escaparHtml(veiculoPlaca)}</strong></div>
      <div><span>Status</span><strong class="orcamento-status-texto">${escaparHtml(orc.status)}</strong></div>
    </div>
    <section class="orcamento-modal-itens">
      <h3>Itens do orçamento</h3>
      ${itens.length ? `
        <div class="orcamento-modal-lista">
          ${itens.map(item => `
            <div class="orcamento-modal-item">
              <span>${escaparHtml(item.nome)} <small>${Number(item.quantidade) || 0} × ${formatarPrecoEstoque(Number(item.precoUnitario) || 0)}</small></span>
              <strong>${formatarPrecoEstoque(Number(item.subtotal) || 0)}</strong>
            </div>
          `).join('')}
        </div>
      ` : '<p>Sem itens vinculados.</p>'}
      <div class="orcamento-modal-totais">
        <p><span>Subtotal dos itens</span><strong>${formatarPrecoEstoque(subtotalItens)}</strong></p>
        <p><span>Mão de obra</span><strong>${formatarPrecoEstoque(maoDeObra)}</strong></p>
        <p class="orcamento-modal-total"><span>Total</span><strong>${formatarPrecoEstoque(total)}</strong></p>
      </div>
    </section>
    ${orc.observacao ? `<div class="modal-os-bloco"><span>Observações</span><p>${escaparHtml(orc.observacao)}</p></div>` : ''}
    ${orc.status === 'Pendente' ? `
      <div class="modal-confirmacao-acoes orcamento-modal-acoes">
        <button type="button" class="btn-confirmacao btn-cancelar" onclick="alterarStatusOrcamento(${Number(orc.id)}, 'Recusado')">Recusar</button>
        <button type="button" class="btn-confirmacao" onclick="alterarStatusOrcamento(${Number(orc.id)}, 'Aprovado')">Aprovar</button>
      </div>
    ` : ''}
  `;

  modal.hidden = false;
  document.body.classList.add('modal-aberto');
  modal.querySelector('.modal-os-fechar').focus();
}

function fecharDetalhesOrcamento() {
  const modal = document.getElementById('modal-detalhes-orcamento');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('modal-aberto');
}





// Aprovar ou recusar orçamento

function alterarStatusOrcamento(id, status) {
  const orc = AppData.orcamentos.find(item => item.id === id);
  if (!orc || orc.status !== 'Pendente') return;
  if (!['Aprovado', 'Recusado'].includes(status)) return;

  const acao = status === 'Aprovado' ? 'aprovação' : 'recusa';
  abrirConfirmacao(
    `Confirma a ${acao} do orçamento #${orc.id}, de ${orc.cliente}?`,
    () => confirmarStatusOrcamento(id, status),
    {
      titulo: `Confirmar ${acao} do orçamento`,
      confirmarTexto: status === 'Aprovado' ? 'Aprovar orçamento' : 'Recusar orçamento',
      classeConfirmar: status === 'Recusado' ? 'btn-confirmar-perigo' : ''
    }
  );
}

function confirmarStatusOrcamento(id, status) {
  const orc = AppData.orcamentos.find(o => o.id === id);
  const modalAberto = !document.getElementById('modal-detalhes-orcamento')?.hidden;



  if (!orc || orc.status !== 'Pendente') return;



  if (!['Aprovado', 'Recusado'].includes(status)) return;



  if (status === 'Aprovado') {

    const itens = Array.isArray(orc.itens) ? orc.itens : [];
    const itensDaOS = Boolean(orc.osId);

    if (!itensDaOS) {
      for (const item of itens) {

        const produto = AppData.estoque.find(
          p => p.id === item.estoqueId
        );

        if (!produto || produto.qtd < item.quantidade) {

          mostrarAlerta(`Estoque insuficiente: ${item.nome}`);

          return;

        }

      }

      itens.forEach(item => {

        const produto = AppData.estoque.find(
          p => p.id === item.estoqueId
        );

        produto.qtd -= item.quantidade;

      });

      orc.estoqueDebitado = true;

      registrarHistorico(

        'estoque',

        'saída',

        `Peças do orçamento #${id} retiradas do estoque após aprovação.`

      );

    }
  }



  orc.status = status;



  registrarHistorico(

    'orcamentos',

    'alteração',

    `Orçamento #${id} ${status}.`

  );



  salvarBD();

  renderizarTudo();

  renderizarOrcamentos();
  if (modalAberto) abrirDetalhesOrcamento(id);

}








// =============================================

// CONTROLE DE ESTOQUE

// =============================================



function atualizarSelectEstoque() {

  const select = document.getElementById('movItem');

  if (!select) return;



  select.innerHTML = `

    <option value="">Selecione uma peça</option>

    ${AppData.estoque.map(item => `

      <option value="${item.id}">

        ${escaparHtml(item.nome)} (${item.qtd} unidades)

      </option>

    `).join('')}

  `;

}





// Registrar entrada e saída

function movimentarEstoque(event) {

  event.preventDefault();



  const id = Number(document.getElementById('movItem').value);

  const tipo = document.getElementById('movTipo').value;

  const quantidade = Number(document.getElementById('movQtd').value);

  const observacao = document.getElementById('movObservacao').value.trim();



  const item = AppData.estoque.find(p => p.id === id);



  if (!item || !Number.isInteger(quantidade) || quantidade < 1) {

    mostrarAlerta('Informe uma peça e uma quantidade válida.');

    return;

  }



  if (!['entrada', 'saida'].includes(tipo)) return;



  if (tipo === 'saida' && item.qtd < quantidade) {

    mostrarAlerta('Estoque insuficiente!');

    return;

  }



  const anterior = item.qtd;



  item.qtd += tipo === 'entrada' ? quantidade : -quantidade;



  AppData.movimentacoesEstoque.unshift({

    id: Date.now(),

    estoqueId: item.id,

    produto: item.nome,

    tipo,

    quantidade,

    quantidadeAnterior: anterior,

    quantidadeAtual: item.qtd,

    observacao,

    data: new Date().toISOString()

  });



  registrarHistorico(

    'estoque',

    tipo,

    `${tipo} de ${quantidade} unidades de ${item.nome}.`

  );



  salvarBD();

  renderizarTudo();

  atualizarSelectEstoque();

  renderizarMovimentacoesEstoque();



  document.getElementById('form-movimentacao').reset();



  mostrarAlerta('Movimentação registrada com sucesso!');

}





// Histórico de movimentações

function renderizarMovimentacoesEstoque() {

  const container = document.getElementById('historico-estoque');

  if (!container) return;



  container.innerHTML = AppData.movimentacoesEstoque.map(m => `

    <div class="movimentacao-estoque">

      <strong>${escaparHtml(m.produto)}</strong>



      <p>Tipo: ${m.tipo === 'entrada' ? 'Entrada' : 'Saída'}</p>



      <p>Quantidade: ${m.quantidade}</p>



      <p>Estoque anterior: ${m.quantidadeAnterior}</p>



      <p>Estoque atual: ${m.quantidadeAtual}</p>



      <small>${new Date(m.data).toLocaleString('pt-BR')}</small>



      <p>${escaparHtml(m.observacao || '')}</p>

    </div>

  `).join('') || '<p>Nenhuma movimentação registrada.</p>';

}





// Inicialização

function inicializarModuloPecas() {

  AppData.orcamentos ||= [];

  AppData.movimentacoesEstoque ||= [];

  AppData.contadorOrcamento ||= 1;



  renderizarItensOrcamento();

  renderizarOrcamentos();

  atualizarSelectEstoque();

  renderizarMovimentacoesEstoque();



  salvarBD();

}