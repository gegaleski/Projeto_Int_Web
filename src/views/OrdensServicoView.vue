
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  ClipboardList,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Monitor,
  ChevronDown,
  CalendarDays,
  UserRound,
  FileText,
  Filter,
} from 'lucide-vue-next'
import api from '../services/api'

interface Equipamento {
  id: number
  codigo_patrimonial: string
  nome: string
  localizacao?: string
}

interface OrdemServico {
  id: number
  equipamento: number
  equipamento_detalhes?: Equipamento
  titulo: string
  descricao: string
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'
  status: 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'
  responsavel: string
  data_abertura: string
  data_atualizacao: string
}

interface OrdemForm {
  equipamento: string
  titulo: string
  descricao: string
  prioridade: OrdemServico['prioridade']
  status: OrdemServico['status']
  responsavel: string
}

const ordens = ref<OrdemServico[]>([])
const equipamentos = ref<Equipamento[]>([])
const carregando = ref(false)
const salvando = ref(false)

const busca = ref('')
const filtroStatus = ref('')
const filtroPrioridade = ref('')

const modalAberto = ref(false)
const ordemSelecionada = ref<OrdemServico | null>(null)
const ordemExclusao = ref<OrdemServico | null>(null)
const erro = ref('')
const erroModal = ref('')

const formulario = ref<OrdemForm>(criarFormularioVazio())

function criarFormularioVazio(): OrdemForm {
  return {
    equipamento: '',
    titulo: '',
    descricao: '',
    prioridade: 'MEDIA',
    status: 'ABERTA',
    responsavel: '',
  }
}

const ordensFiltradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()

  return ordens.value.filter((ordem) => {
    const equipamento = obterEquipamento(ordem)
    const correspondeBusca =
      !termo ||
      String(ordem.id).includes(termo) ||
      ordem.titulo?.toLowerCase().includes(termo) ||
      ordem.descricao?.toLowerCase().includes(termo) ||
      ordem.responsavel?.toLowerCase().includes(termo) ||
      equipamento?.codigo_patrimonial?.toLowerCase().includes(termo) ||
      equipamento?.nome?.toLowerCase().includes(termo)

    const correspondeStatus =
      !filtroStatus.value || ordem.status === filtroStatus.value

    const correspondePrioridade =
      !filtroPrioridade.value ||
      ordem.prioridade === filtroPrioridade.value

    return correspondeBusca && correspondeStatus && correspondePrioridade
  })
})

const indicadores = computed(() => [
  {
    titulo: 'Total de ordens',
    valor: ordens.value.length,
    descricao: 'Ordens cadastradas',
    icone: ClipboardList,
    cor: 'blue',
  },
  {
    titulo: 'Abertas',
    valor: ordens.value.filter((o) => o.status === 'ABERTA').length,
    descricao: 'Aguardando atendimento',
    icone: Clock3,
    cor: 'amber',
  },
  {
    titulo: 'Em andamento',
    valor: ordens.value.filter((o) => o.status === 'EM_ANDAMENTO').length,
    descricao: 'Em atendimento',
    icone: Wrench,
    cor: 'violet',
  },
  {
    titulo: 'Concluídas',
    valor: ordens.value.filter((o) => o.status === 'CONCLUIDA').length,
    descricao: 'Serviços finalizados',
    icone: CheckCircle2,
    cor: 'emerald',
  },
  {
    titulo: 'Urgentes',
    valor: ordens.value.filter((o) => o.prioridade === 'URGENTE').length,
    descricao: 'Prioridade máxima',
    icone: AlertCircle,
    cor: 'red',
  },
])

function obterEquipamento(ordem: OrdemServico): Equipamento | undefined {
  return (
    ordem.equipamento_detalhes ||
    equipamentos.value.find((e) => e.id === Number(ordem.equipamento))
  )
}

function nomeEquipamento(ordem: OrdemServico) {
  const equipamento = obterEquipamento(ordem)

  if (!equipamento) return `Equipamento #${ordem.equipamento}`

  return `${equipamento.codigo_patrimonial} - ${equipamento.nome}`
}

function dataFormatada(data?: string) {
  if (!data) return '—'

  const dataObj = new Date(data)

  if (Number.isNaN(dataObj.getTime())) return '—'

  return dataObj.toLocaleDateString('pt-BR')
}

function dataHoraFormatada(data?: string) {
  if (!data) return '—'

  const dataObj = new Date(data)

  if (Number.isNaN(dataObj.getTime())) return '—'

  return dataObj.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ABERTA: 'Aberta',
    EM_ANDAMENTO: 'Em andamento',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
  }

  return labels[status] || status
}

function prioridadeLabel(prioridade: string) {
  const labels: Record<string, string> = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    URGENTE: 'Urgente',
  }

  return labels[prioridade] || prioridade
}

function statusClasses(status: string) {
  const classes: Record<string, string> = {
    ABERTA: 'bg-amber-50 text-amber-700 ring-amber-200',
    EM_ANDAMENTO: 'bg-blue-50 text-blue-700 ring-blue-200',
    CONCLUIDA: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    CANCELADA: 'bg-slate-100 text-slate-600 ring-slate-200',
  }

  return classes[status] || 'bg-slate-100 text-slate-600 ring-slate-200'
}

function prioridadeClasses(prioridade: string) {
  const classes: Record<string, string> = {
    BAIXA: 'bg-slate-100 text-slate-600',
    MEDIA: 'bg-blue-50 text-blue-700',
    ALTA: 'bg-orange-50 text-orange-700',
    URGENTE: 'bg-red-50 text-red-700',
  }

  return classes[prioridade] || 'bg-slate-100 text-slate-600'
}

async function carregarDados() {
  carregando.value = true
  erro.value = ''

  try {
    const [resOrdens, resEquipamentos] = await Promise.all([
      api.get('/ordens-servico/'),
      api.get('/equipamentos/'),
    ])

    const dadosOrdens = resOrdens.data
    const dadosEquipamentos = resEquipamentos.data

    ordens.value = Array.isArray(dadosOrdens)
      ? dadosOrdens
      : dadosOrdens.results || []

    equipamentos.value = Array.isArray(dadosEquipamentos)
      ? dadosEquipamentos
      : dadosEquipamentos.results || []
  } catch (error: any) {
    console.error('Erro ao carregar ordens:', error)
    erro.value =
      error.response?.data?.detail ||
      'Não foi possível carregar as ordens de serviço.'
  } finally {
    carregando.value = false
  }
}

function abrirCadastro() {
  ordemSelecionada.value = null
  formulario.value = criarFormularioVazio()
  erroModal.value = ''
  modalAberto.value = true
}

function editarOrdem(ordem: OrdemServico) {
  ordemSelecionada.value = ordem

  formulario.value = {
    equipamento: String(ordem.equipamento),
    titulo: ordem.titulo || '',
    descricao: ordem.descricao || '',
    prioridade: ordem.prioridade,
    status: ordem.status,
    responsavel: ordem.responsavel || '',
  }

  erroModal.value = ''
  modalAberto.value = true
}

function fecharModal() {
  if (salvando.value) return

  modalAberto.value = false
  ordemSelecionada.value = null
  erroModal.value = ''
}

function extrairErro(error: any) {
  const dados = error.response?.data

  if (!dados) return 'Não foi possível concluir a operação.'

  if (typeof dados === 'string') return dados

  if (dados.detail) return dados.detail

  const primeiraChave = Object.keys(dados)[0]

  if (primeiraChave) {
    const mensagem = dados[primeiraChave]
    return Array.isArray(mensagem) ? mensagem[0] : String(mensagem)
  }

  return 'Verifique os dados informados e tente novamente.'
}

async function salvarOrdem() {
  erroModal.value = ''

  if (!formulario.value.equipamento) {
    erroModal.value = 'Selecione um equipamento.'
    return
  }

  if (!formulario.value.titulo.trim()) {
    erroModal.value = 'Informe o título da ordem de serviço.'
    return
  }

  if (!formulario.value.descricao.trim()) {
    erroModal.value = 'Informe a descrição do serviço.'
    return
  }

  salvando.value = true

  const payload = {
    equipamento: Number(formulario.value.equipamento),
    titulo: formulario.value.titulo.trim(),
    descricao: formulario.value.descricao.trim(),
    prioridade: formulario.value.prioridade,
    status: formulario.value.status,
    responsavel: formulario.value.responsavel.trim(),
  }

  try {
    if (ordemSelecionada.value) {
      await api.put(
        `/ordens-servico/${ordemSelecionada.value.id}/`,
        payload,
      )
    } else {
      await api.post('/ordens-servico/', payload)
    }

    modalAberto.value = false
    ordemSelecionada.value = null
    await carregarDados()
  } catch (error: any) {
    console.error('Erro ao salvar ordem:', error)
    erroModal.value = extrairErro(error)
  } finally {
    salvando.value = false
  }
}

function confirmarExclusao(ordem: OrdemServico) {
  ordemExclusao.value = ordem
}

async function excluirOrdem() {
  if (!ordemExclusao.value) return

  try {
    await api.delete(`/ordens-servico/${ordemExclusao.value.id}/`)
    ordemExclusao.value = null
    await carregarDados()
  } catch (error: any) {
    console.error('Erro ao excluir ordem:', error)
    erro.value = extrairErro(error)
    ordemExclusao.value = null
  }
}

function limparFiltros() {
  busca.value = ''
  filtroStatus.value = ''
  filtroPrioridade.value = ''
}

onMounted(carregarDados)
</script>

<template>
  <div class="w-full min-w-0 space-y-7 text-[#172B4D]">
    <!-- Cabeçalho -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
          <span>Gestão</span>
          <span>/</span>
          <span class="font-medium text-[#315B9D]">Ordens de serviço</span>
        </div>

        <h1 class="text-2xl font-bold tracking-tight text-[#172B4D]">
          Ordens de serviço
        </h1>

        <p class="mt-1 text-sm text-slate-500">
          Gerencie solicitações e acompanhe os serviços de manutenção.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="carregarDados"
          :disabled="carregando"
          class="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            :size="16"
            :class="{ 'animate-spin': carregando }"
          />
          Atualizar
        </button>

        <button
          type="button"
          @click="abrirCadastro"
          class="flex h-10 items-center gap-2 rounded-lg bg-[#315B9D] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#254A83]"
        >
          <Plus :size="17" />
          Nova ordem
        </button>
      </div>
    </div>

    <!-- Indicadores -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <div
        v-for="item in indicadores"
        :key="item.titulo"
        class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">
              {{ item.titulo }}
            </p>

            <p class="mt-3 text-3xl font-bold tracking-tight text-[#172B4D]">
              {{ item.valor }}
            </p>

            <p class="mt-1 text-xs text-slate-400">
              {{ item.descricao }}
            </p>
          </div>

          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl"
            :class="{
              'bg-blue-50 text-blue-600': item.cor === 'blue',
              'bg-amber-50 text-amber-600': item.cor === 'amber',
              'bg-violet-50 text-violet-600': item.cor === 'violet',
              'bg-emerald-50 text-emerald-600': item.cor === 'emerald',
              'bg-red-50 text-red-600': item.cor === 'red',
            }"
          >
            <component :is="item.icone" :size="20" />
          </div>
        </div>
      </div>
    </div>

    <!-- Mensagem de erro -->
    <div
      v-if="erro"
      class="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <AlertCircle :size="18" class="mt-0.5 shrink-0" />
      <span class="flex-1">{{ erro }}</span>
      <button @click="erro = ''" class="text-red-500 hover:text-red-700">
        <X :size="17" />
      </button>
    </div>

    <!-- Área de listagem -->
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <h2 class="font-semibold text-[#172B4D]">
            Todas as ordens
          </h2>
          <p class="mt-1 text-xs text-slate-400">
            {{ ordensFiltradas.length }}
            {{ ordensFiltradas.length === 1 ? 'ordem encontrada' : 'ordens encontradas' }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="relative min-w-[220px]">
            <Search
              :size="16"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              v-model="busca"
              type="text"
              placeholder="Buscar ordem..."
              class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#315B9D] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div class="relative">
            <Filter
              :size="15"
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              v-model="filtroStatus"
              class="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-600 outline-none focus:border-[#315B9D]"
            >
              <option value="">Todos os status</option>
              <option value="ABERTA">Aberta</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
            <ChevronDown
              :size="14"
              class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div class="relative">
            <select
              v-model="filtroPrioridade"
              class="h-10 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-600 outline-none focus:border-[#315B9D]"
            >
              <option value="">Todas as prioridades</option>
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Média</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Urgente</option>
            </select>
            <ChevronDown
              :size="14"
              class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <button
            v-if="busca || filtroStatus || filtroPrioridade"
            @click="limparFiltros"
            class="h-10 rounded-lg px-3 text-sm font-medium text-[#315B9D] transition hover:bg-blue-50"
          >
            Limpar
          </button>
        </div>
      </div>

      <!-- Tabela -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left">
          <thead class="bg-slate-50">
            <tr class="text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th class="px-5 py-4">Ordem</th>
              <th class="px-5 py-4">Equipamento</th>
              <th class="px-5 py-4">Prioridade</th>
              <th class="px-5 py-4">Status</th>
              <th class="px-5 py-4">Responsável</th>
              <th class="px-5 py-4">Abertura</th>
              <th class="px-5 py-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="ordem in ordensFiltradas"
              :key="ordem.id"
              class="transition hover:bg-slate-50/70"
            >
              <td class="px-5 py-4">
                <p class="text-sm font-semibold text-[#315B9D]">
                  OS #{{ ordem.id }}
                </p>
                <p class="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                  {{ ordem.titulo }}
                </p>
              </td>

              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#315B9D]">
                    <Monitor :size="17" />
                  </div>
                  <div class="min-w-0">
                    <p class="max-w-[220px] truncate text-sm font-medium text-slate-700">
                      {{ obterEquipamento(ordem)?.nome || 'Equipamento não identificado' }}
                    </p>
                    <p class="mt-1 text-xs text-slate-400">
                      {{ obterEquipamento(ordem)?.codigo_patrimonial || `ID ${ordem.equipamento}` }}
                    </p>
                  </div>
                </div>
              </td>

              <td class="px-5 py-4">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="prioridadeClasses(ordem.prioridade)"
                >
                  {{ prioridadeLabel(ordem.prioridade) }}
                </span>
              </td>

              <td class="px-5 py-4">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
                  :class="statusClasses(ordem.status)"
                >
                  {{ statusLabel(ordem.status) }}
                </span>
              </td>

              <td class="px-5 py-4">
                <div class="flex items-center gap-2 text-sm text-slate-600">
                  <UserRound :size="15" class="text-slate-400" />
                  {{ ordem.responsavel || 'Não atribuído' }}
                </div>
              </td>

              <td class="px-5 py-4">
                <div class="flex items-center gap-2 text-sm text-slate-500">
                  <CalendarDays :size="15" class="text-slate-400" />
                  {{ dataFormatada(ordem.data_abertura) }}
                </div>
              </td>

              <td class="px-5 py-4">
                <div class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    @click="editarOrdem(ordem)"
                    title="Editar ordem"
                    class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-[#315B9D]"
                  >
                    <Pencil :size="16" />
                  </button>

                  <button
                    type="button"
                    @click="confirmarExclusao(ordem)"
                    title="Excluir ordem"
                    class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Carregamento -->
            <tr v-if="carregando">
              <td colspan="7" class="px-5 py-16 text-center">
                <RefreshCw
                  :size="24"
                  class="mx-auto animate-spin text-[#315B9D]"
                />
                <p class="mt-3 text-sm text-slate-500">
                  Carregando ordens de serviço...
                </p>
              </td>
            </tr>

            <!-- Estado vazio -->
            <tr v-else-if="ordensFiltradas.length === 0">
              <td colspan="7" class="px-5 py-16 text-center">
                <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <ClipboardList :size="25" />
                </div>

                <h3 class="mt-4 text-sm font-semibold text-slate-700">
                  Nenhuma ordem encontrada
                </h3>

                <p class="mt-1 text-sm text-slate-400">
                  {{
                    busca || filtroStatus || filtroPrioridade
                      ? 'Tente alterar os filtros da pesquisa.'
                      : 'Comece cadastrando uma nova ordem de serviço.'
                  }}
                </p>

                <button
                  v-if="!busca && !filtroStatus && !filtroPrioridade"
                  @click="abrirCadastro"
                  class="mt-4 text-sm font-semibold text-[#315B9D] hover:underline"
                >
                  Criar primeira ordem
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modal de cadastro e edição -->
    <div
      v-if="modalAberto"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
      @click.self="fecharModal"
    >
      <div class="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 class="text-lg font-bold text-[#172B4D]">
              {{ ordemSelecionada ? 'Editar ordem de serviço' : 'Nova ordem de serviço' }}
            </h2>
            <p class="mt-1 text-sm text-slate-500">
              Preencha as informações da solicitação.
            </p>
          </div>

          <button
            type="button"
            @click="fecharModal"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X :size="19" />
          </button>
        </div>

        <form @submit.prevent="salvarOrdem" class="space-y-5 p-6">
          <div
            v-if="erroModal"
            class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle :size="17" class="mt-0.5 shrink-0" />
            {{ erroModal }}
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-slate-700">
              Equipamento <span class="text-red-500">*</span>
            </label>

            <select
              v-model="formulario.equipamento"
              required
              class="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#315B9D] focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>Selecione um equipamento</option>
              <option
                v-for="equipamento in equipamentos"
                :key="equipamento.id"
                :value="String(equipamento.id)"
              >
                {{ equipamento.codigo_patrimonial }} - {{ equipamento.nome }}
              </option>
            </select>

            <p v-if="equipamentos.length === 0" class="mt-2 text-xs text-amber-600">
              Nenhum equipamento cadastrado. Cadastre um equipamento antes de abrir uma ordem.
            </p>
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-slate-700">
              Título da ordem <span class="text-red-500">*</span>
            </label>

            <input
              v-model="formulario.titulo"
              type="text"
              maxlength="150"
              required
              placeholder="Ex.: Manutenção preventiva do equipamento"
              class="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#315B9D] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-slate-700">
              Descrição do serviço <span class="text-red-500">*</span>
            </label>

            <textarea
              v-model="formulario.descricao"
              required
              rows="4"
              placeholder="Descreva o problema ou o serviço que deverá ser realizado..."
              class="w-full resize-y rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#315B9D] focus:ring-2 focus:ring-blue-100"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                Prioridade
              </label>

              <select
                v-model="formulario.prioridade"
                class="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#315B9D] focus:ring-2 focus:ring-blue-100"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                Status
              </label>

              <select
                v-model="formulario.status"
                class="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#315B9D] focus:ring-2 focus:ring-blue-100"
              >
                <option value="ABERTA">Aberta</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
                <option value="CONCLUIDA">Concluída</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-slate-700">
              Responsável
            </label>

            <input
              v-model="formulario.responsavel"
              type="text"
              maxlength="150"
              placeholder="Nome do responsável pelo serviço"
              class="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#315B9D] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div
            v-if="ordemSelecionada"
            class="rounded-lg bg-slate-50 p-3 text-xs text-slate-500"
          >
            <p>
              <strong>Data de abertura:</strong>
              {{ dataHoraFormatada(ordemSelecionada.data_abertura) }}
            </p>
            <p class="mt-1">
              <strong>Última atualização:</strong>
              {{ dataHoraFormatada(ordemSelecionada.data_atualizacao) }}
            </p>
          </div>

          <div class="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              @click="fecharModal"
              :disabled="salvando"
              class="h-11 rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="salvando || equipamentos.length === 0"
              class="flex h-11 items-center gap-2 rounded-lg bg-[#315B9D] px-6 text-sm font-semibold text-white transition hover:bg-[#254A83] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw v-if="salvando" :size="16" class="animate-spin" />
              {{ salvando ? 'Salvando...' : ordemSelecionada ? 'Salvar alterações' : 'Cadastrar ordem' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirmação de exclusão -->
    <div
      v-if="ordemExclusao"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      @click.self="ordemExclusao = null"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Trash2 :size="22" />
        </div>

        <h2 class="mt-4 text-lg font-bold text-[#172B4D]">
          Excluir ordem de serviço?
        </h2>

        <p class="mt-2 text-sm leading-relaxed text-slate-500">
          Tem certeza de que deseja excluir a
          <strong class="text-slate-700">OS #{{ ordemExclusao.id }}</strong>
          — {{ ordemExclusao.titulo }}?
          Essa ação não poderá ser desfeita.
        </p>

        <p class="mt-3 text-xs text-slate-400">
          Ordens concluídas ou canceladas não podem ser excluídas.
        </p>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            @click="ordemExclusao = null"
            class="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            @click="excluirOrdem"
            class="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Excluir ordem
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
