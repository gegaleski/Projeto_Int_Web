<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Package,
  CheckCircle2,
  Monitor,
  Wrench,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  UserRound,
} from 'lucide-vue-next'
import api from '../services/api'

interface Equipamento {
  id: number
  codigo_patrimonial: string
  nome: string
  numero_serie: string
  localizacao: string
  responsavel: string
  status: string
  descricao: string
}

interface Formulario {
  codigo_patrimonial: string
  nome: string
  numero_serie: string
  localizacao: string
  responsavel: string
  status: string
  descricao: string
}

const equipamentos = ref<Equipamento[]>([])
const carregando = ref(false)
const erro = ref('')
const sucesso = ref('')
const busca = ref('')
const filtroStatus = ref('')
const filtroLocalizacao = ref('')
const pagina = ref(1)

const itensPorPagina = 8

const modalAberto = ref(false)
const editando = ref(false)
const salvando = ref(false)
const equipamentoId = ref<number | null>(null)
const equipamentoExcluir = ref<Equipamento | null>(null)
const excluindo = ref(false)

function formularioVazio(): Formulario {
  return {
    codigo_patrimonial: '',
    nome: '',
    numero_serie: '',
    localizacao: '',
    responsavel: '',
    status: 'DISPONIVEL',
    descricao: '',
  }
}

const formulario = ref<Formulario>(formularioVazio())

function normalizarLista(data: unknown): Equipamento[] {
  if (Array.isArray(data)) return data as Equipamento[]

  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: Equipamento[] }).results
  }

  return []
}

async function carregarEquipamentos() {
  carregando.value = true
  erro.value = ''

  try {
    const resposta = await api.get('/equipamentos/')
    equipamentos.value = normalizarLista(resposta.data)
  } catch (error: any) {
    erro.value =
      error.response?.data?.detail ||
      'Não foi possível carregar os equipamentos. Verifique a conexão com a API.'
  } finally {
    carregando.value = false
  }
}

const total = computed(() => equipamentos.value.length)

const disponiveis = computed(() =>
  equipamentos.value.filter(item => item.status === 'DISPONIVEL').length,
)

const emUso = computed(() =>
  equipamentos.value.filter(item => item.status === 'EM_USO').length,
)

const emManutencao = computed(() =>
  equipamentos.value.filter(item => item.status === 'EM_MANUTENCAO').length,
)

const inativos = computed(() =>
  equipamentos.value.filter(item => item.status === 'INATIVO').length,
)

const localizacoes = computed(() =>
  [...new Set(equipamentos.value.map(item => item.localizacao).filter(Boolean))].sort(),
)

const equipamentosFiltrados = computed(() => {
  const termo = busca.value.toLowerCase().trim()

  return equipamentos.value.filter(item => {
    const correspondeBusca =
      !termo ||
      item.codigo_patrimonial?.toLowerCase().includes(termo) ||
      item.nome?.toLowerCase().includes(termo) ||
      item.numero_serie?.toLowerCase().includes(termo)

    const correspondeStatus =
      !filtroStatus.value || item.status === filtroStatus.value

    const correspondeLocalizacao =
      !filtroLocalizacao.value || item.localizacao === filtroLocalizacao.value

    return correspondeBusca && correspondeStatus && correspondeLocalizacao
  })
})

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(equipamentosFiltrados.value.length / itensPorPagina)),
)

const equipamentosPaginados = computed(() => {
  const inicio = (pagina.value - 1) * itensPorPagina
  return equipamentosFiltrados.value.slice(inicio, inicio + itensPorPagina)
})

function alterarFiltro() {
  pagina.value = 1
}

function abrirCadastro() {
  editando.value = false
  equipamentoId.value = null
  formulario.value = formularioVazio()
  erro.value = ''
  modalAberto.value = true
}

function abrirEdicao(item: Equipamento) {
  editando.value = true
  equipamentoId.value = item.id

  formulario.value = {
    codigo_patrimonial: item.codigo_patrimonial || '',
    nome: item.nome || '',
    numero_serie: item.numero_serie || '',
    localizacao: item.localizacao || '',
    responsavel: item.responsavel || '',
    status: item.status || 'DISPONIVEL',
    descricao: item.descricao || '',
  }

  erro.value = ''
  modalAberto.value = true
}

function fecharModal() {
  if (salvando.value) return
  modalAberto.value = false
}

async function salvarEquipamento() {
  erro.value = ''
  sucesso.value = ''

  if (
    !formulario.value.codigo_patrimonial.trim() ||
    !formulario.value.nome.trim() ||
    !formulario.value.localizacao.trim()
  ) {
    erro.value = 'Preencha o patrimônio, o nome e a localização.'
    return
  }

  salvando.value = true

  const dados = {
    ...formulario.value,
    codigo_patrimonial: formulario.value.codigo_patrimonial.trim(),
    nome: formulario.value.nome.trim(),
    numero_serie: formulario.value.numero_serie.trim(),
    localizacao: formulario.value.localizacao.trim(),
    responsavel: formulario.value.responsavel.trim(),
    descricao: formulario.value.descricao.trim(),
  }

  try {
    if (editando.value && equipamentoId.value !== null) {
      await api.put(`/equipamentos/${equipamentoId.value}/`, dados)
      sucesso.value = 'Equipamento atualizado com sucesso.'
    } else {
      await api.post('/equipamentos/', dados)
      sucesso.value = 'Equipamento cadastrado com sucesso.'
    }

    modalAberto.value = false
    await carregarEquipamentos()
  } catch (error: any) {
    const dadosErro = error.response?.data

    if (dadosErro && typeof dadosErro === 'object') {
      erro.value = Object.entries(dadosErro)
        .map(([campo, mensagens]) =>
          `${campo}: ${Array.isArray(mensagens) ? mensagens.join(', ') : mensagens}`,
        )
        .join(' | ')
    } else {
      erro.value = 'Não foi possível salvar o equipamento.'
    }
  } finally {
    salvando.value = false
  }
}

async function excluirEquipamento() {
  if (!equipamentoExcluir.value) return

  excluindo.value = true
  erro.value = ''
  sucesso.value = ''

  try {
    await api.delete(`/equipamentos/${equipamentoExcluir.value.id}/`)

    sucesso.value = 'Equipamento excluído com sucesso.'
    equipamentoExcluir.value = null
    await carregarEquipamentos()
  } catch (error: any) {
    const dados = error.response?.data

    erro.value =
      dados?.detail ||
      dados?.erro ||
      'Não foi possível excluir. Verifique se existem movimentações ou ordens de serviço vinculadas.'

    equipamentoExcluir.value = null
  } finally {
    excluindo.value = false
  }
}

function nomeStatus(status: string) {
  const nomes: Record<string, string> = {
    DISPONIVEL: 'Disponível',
    EM_USO: 'Em uso',
    EM_MANUTENCAO: 'Em manutenção',
    INATIVO: 'Inativo',
  }

  return nomes[status] || status
}

function classeStatus(status: string) {
  const classes: Record<string, string> = {
    DISPONIVEL: 'bg-green-50 text-green-700',
    EM_USO: 'bg-blue-50 text-blue-700',
    EM_MANUTENCAO: 'bg-orange-50 text-orange-700',
    INATIVO: 'bg-slate-100 text-slate-600',
  }

  return classes[status] || 'bg-slate-100 text-slate-600'
}

onMounted(carregarEquipamentos)
</script>

<template>
  <div class="w-full min-w-0 text-[#172B4D]">

    <!-- Cabeçalho -->
    <header class="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div>
        <span class="text-[11px] text-[#8290A5]">
          LabControl / Gestão de ativos
        </span>

        <h1 class="mb-1 mt-2 text-[27px] font-bold tracking-tight text-[#172B4D]">
          Equipamentos
        </h1>

        <p class="text-xs text-[#8793A6]">
          Cadastre, consulte e gerencie os equipamentos do laboratório.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          class="flex items-center gap-2 rounded-lg border border-[#DCE3EE] bg-white px-4 py-3 text-xs font-semibold text-[#2457A7] transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
          :disabled="carregando"
          @click="carregarEquipamentos"
        >
          <RefreshCw :size="16" :class="{ 'animate-spin': carregando }" />
          Atualizar
        </button>

        <button
          class="flex items-center gap-2 rounded-lg border border-[#2457A7] bg-[#2457A7] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#1D478B]"
          @click="abrirCadastro"
        >
          <Plus :size="17" />
          Novo equipamento
        </button>
      </div>
    </header>

    <!-- Mensagens -->
    <div
      v-if="erro"
      class="mb-5 flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700"
    >
      <AlertCircle :size="18" class="mt-0.5 shrink-0" />
      <span class="flex-1">{{ erro }}</span>
      <button @click="erro = ''">
        <X :size="16" />
      </button>
    </div>

    <div
      v-if="sucesso"
      class="mb-5 flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-700"
    >
      <CheckCircle2 :size="18" />
      <span class="flex-1">{{ sucesso }}</span>
      <button @click="sucesso = ''">
        <X :size="16" />
      </button>
    </div>

    <!-- Indicadores -->
    <section class="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

      <article class="rounded-xl border border-[#E8EDF4] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-[#78869A]">Total de equipamentos</span>
          <div class="grid h-9 w-9 place-items-center rounded-lg bg-[#EAF1FF] text-[#3977DC]">
            <Package :size="19" />
          </div>
        </div>
        <strong class="mt-3 block text-[27px] font-bold text-[#172B4D]">
          {{ total }}
        </strong>
        <span class="text-[10px] text-[#99A3B2]">Ativos cadastrados</span>
      </article>

      <article class="rounded-xl border border-[#E8EDF4] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-[#78869A]">Disponíveis</span>
          <div class="grid h-9 w-9 place-items-center rounded-lg bg-[#E6F7EF] text-[#16A36A]">
            <CheckCircle2 :size="19" />
          </div>
        </div>
        <strong class="mt-3 block text-[27px] font-bold text-[#172B4D]">
          {{ disponiveis }}
        </strong>
        <span class="text-[10px] text-[#99A3B2]">Prontos para utilização</span>
      </article>

      <article class="rounded-xl border border-[#E8EDF4] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-[#78869A]">Em uso</span>
          <div class="grid h-9 w-9 place-items-center rounded-lg bg-[#EAF1FF] text-[#3977DC]">
            <Monitor :size="19" />
          </div>
        </div>
        <strong class="mt-3 block text-[27px] font-bold text-[#172B4D]">
          {{ emUso }}
        </strong>
        <span class="text-[10px] text-[#99A3B2]">Equipamentos em operação</span>
      </article>

      <article class="rounded-xl border border-[#E8EDF4] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-[#78869A]">Em manutenção</span>
          <div class="grid h-9 w-9 place-items-center rounded-lg bg-[#FFF3DF] text-[#D88B25]">
            <Wrench :size="19" />
          </div>
        </div>
        <strong class="mt-3 block text-[27px] font-bold text-[#172B4D]">
          {{ emManutencao }}
        </strong>
        <span class="text-[10px] text-[#99A3B2]">Em atendimento técnico</span>
      </article>

      <article class="rounded-xl border border-[#E8EDF4] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-[#78869A]">Inativos</span>
          <div class="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500">
            <AlertCircle :size="19" />
          </div>
        </div>
        <strong class="mt-3 block text-[27px] font-bold text-[#172B4D]">
          {{ inativos }}
        </strong>
        <span class="text-[10px] text-[#99A3B2]">Fora de operação</span>
      </article>

    </section>

    <!-- Tabela -->
    <section class="overflow-hidden rounded-xl border border-[#E8EDF4] bg-white shadow-sm">

      <div class="flex flex-col justify-between gap-3 border-b border-[#EDF0F5] px-5 py-5 sm:flex-row sm:items-center">
        <div>
          <h2 class="text-[15px] font-bold text-[#172B4D]">
            Lista de equipamentos
          </h2>
          <p class="mt-1 text-xs text-[#8793A6]">
            Consulte e gerencie os ativos cadastrados.
          </p>
        </div>

        <span class="w-fit rounded-full bg-[#F1F4F9] px-3 py-2 text-[11px] text-[#6E7C91]">
          {{ equipamentosFiltrados.length }} registros
        </span>
      </div>

      <!-- Filtros -->
      <div class="flex flex-col gap-3 border-b border-[#EDF0F5] px-5 py-4 lg:flex-row">

        <div class="flex h-11 flex-1 items-center gap-3 rounded-lg border border-[#DFE5EF] px-3 text-[#8793A6] focus-within:border-[#2457A7]">
          <Search :size="18" class="shrink-0" />
          <input
            v-model="busca"
            class="h-full w-full border-0 bg-transparent text-xs text-[#172B4D] outline-none placeholder:text-[#A0AABB]"
            placeholder="Buscar por patrimônio, nome ou número de série..."
            @input="alterarFiltro"
          />
        </div>

        <select
          v-model="filtroLocalizacao"
          class="h-11 rounded-lg border border-[#DFE5EF] bg-white px-3 text-xs text-[#536178] outline-none transition focus:border-[#2457A7]"
          @change="alterarFiltro"
        >
          <option value="">Todas as localizações</option>
          <option v-for="local in localizacoes" :key="local" :value="local">
            {{ local }}
          </option>
        </select>

        <select
          v-model="filtroStatus"
          class="h-11 rounded-lg border border-[#DFE5EF] bg-white px-3 text-xs text-[#536178] outline-none transition focus:border-[#2457A7]"
          @change="alterarFiltro"
        >
          <option value="">Todos os status</option>
          <option value="DISPONIVEL">Disponível</option>
          <option value="EM_USO">Em uso</option>
          <option value="EM_MANUTENCAO">Em manutenção</option>
          <option value="INATIVO">Inativo</option>
        </select>
      </div>

      <!-- Carregamento -->
      <div
        v-if="carregando"
        class="flex min-h-52 flex-col items-center justify-center gap-3 text-xs text-[#8793A6]"
      >
        <RefreshCw :size="23" class="animate-spin text-[#2457A7]" />
        Carregando equipamentos...
      </div>

      <!-- Estado vazio -->
      <div
        v-else-if="!equipamentosPaginados.length"
        class="flex min-h-52 flex-col items-center justify-center gap-3 text-center"
      >
        <Package :size="32" class="text-[#A0AABB]" />
        <strong class="text-sm text-[#34445D]">
          Nenhum equipamento encontrado
        </strong>
        <span class="text-xs text-[#8793A6]">
          Altere os filtros ou cadastre um novo equipamento.
        </span>
      </div>

      <!-- Conteúdo -->
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[850px] border-collapse text-left">

          <thead class="bg-[#F8F9FC]">
            <tr>
              <th class="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-[#8290A5]">
                Patrimônio
              </th>
              <th class="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-[#8290A5]">
                Equipamento
              </th>
              <th class="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-[#8290A5]">
                Localização
              </th>
              <th class="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-[#8290A5]">
                Responsável
              </th>
              <th class="px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-[#8290A5]">
                Status
              </th>
              <th class="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-wide text-[#8290A5]">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in equipamentosPaginados"
              :key="item.id"
              class="border-t border-[#EDF0F5] transition hover:bg-[#FAFBFE]"
            >
              <td class="px-5 py-4">
                <strong class="text-[11px] font-semibold text-[#2457A7]">
                  {{ item.codigo_patrimonial }}
                </strong>
              </td>

              <td class="px-5 py-4">
                <div class="text-xs font-semibold text-[#253650]">
                  {{ item.nome }}
                </div>
                <span class="mt-1 block text-[10px] text-[#929DAF]">
                  Série: {{ item.numero_serie || 'Não informada' }}
                </span>
              </td>

              <td class="px-5 py-4">
                <span class="flex items-center gap-2 text-xs text-[#64738A]">
                  <MapPin :size="14" />
                  {{ item.localizacao }}
                </span>
              </td>

              <td class="px-5 py-4">
                <span class="flex items-center gap-2 text-xs text-[#64738A]">
                  <UserRound :size="14" />
                  {{ item.responsavel || 'Não informado' }}
                </span>
              </td>

              <td class="px-5 py-4">
                <span
                  :class="[
                    'inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold',
                    classeStatus(item.status),
                  ]"
                >
                  {{ nomeStatus(item.status) }}
                </span>
              </td>

              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <button
                    class="grid h-8 w-8 place-items-center rounded-lg border border-[#E3E8F0] bg-white text-[#3268BA] transition hover:bg-blue-50"
                    title="Editar equipamento"
                    @click="abrirEdicao(item)"
                  >
                    <Pencil :size="15" />
                  </button>

                  <button
                    class="grid h-8 w-8 place-items-center rounded-lg border border-[#E3E8F0] bg-white text-[#C64C59] transition hover:bg-red-50"
                    title="Excluir equipamento"
                    @click="equipamentoExcluir = item"
                  >
                    <Trash2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>

        </table>
      </div>

      <!-- Paginação -->
      <footer
        v-if="!carregando && equipamentosFiltrados.length"
        class="flex flex-col justify-between gap-3 border-t border-[#EDF0F5] px-5 py-4 sm:flex-row sm:items-center"
      >
        <span class="text-[11px] text-[#8491A5]">
          Página {{ pagina }} de {{ totalPaginas }}
          · {{ equipamentosFiltrados.length }} equipamentos
        </span>

        <div class="flex gap-2">
          <button
            class="grid h-8 w-8 place-items-center rounded-lg border border-[#DFE5EF] bg-white text-[#2457A7] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="pagina <= 1"
            @click="pagina--"
          >
            <ChevronLeft :size="17" />
          </button>

          <button
            class="grid h-8 w-8 place-items-center rounded-lg border border-[#DFE5EF] bg-white text-[#2457A7] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="pagina >= totalPaginas"
            @click="pagina++"
          >
            <ChevronRight :size="17" />
          </button>
        </div>
      </footer>

    </section>

    <footer class="mt-7 flex flex-col justify-between gap-2 text-[10px] text-[#9AA5B5] sm:flex-row">
      <span>© 2026 LabControl</span>
      <span>Gestão inteligente de ativos</span>
    </footer>

    <!-- Modal de cadastro e edição -->
    <div
      v-if="modalAberto"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0D1D33]/60 p-4"
      @click.self="fecharModal"
    >
      <section class="my-auto w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">

        <header class="flex items-start justify-between border-b border-[#EDF0F5] px-6 py-5">
          <div>
            <h2 class="text-lg font-bold text-[#172B4D]">
              {{ editando ? 'Editar equipamento' : 'Novo equipamento' }}
            </h2>
            <p class="mt-1 text-xs text-[#8793A6]">
              Preencha as informações do ativo.
            </p>
          </div>

          <button
            class="grid h-8 w-8 place-items-center rounded-lg text-[#718096] transition hover:bg-slate-100"
            :disabled="salvando"
            @click="fecharModal"
          >
            <X :size="19" />
          </button>
        </header>

        <form @submit.prevent="salvarEquipamento">
          <div class="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">

            <label class="flex flex-col gap-2">
              <span class="text-[11px] font-semibold text-[#536178]">
                Patrimônio *
              </span>
              <input
                v-model="formulario.codigo_patrimonial"
                required
                placeholder="Ex.: LAB-2026-0001"
                class="h-11 rounded-lg border border-[#DFE5EF] px-3 text-xs text-[#172B4D] outline-none transition placeholder:text-[#A0AABB] focus:border-[#2457A7] focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-[11px] font-semibold text-[#536178]">
                Nome do equipamento *
              </span>
              <input
                v-model="formulario.nome"
                required
                placeholder="Ex.: Notebook Lenovo"
                class="h-11 rounded-lg border border-[#DFE5EF] px-3 text-xs text-[#172B4D] outline-none transition placeholder:text-[#A0AABB] focus:border-[#2457A7] focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-[11px] font-semibold text-[#536178]">
                Número de série
              </span>
              <input
                v-model="formulario.numero_serie"
                placeholder="Número de série"
                class="h-11 rounded-lg border border-[#DFE5EF] px-3 text-xs text-[#172B4D] outline-none transition placeholder:text-[#A0AABB] focus:border-[#2457A7] focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-[11px] font-semibold text-[#536178]">
                Localização *
              </span>
              <input
                v-model="formulario.localizacao"
                required
                placeholder="Ex.: Laboratório 01"
                class="h-11 rounded-lg border border-[#DFE5EF] px-3 text-xs text-[#172B4D] outline-none transition placeholder:text-[#A0AABB] focus:border-[#2457A7] focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-[11px] font-semibold text-[#536178]">
                Responsável
              </span>
              <input
                v-model="formulario.responsavel"
                placeholder="Nome do responsável"
                class="h-11 rounded-lg border border-[#DFE5EF] px-3 text-xs text-[#172B4D] outline-none transition placeholder:text-[#A0AABB] focus:border-[#2457A7] focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-[11px] font-semibold text-[#536178]">
                Status
              </span>
              <select
                v-model="formulario.status"
                class="h-11 rounded-lg border border-[#DFE5EF] bg-white px-3 text-xs text-[#172B4D] outline-none transition focus:border-[#2457A7] focus:ring-2 focus:ring-blue-100"
              >
                <option value="DISPONIVEL">Disponível</option>
                <option value="EM_USO">Em uso</option>
                <option value="EM_MANUTENCAO">Em manutenção</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </label>

            <label class="flex flex-col gap-2 sm:col-span-2">
              <span class="text-[11px] font-semibold text-[#536178]">
                Descrição
              </span>
              <textarea
                v-model="formulario.descricao"
                rows="3"
                placeholder="Informações adicionais sobre o equipamento..."
                class="resize-y rounded-lg border border-[#DFE5EF] p-3 text-xs text-[#172B4D] outline-none transition placeholder:text-[#A0AABB] focus:border-[#2457A7] focus:ring-2 focus:ring-blue-100"
              ></textarea>
            </label>

          </div>

          <footer class="flex flex-col-reverse justify-end gap-2 border-t border-[#EDF0F5] bg-[#FAFBFD] px-6 py-4 sm:flex-row">
            <button
              type="button"
              class="rounded-lg border border-[#DCE3EE] bg-white px-5 py-3 text-xs font-semibold text-[#536178] transition hover:bg-slate-50"
              :disabled="salvando"
              @click="fecharModal"
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="flex items-center justify-center gap-2 rounded-lg bg-[#2457A7] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#1D478B] disabled:cursor-wait disabled:opacity-60"
              :disabled="salvando"
            >
              <RefreshCw v-if="salvando" :size="15" class="animate-spin" />
              {{ salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar equipamento' }}
            </button>
          </footer>
        </form>
      </section>
    </div>

    <!-- Confirmação de exclusão -->
    <div
      v-if="equipamentoExcluir"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-[#0D1D33]/60 p-4"
      @click.self="equipamentoExcluir = null"
    >
      <section class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">

        <div class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-[#C64C59]">
          <Trash2 :size="23" />
        </div>

        <h2 class="text-center text-lg font-bold text-[#172B4D]">
          Excluir equipamento?
        </h2>

        <p class="mt-3 text-center text-xs leading-6 text-[#8290A5]">
          Você está prestes a excluir
          <strong class="text-[#34445D]">{{ equipamentoExcluir.nome }}</strong>
          ({{ equipamentoExcluir.codigo_patrimonial }}).
          Essa ação não poderá ser desfeita.
        </p>

        <div class="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <button
            class="rounded-lg border border-[#DCE3EE] bg-white px-5 py-3 text-xs font-semibold text-[#536178] transition hover:bg-slate-50"
            :disabled="excluindo"
            @click="equipamentoExcluir = null"
          >
            Cancelar
          </button>

          <button
            class="rounded-lg border border-[#C83E4D] bg-[#C83E4D] px-5 py-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
            :disabled="excluindo"
            @click="excluirEquipamento"
          >
            {{ excluindo ? 'Excluindo...' : 'Confirmar exclusão' }}
          </button>
        </div>

      </section>
    </div>

  </div>
</template>