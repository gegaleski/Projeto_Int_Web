
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowLeftRight,
  Plus,
  Search,
  RefreshCw,
  X,
  MapPin,
  CalendarDays,
  UserRound,
  Monitor,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Clock3,
  Package,
  ChevronDown,
} from 'lucide-vue-next'
import api from '../services/api'

type TipoMovimentacao =
  | 'TRANSFERENCIA'
  | 'ENVIO_MANUTENCAO'
  | 'RETORNO_MANUTENCAO'

type StatusEquipamento =
  | 'DISPONIVEL'
  | 'EM_USO'
  | 'EM_MANUTENCAO'
  | 'INATIVO'

interface Equipamento {
  id: number
  codigo_patrimonial: string
  nome: string
  numero_serie?: string
  localizacao: string
  status: StatusEquipamento
}

interface Movimentacao {
  id: number
  equipamento: number | Equipamento
  equipamento_detalhes?: Equipamento
  tipo: TipoMovimentacao
  origem: string
  destino: string
  responsavel: string
  descricao?: string
  data_movimentacao: string
}

interface FormularioMovimentacao {
  equipamento: string
  tipo: TipoMovimentacao
  origem: string
  destino: string
  responsavel: string
  descricao: string
  novo_status: StatusEquipamento | ''
}

const movimentacoes = ref<Movimentacao[]>([])
const equipamentos = ref<Equipamento[]>([])

const loading = ref(true)
const salvando = ref(false)
const atualizando = ref(false)

const erro = ref('')
const sucesso = ref('')

const modalAberto = ref(false)

const busca = ref('')
const filtroTipo = ref('TODOS')
const filtroPeriodo = ref('TODOS')

const paginaAtual = ref(1)
const itensPorPagina = 8

const formulario = ref<FormularioMovimentacao>({
  equipamento: '',
  tipo: 'TRANSFERENCIA',
  origem: '',
  destino: '',
  responsavel: '',
  descricao: '',
  novo_status: '',
})

const errosFormulario = ref<Record<string, string>>({})

const tiposMovimentacao = [
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'ENVIO_MANUTENCAO', label: 'Envio para manutenção' },
  { value: 'RETORNO_MANUTENCAO', label: 'Retorno de manutenção' },
] as const

const statusEquipamento = [
  { value: 'DISPONIVEL', label: 'Disponível' },
  { value: 'EM_USO', label: 'Em uso' },
  { value: 'EM_MANUTENCAO', label: 'Em manutenção' },
  { value: 'INATIVO', label: 'Inativo' },
] as const

const equipamentoSelecionado = computed(() => {
  return equipamentos.value.find(
    item => String(item.id) === formulario.value.equipamento,
  )
})

const totalMovimentacoes = computed(() => movimentacoes.value.length)

const totalTransferencias = computed(() =>
  movimentacoes.value.filter(item => item.tipo === 'TRANSFERENCIA').length,
)

const totalEnvios = computed(() =>
  movimentacoes.value.filter(item => item.tipo === 'ENVIO_MANUTENCAO').length,
)

const totalRetornos = computed(() =>
  movimentacoes.value.filter(item => item.tipo === 'RETORNO_MANUTENCAO').length,
)

const movimentacoesFiltradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()

  return movimentacoes.value.filter(item => {
    const equipamento = obterEquipamento(item)

    const correspondeBusca =
      !termo ||
      equipamento?.codigo_patrimonial?.toLowerCase().includes(termo) ||
      equipamento?.nome?.toLowerCase().includes(termo) ||
      item.origem?.toLowerCase().includes(termo) ||
      item.destino?.toLowerCase().includes(termo) ||
      item.responsavel?.toLowerCase().includes(termo)

    const correspondeTipo =
      filtroTipo.value === 'TODOS' || item.tipo === filtroTipo.value

    const data = new Date(item.data_movimentacao)
    const agora = new Date()

    let correspondePeriodo = true

    if (filtroPeriodo.value === 'HOJE') {
      correspondePeriodo =
        !Number.isNaN(data.getTime()) &&
        data.toDateString() === agora.toDateString()
    }

    if (filtroPeriodo.value === '7_DIAS') {
      const limite = new Date()
      limite.setDate(agora.getDate() - 7)

      correspondePeriodo =
        !Number.isNaN(data.getTime()) && data >= limite
    }

    if (filtroPeriodo.value === '30_DIAS') {
      const limite = new Date()
      limite.setDate(agora.getDate() - 30)

      correspondePeriodo =
        !Number.isNaN(data.getTime()) && data >= limite
    }

    return correspondeBusca && correspondeTipo && correspondePeriodo
  })
})

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(movimentacoesFiltradas.value.length / itensPorPagina)),
)

const movimentacoesPaginadas = computed(() => {
  const inicio = (paginaAtual.value - 1) * itensPorPagina

  return movimentacoesFiltradas.value.slice(
    inicio,
    inicio + itensPorPagina,
  )
})

const primeiroItem = computed(() =>
  movimentacoesFiltradas.value.length
    ? (paginaAtual.value - 1) * itensPorPagina + 1
    : 0,
)

const ultimoItem = computed(() =>
  Math.min(
    paginaAtual.value * itensPorPagina,
    movimentacoesFiltradas.value.length,
  ),
)

function normalizarLista<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]

  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: T[] }).results
  }

  return []
}

function obterEquipamento(item: Movimentacao): Equipamento | undefined {
  if (item.equipamento_detalhes) {
    return item.equipamento_detalhes as Equipamento
  }

  if (typeof item.equipamento === 'object') {
    return item.equipamento as Equipamento
  }

  return equipamentos.value.find(
    equipamento => equipamento.id === item.equipamento,
  )
}

function nomeEquipamento(item: Movimentacao) {
  const equipamento = obterEquipamento(item)

  if (!equipamento) {
    return typeof item.equipamento === 'number'
      ? `Equipamento #${item.equipamento}`
      : 'Equipamento não identificado'
  }

  return `${equipamento.codigo_patrimonial} - ${equipamento.nome}`
}

function nomeTipo(tipo: string) {
  const nomes: Record<string, string> = {
    TRANSFERENCIA: 'Transferência',
    ENVIO_MANUTENCAO: 'Envio para manutenção',
    RETORNO_MANUTENCAO: 'Retorno de manutenção',
  }

  return nomes[tipo] || tipo
}

function classeTipo(tipo: string) {
  const classes: Record<string, string> = {
    TRANSFERENCIA: 'bg-blue-50 text-blue-700',
    ENVIO_MANUTENCAO: 'bg-amber-50 text-amber-700',
    RETORNO_MANUTENCAO: 'bg-emerald-50 text-emerald-700',
  }

  return classes[tipo] || 'bg-slate-100 text-slate-600'
}

function iconeTipo(tipo: string) {
  if (tipo === 'TRANSFERENCIA') return ArrowLeftRight
  if (tipo === 'ENVIO_MANUTENCAO') return Wrench
  return CheckCircle2
}

function nomeStatus(status?: string) {
  const nomes: Record<string, string> = {
    DISPONIVEL: 'Disponível',
    EM_USO: 'Em uso',
    EM_MANUTENCAO: 'Em manutenção',
    INATIVO: 'Inativo',
  }

  return status ? nomes[status] || status : '—'
}

function classeStatus(status?: string) {
  const classes: Record<string, string> = {
    DISPONIVEL: 'bg-emerald-50 text-emerald-700',
    EM_USO: 'bg-blue-50 text-blue-700',
    EM_MANUTENCAO: 'bg-amber-50 text-amber-700',
    INATIVO: 'bg-slate-100 text-slate-600',
  }

  return status ? classes[status] || 'bg-slate-100 text-slate-600' : ''
}

function formatarData(data: string) {
  if (!data) return '—'

  const dataObj = new Date(data)

  if (Number.isNaN(dataObj.getTime())) return '—'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dataObj)
}

function formatarHora(data: string) {
  if (!data) return '—'

  const dataObj = new Date(data)

  if (Number.isNaN(dataObj.getTime())) return '—'

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(dataObj)
}

function mensagemErro(error: unknown) {
  const resposta = error as {
    response?: {
      data?: Record<string, unknown>
    }
  }

  const dados = resposta.response?.data

  if (!dados) {
    return 'Não foi possível concluir a operação. Verifique a conexão com a API.'
  }

  if (typeof dados.detail === 'string') return dados.detail

  const primeiraMensagem = Object.values(dados).flat()[0]

  return typeof primeiraMensagem === 'string'
    ? primeiraMensagem
    : 'Verifique os dados informados e tente novamente.'
}

async function carregarDados() {
  loading.value = true
  erro.value = ''

  try {
    const [respostaMovimentacoes, respostaEquipamentos] = await Promise.all([
      api.get('/movimentacoes/'),
      api.get('/equipamentos/'),
    ])

    movimentacoes.value = normalizarLista<Movimentacao>(
      respostaMovimentacoes.data,
    )

    equipamentos.value = normalizarLista<Equipamento>(
      respostaEquipamentos.data,
    )
  } catch (error) {
    erro.value = mensagemErro(error)
  } finally {
    loading.value = false
  }
}

async function atualizarDados() {
  atualizando.value = true
  await carregarDados()
  atualizando.value = false
}

function abrirModal() {
  errosFormulario.value = {}
  sucesso.value = ''
  erro.value = ''

  formulario.value = {
    equipamento: '',
    tipo: 'TRANSFERENCIA',
    origem: '',
    destino: '',
    responsavel: '',
    descricao: '',
    novo_status: '',
  }

  modalAberto.value = true
}

function fecharModal() {
  if (salvando.value) return

  modalAberto.value = false
  errosFormulario.value = {}
}

function selecionarEquipamento() {
  const equipamento = equipamentoSelecionado.value

  formulario.value.origem = equipamento?.localizacao || ''

  if (formulario.value.tipo === 'ENVIO_MANUTENCAO') {
    formulario.value.destino = 'Assistência técnica'
  } else if (formulario.value.tipo === 'RETORNO_MANUTENCAO') {
    formulario.value.origem = 'Assistência técnica'
    formulario.value.destino = equipamento?.localizacao || ''
  } else {
    formulario.value.destino = ''
  }
}

function alterarTipo() {
  formulario.value.novo_status = ''

  const equipamento = equipamentoSelecionado.value

  if (formulario.value.tipo === 'ENVIO_MANUTENCAO') {
    formulario.value.destino = 'Assistência técnica'
    formulario.value.origem = equipamento?.localizacao || ''
  } else if (formulario.value.tipo === 'RETORNO_MANUTENCAO') {
    formulario.value.origem = 'Assistência técnica'
    formulario.value.destino = equipamento?.localizacao || ''
  } else {
    formulario.value.origem = equipamento?.localizacao || ''
    formulario.value.destino = ''
  }
}

function validarFormulario() {
  const novosErros: Record<string, string> = {}

  if (!formulario.value.equipamento) {
    novosErros.equipamento = 'Selecione um equipamento.'
  }

  if (!formulario.value.origem.trim()) {
    novosErros.origem = 'Informe a origem.'
  }

  if (!formulario.value.destino.trim()) {
    novosErros.destino = 'Informe o destino.'
  }

  if (!formulario.value.responsavel.trim()) {
    novosErros.responsavel = 'Informe o responsável.'
  }

  if (
    formulario.value.tipo === 'TRANSFERENCIA' &&
    !formulario.value.novo_status
  ) {
    novosErros.novo_status = 'Selecione o novo status do equipamento.'
  }

  errosFormulario.value = novosErros

  return Object.keys(novosErros).length === 0
}

async function salvarMovimentacao() {
  erro.value = ''
  sucesso.value = ''

  if (!validarFormulario()) return

  salvando.value = true

  try {
    const payload: Record<string, unknown> = {
      equipamento: Number(formulario.value.equipamento),
      tipo: formulario.value.tipo,
      origem: formulario.value.origem.trim(),
      destino: formulario.value.destino.trim(),
      responsavel: formulario.value.responsavel.trim(),
      descricao: formulario.value.descricao.trim(),
    }

    if (formulario.value.tipo === 'TRANSFERENCIA') {
      payload.novo_status = formulario.value.novo_status
    }

    await api.post('/movimentacoes/', payload)

    modalAberto.value = false
    sucesso.value = 'Movimentação registrada com sucesso.'

    await carregarDados()

    window.setTimeout(() => {
      sucesso.value = ''
    }, 5000)
  } catch (error) {
    erro.value = mensagemErro(error)
  } finally {
    salvando.value = false
  }
}

function alterarPagina(pagina: number) {
  if (pagina < 1 || pagina > totalPaginas.value) return
  paginaAtual.value = pagina
}

function limparFiltros() {
  busca.value = ''
  filtroTipo.value = 'TODOS'
  filtroPeriodo.value = 'TODOS'
  paginaAtual.value = 1
}

function alterarFiltro() {
  paginaAtual.value = 1
}

onMounted(carregarDados)
</script>

<template>
  <div class="w-full min-w-0 space-y-6 px-5 py-7 text-[#172b4d] sm:px-8 lg:px-9">
    <!-- Cabeçalho -->
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div class="mb-2 flex items-center gap-2 text-[11px] text-[#8290a5]">
          <span>LabControl</span>
          <span>/</span>
          <span class="font-medium text-[#2457a7]">Movimentações</span>
        </div>

        <h1 class="text-[26px] font-bold tracking-tight text-[#172b4d]">
          Movimentações
        </h1>

        <p class="mt-1 text-xs text-[#8793a6]">
          Consulte o histórico e registre movimentações dos equipamentos.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          :disabled="atualizando || loading"
          class="flex items-center gap-2 rounded-lg border border-[#dce3ee] bg-white px-4 py-2.5 text-xs font-semibold text-[#2457a7] transition hover:bg-blue-50 disabled:opacity-60"
          @click="atualizarDados"
        >
          <RefreshCw
            :size="16"
            :class="{ 'animate-spin': atualizando || loading }"
          />
          Atualizar
        </button>

        <button
          type="button"
          class="flex items-center gap-2 rounded-lg bg-[#2457A7] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1948cc]"
          @click="abrirModal"
        >
          <Plus :size="17" />
          Nova movimentação
        </button>
      </div>
    </header>

    <!-- Mensagens -->
    <div
      v-if="erro && !modalAberto"
      class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
    >
      <AlertCircle :size="17" />
      {{ erro }}
    </div>

    <div
      v-if="sucesso"
      class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700"
    >
      <CheckCircle2 :size="17" />
      {{ sucesso }}
    </div>

    <!-- Indicadores -->
    <section class="grid grid-cols-4 gap-4 max-[1050px]:grid-cols-2 max-[480px]:grid-cols-1">
      <article class="rounded-xl border border-[#e8edf4] bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#78869a]">Total de movimentações</span>
          <div class="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-[#3977dc]">
            <ClipboardList :size="19" />
          </div>
        </div>
        <strong class="mt-3 block text-[27px] font-bold text-[#172b4d]">
          {{ totalMovimentacoes }}
        </strong>
        <span class="mt-1 block text-[10px] text-[#99a3b2]">
          Registros no histórico
        </span>
      </article>

      <article class="rounded-xl border border-[#e8edf4] bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#78869a]">Transferências</span>
          <div class="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-[#3977dc]">
            <ArrowLeftRight :size="19" />
          </div>
        </div>
        <strong class="mt-3 block text-[27px] font-bold text-[#172b4d]">
          {{ totalTransferencias }}
        </strong>
        <span class="mt-1 block text-[10px] text-[#99a3b2]">
          Mudanças de localização
        </span>
      </article>

      <article class="rounded-xl border border-[#e8edf4] bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#78869a]">Envios para manutenção</span>
          <div class="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-[#d88b25]">
            <Wrench :size="19" />
          </div>
        </div>
        <strong class="mt-3 block text-[27px] font-bold text-[#172b4d]">
          {{ totalEnvios }}
        </strong>
        <span class="mt-1 block text-[10px] text-[#99a3b2]">
          Equipamentos encaminhados
        </span>
      </article>

      <article class="rounded-xl border border-[#e8edf4] bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs text-[#78869a]">Retornos de manutenção</span>
          <div class="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-[#16a36a]">
            <CheckCircle2 :size="19" />
          </div>
        </div>
        <strong class="mt-3 block text-[27px] font-bold text-[#172b4d]">
          {{ totalRetornos }}
        </strong>
        <span class="mt-1 block text-[10px] text-[#99a3b2]">
          Retornos registrados
        </span>
      </article>
    </section>

    <!-- Histórico -->
    <section class="overflow-hidden rounded-xl border border-[#e8edf4] bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f5] px-5 py-4">
        <div>
          <h2 class="text-sm font-bold text-[#172b4d]">
            Histórico de movimentações
          </h2>
          <p class="mt-1 text-[11px] text-[#8793a6]">
            Acompanhe as alterações realizadas nos equipamentos.
          </p>
        </div>

        <div class="flex items-center gap-2 text-[11px] text-[#8793a6]">
          <Clock3 :size="15" />
          Ordenado pelos registros mais recentes
        </div>
      </div>

      <!-- Filtros -->
      <div class="grid grid-cols-[minmax(200px,1fr)_210px_170px_auto] gap-3 border-b border-[#edf0f5] bg-[#fbfcfe] p-4 max-[850px]:grid-cols-2 max-[520px]:grid-cols-1">
        <div class="relative">
          <Search
            :size="16"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6b6]"
          />
          <input
            v-model="busca"
            type="text"
            placeholder="Buscar equipamento, local ou responsável..."
            class="h-10 w-full rounded-lg border border-[#dce3ee] bg-white pl-9 pr-3 text-xs text-[#172b4d] outline-none transition placeholder:text-[#a0aabb] focus:border-[#3977dc] focus:ring-2 focus:ring-blue-100"
            @input="alterarFiltro"
          />
        </div>

        <div class="relative">
          <select
            v-model="filtroTipo"
            class="h-10 w-full appearance-none rounded-lg border border-[#dce3ee] bg-white px-3 pr-9 text-xs text-[#52647c] outline-none focus:border-[#3977dc] focus:ring-2 focus:ring-blue-100"
            @change="alterarFiltro"
          >
            <option value="TODOS">Todos os tipos</option>
            <option value="TRANSFERENCIA">Transferências</option>
            <option value="ENVIO_MANUTENCAO">Envios para manutenção</option>
            <option value="RETORNO_MANUTENCAO">Retornos de manutenção</option>
          </select>
          <ChevronDown
            :size="15"
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8793a6]"
          />
        </div>

        <div class="relative">
          <select
            v-model="filtroPeriodo"
            class="h-10 w-full appearance-none rounded-lg border border-[#dce3ee] bg-white px-3 pr-9 text-xs text-[#52647c] outline-none focus:border-[#3977dc] focus:ring-2 focus:ring-blue-100"
            @change="alterarFiltro"
          >
            <option value="TODOS">Todo o período</option>
            <option value="HOJE">Hoje</option>
            <option value="7_DIAS">Últimos 7 dias</option>
            <option value="30_DIAS">Últimos 30 dias</option>
          </select>
          <ChevronDown
            :size="15"
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8793a6]"
          />
        </div>

        <button
          type="button"
          class="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dce3ee] bg-white px-3 text-xs font-medium text-[#64748b] transition hover:bg-slate-50"
          @click="limparFiltros"
        >
          <X :size="14" />
          Limpar
        </button>
      </div>

      <!-- Carregamento -->
      <div
        v-if="loading"
        class="flex min-h-[220px] items-center justify-center gap-3 text-xs text-[#8793a6]"
      >
        <RefreshCw :size="19" class="animate-spin text-[#3977dc]" />
        Carregando movimentações...
      </div>

      <!-- Erro de carregamento -->
      <div
        v-else-if="erro && !movimentacoes.length"
        class="flex min-h-[220px] flex-col items-center justify-center px-5 text-center"
      >
        <AlertCircle :size="28" class="mb-3 text-red-400" />
        <p class="text-sm font-semibold text-[#52647c]">
          Não foi possível carregar o histórico.
        </p>
        <p class="mt-1 text-xs text-[#8793a6]">{{ erro }}</p>
        <button
          type="button"
          class="mt-4 rounded-lg bg-[#2457a7] px-4 py-2 text-xs font-semibold text-white hover:bg-[#19488d]"
          @click="carregarDados"
        >
          Tentar novamente
        </button>
      </div>

      <!-- Lista vazia -->
      <div
        v-else-if="!movimentacoesPaginadas.length"
        class="flex min-h-[250px] flex-col items-center justify-center px-5 text-center"
      >
        <div class="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#eef4ff] text-[#3977dc]">
          <ArrowLeftRight :size="25" />
        </div>
        <h3 class="text-sm font-semibold text-[#52647c]">
          Nenhuma movimentação encontrada
        </h3>
        <p class="mt-1 max-w-[330px] text-xs leading-5 text-[#8793a6]">
          Não há registros para os filtros selecionados. Você pode registrar uma nova movimentação.
        </p>
        <button
          type="button"
          class="mt-4 flex items-center gap-2 rounded-lg bg-[#2457e8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1948cc]"
          @click="abrirModal"
        >
          <Plus :size="15" />
          Nova movimentação
        </button>
      </div>

      <!-- Tabela desktop -->
      <div v-else class="w-full overflow-x-auto">
        <table class="w-full min-w-[850px] border-collapse text-left">
          <thead class="bg-[#f7f9fc] text-[10px] font-bold uppercase tracking-wide text-[#8491a4]">
            <tr>
              <th class="px-5 py-3.5">Equipamento</th>
              <th class="px-4 py-3.5">Tipo</th>
              <th class="px-4 py-3.5">Origem e destino</th>
              <th class="px-4 py-3.5">Responsável</th>
              <th class="px-4 py-3.5">Data</th>
            </tr>
          </thead>

          <tbody class="text-[11px] text-[#65748a]">
            <tr
              v-for="item in movimentacoesPaginadas"
              :key="item.id"
              class="border-b border-[#edf0f5] transition-colors last:border-0 hover:bg-[#fafcff]"
            >
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eef4ff] text-[#3977dc]">
                    <Monitor :size="17" />
                  </div>
                  <div class="min-w-0">
                    <strong class="block max-w-[230px] truncate text-xs font-semibold text-[#2457a7]">
                      {{ nomeEquipamento(item) }}
                    </strong>
                    <span class="mt-1 block text-[10px] text-[#9aa4b3]">
                      Registro #{{ item.id }}
                    </span>
                  </div>
                </div>
              </td>

              <td class="px-4 py-4">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-semibold"
                  :class="classeTipo(item.tipo)"
                >
                  <component :is="iconeTipo(item.tipo)" :size="12" />
                  {{ nomeTipo(item.tipo) }}
                </span>
              </td>

              <td class="px-4 py-4">
                <div class="flex min-w-[170px] flex-col gap-1.5">
                  <span class="flex items-center gap-1.5 text-[10px] text-[#8793a6]">
                    <span class="h-1.5 w-1.5 rounded-full bg-[#94a3b8]"></span>
                    {{ item.origem || '—' }}
                  </span>
                  <span class="flex items-center gap-1.5 text-[11px] font-semibold text-[#334761]">
                    <MapPin :size="12" class="text-[#16a36a]" />
                    {{ item.destino || '—' }}
                  </span>
                </div>
              </td>

              <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                  <div class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edf2fa] text-[#64748b]">
                    <UserRound :size="14" />
                  </div>
                  <span class="max-w-[150px] truncate">
                    {{ item.responsavel || '—' }}
                  </span>
                </div>
              </td>

              <td class="px-4 py-4">
                <span class="block font-medium text-[#52647c]">
                  {{ formatarData(item.data_movimentacao) }}
                </span>
                <span class="mt-1 block text-[10px] text-[#9aa4b3]">
                  {{ formatarHora(item.data_movimentacao) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação -->
      <div
        v-if="!loading && movimentacoesFiltradas.length"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] px-5 py-4"
      >
        <span class="text-[11px] text-[#8793a6]">
          Mostrando
          <strong class="text-[#52647c]">{{ primeiroItem }}–{{ ultimoItem }}</strong>
          de
          <strong class="text-[#52647c]">{{ movimentacoesFiltradas.length }}</strong>
          registros
        </span>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            :disabled="paginaAtual === 1"
            class="rounded-lg border border-[#dce3ee] px-3 py-2 text-[11px] font-medium text-[#64748b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="alterarPagina(paginaAtual - 1)"
          >
            Anterior
          </button>

          <span class="px-2 text-[11px] text-[#64748b]">
            {{ paginaAtual }} / {{ totalPaginas }}
          </span>

          <button
            type="button"
            :disabled="paginaAtual === totalPaginas"
            class="rounded-lg border border-[#dce3ee] px-3 py-2 text-[11px] font-medium text-[#64748b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="alterarPagina(paginaAtual + 1)"
          >
            Próxima
          </button>
        </div>
      </div>
    </section>

    <footer class="flex justify-between gap-3 px-0.5 pb-1 pt-1 text-[10px] text-[#9aa4b3]">
      <span>© 2026 LabControl</span>
      <span>Gestão inteligente de ativos</span>
    </footer>

    <!-- Modal de cadastro -->
    <div
      v-if="modalAberto"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0b1e35]/55 p-4 backdrop-blur-[2px]"
      @click.self="fecharModal"
    >
      <section class="my-auto w-full max-w-[650px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header class="flex items-center justify-between border-b border-[#edf0f5] px-6 py-5">
          <div>
            <div class="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[1px] text-[#3977dc]">
              <ArrowLeftRight :size="14" />
              Gestão de ativos
            </div>
            <h2 class="text-lg font-bold text-[#172b4d]">
              Nova movimentação
            </h2>
            <p class="mt-1 text-xs text-[#8793a6]">
              Preencha os dados para registrar a movimentação.
            </p>
          </div>

          <button
            type="button"
            :disabled="salvando"
            class="grid h-9 w-9 place-items-center rounded-lg text-[#8793a6] transition hover:bg-slate-100 hover:text-[#334761] disabled:opacity-40"
            @click="fecharModal"
          >
            <X :size="19" />
          </button>
        </header>

        <form class="space-y-5 px-6 py-5" @submit.prevent="salvarMovimentacao">
          <div
            v-if="erro"
            class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
          >
            <AlertCircle :size="16" class="mt-0.5 shrink-0" />
            {{ erro }}
          </div>

          <!-- Tipo -->
          <div>
            <label class="mb-2 block text-xs font-semibold text-[#334761]">
              Tipo de movimentação <span class="text-red-500">*</span>
            </label>

            <div class="grid grid-cols-3 gap-2 max-[520px]:grid-cols-1">
              <button
                v-for="tipo in tiposMovimentacao"
                :key="tipo.value"
                type="button"
                class="flex min-h-[66px] items-center gap-2 rounded-lg border px-3 py-2 text-left transition"
                :class="formulario.tipo === tipo.value
                  ? 'border-[#3977dc] bg-blue-50 text-[#2457a7] ring-1 ring-blue-100'
                  : 'border-[#dce3ee] bg-white text-[#64748b] hover:bg-slate-50'"
                @click="formulario.tipo = tipo.value; alterarTipo()"
              >
                <component :is="iconeTipo(tipo.value)" :size="17" />
                <span class="text-[10px] font-semibold leading-4">
                  {{ tipo.label }}
                </span>
              </button>
            </div>
          </div>

          <!-- Equipamento -->
          <div>
            <label for="mov-equipamento" class="mb-2 block text-xs font-semibold text-[#334761]">
              Equipamento <span class="text-red-500">*</span>
            </label>

            <div class="relative">
              <select
                id="mov-equipamento"
                v-model="formulario.equipamento"
                class="h-11 w-full appearance-none rounded-lg border border-[#dce3ee] bg-white px-3 pr-9 text-xs text-[#334761] outline-none focus:border-[#3977dc] focus:ring-2 focus:ring-blue-100"
                :class="{ 'border-red-400': errosFormulario.equipamento }"
                @change="selecionarEquipamento"
              >
                <option value="" disabled>Selecione um equipamento</option>
                <option
                  v-for="equipamento in equipamentos"
                  :key="equipamento.id"
                  :value="String(equipamento.id)"
                >
                  {{ equipamento.codigo_patrimonial }} — {{ equipamento.nome }}
                </option>
              </select>
              <ChevronDown
                :size="15"
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8793a6]"
              />
            </div>

            <p v-if="errosFormulario.equipamento" class="mt-1 text-[10px] text-red-500">
              {{ errosFormulario.equipamento }}
            </p>

            <div
              v-if="equipamentoSelecionado"
              class="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f6f8fc] px-3 py-2.5"
            >
              <div class="flex items-center gap-2 text-[11px] text-[#64748b]">
                <Package :size="15" class="text-[#3977dc]" />
                {{ equipamentoSelecionado.localizacao || 'Localização não informada' }}
              </div>
              <span
                class="rounded-full px-2 py-1 text-[9px] font-semibold"
                :class="classeStatus(equipamentoSelecionado.status)"
              >
                {{ nomeStatus(equipamentoSelecionado.status) }}
              </span>
            </div>
          </div>

          <!-- Origem e destino -->
          <div class="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
            <div>
              <label for="mov-origem" class="mb-2 block text-xs font-semibold text-[#334761]">
                Origem <span class="text-red-500">*</span>
              </label>
              <input
                id="mov-origem"
                v-model="formulario.origem"
                type="text"
                placeholder="Local de origem"
                class="h-11 w-full rounded-lg border border-[#dce3ee] px-3 text-xs text-[#334761] outline-none placeholder:text-[#a0aabb] focus:border-[#3977dc] focus:ring-2 focus:ring-blue-100"
                :class="{ 'border-red-400': errosFormulario.origem }"
              />
              <p v-if="errosFormulario.origem" class="mt-1 text-[10px] text-red-500">
                {{ errosFormulario.origem }}
              </p>
            </div>

            <div>
              <label for="mov-destino" class="mb-2 block text-xs font-semibold text-[#334761]">
                Destino <span class="text-red-500">*</span>
              </label>
              <input
                id="mov-destino"
                v-model="formulario.destino"
                type="text"
                placeholder="Local de destino"
                class="h-11 w-full rounded-lg border border-[#dce3ee] px-3 text-xs text-[#334761] outline-none placeholder:text-[#a0aabb] focus:border-[#3977dc] focus:ring-2 focus:ring-blue-100"
                :class="{ 'border-red-400': errosFormulario.destino }"
              />
              <p v-if="errosFormulario.destino" class="mt-1 text-[10px] text-red-500">
                {{ errosFormulario.destino }}
              </p>
            </div>
          </div>

          <!-- Novo status -->
          <div v-if="formulario.tipo === 'TRANSFERENCIA'">
            <label for="mov-status" class="mb-2 block text-xs font-semibold text-[#334761]">
              Novo status do equipamento <span class="text-red-500">*</span>
            </label>

            <div class="relative">
              <select
                id="mov-status"
                v-model="formulario.novo_status"
                class="h-11 w-full appearance-none rounded-lg border border-[#dce3ee] bg-white px-3 pr-9 text-xs text-[#334761] outline-none focus:border-[#3977dc] focus:ring-2 focus:ring-blue-100"
                :class="{ 'border-red-400': errosFormulario.novo_status }"
              >
                <option value="" disabled>Selecione o novo status</option>
                <option
                  v-for="status in statusEquipamento"
                  :key="status.value"
                  :value="status.value"
                >
                  {{ status.label }}
                </option>
              </select>
              <ChevronDown
                :size="15"
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8793a6]"
              />
            </div>

            <p v-if="errosFormulario.novo_status" class="mt-1 text-[10px] text-red-500">
              {{ errosFormulario.novo_status }}
            </p>
          </div>

          <!-- Responsável -->
          <div>
            <label for="mov-responsavel" class="mb-2 block text-xs font-semibold text-[#334761]">
              Responsável <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <UserRound
                :size="16"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6b6]"
              />
              <input
                id="mov-responsavel"
                v-model="formulario.responsavel"
                type="text"
                maxlength="150"
                placeholder="Nome do responsável"
                class="h-11 w-full rounded-lg border border-[#dce3ee] pl-9 pr-3 text-xs text-[#334761] outline-none placeholder:text-[#a0aabb] focus:border-[#3977dc] focus:ring-2 focus:ring-blue-100"
                :class="{ 'border-red-400': errosFormulario.responsavel }"
              />
            </div>
            <p v-if="errosFormulario.responsavel" class="mt-1 text-[10px] text-red-500">
              {{ errosFormulario.responsavel }}
            </p>
          </div>

          <!-- Descrição -->
          <div>
            <label for="mov-descricao" class="mb-2 block text-xs font-semibold text-[#334761]">
              Observações
            </label>
            <textarea
              id="mov-descricao"
              v-model="formulario.descricao"
              rows="3"
              placeholder="Descreva o motivo ou detalhes da movimentação..."
              class="w-full resize-y rounded-lg border border-[#dce3ee] px-3 py-2.5 text-xs leading-5 text-[#334761] outline-none placeholder:text-[#a0aabb] focus:border-[#3977dc] focus:ring-2 focus:ring-blue-100"
            ></textarea>
          </div>

          <!-- Ações -->
          <footer class="flex flex-wrap justify-end gap-2 border-t border-[#edf0f5] pt-4">
            <button
              type="button"
              :disabled="salvando"
              class="rounded-lg border border-[#dce3ee] bg-white px-5 py-2.5 text-xs font-semibold text-[#64748b] transition hover:bg-slate-50 disabled:opacity-50"
              @click="fecharModal"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="salvando"
              class="flex min-w-[175px] items-center justify-center gap-2 rounded-lg bg-[#2457e8] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1948cc] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw v-if="salvando" :size="15" class="animate-spin" />
              <CheckCircle2 v-else :size="15" />
              {{ salvando ? 'Salvando...' : 'Registrar movimentação' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </div>
</template>
