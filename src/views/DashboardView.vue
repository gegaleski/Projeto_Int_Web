<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  LayoutDashboard,
  Monitor,
  ArrowLeftRight,
  ClipboardList,
  Package,
  CheckCircle2,
  Wrench,
  Activity,
  Clock3,
  AlertCircle,
  LogOut,
  RefreshCw,
  Laptop,
  Users,
} from 'lucide-vue-next'
import api from '../services/api'
import EquipamentosView from './EquipamentosView.vue'
import MovimentacoesView from './MovimentacoesView.vue'
import OrdensServicoView from './OrdensServicoView.vue'
import UsuariosView from './UsuariosView.vue'
import { getCurrentUser } from '../services/auth'

type Secao = 'dashboard' | 'equipamentos' | 'movimentacoes' | 'ordens' | 'usuarios'

interface Equipamento {
  id: number
  codigo_patrimonial: string
  nome: string
  localizacao: string
  status: string
  data_cadastro?: string
}

interface EquipamentoDetalhes {
  codigo_patrimonial?: string
  nome?: string
}

interface Movimentacao {
  id: number
  equipamento: number | EquipamentoDetalhes
  equipamento_detalhes?: EquipamentoDetalhes
  tipo: string
  origem: string
  destino: string
  responsavel: string
  data_movimentacao: string
}

interface OrdemServico {
  id: number
  equipamento: number | EquipamentoDetalhes
  equipamento_detalhes?: EquipamentoDetalhes
  titulo: string
  descricao: string
  prioridade: string
  status: string
  responsavel: string
  data_abertura: string
}

const emit = defineEmits<{
  logout: []
}>()

const secaoAtiva = ref<Secao>('dashboard')
const usuarioAtual = getCurrentUser()
const isMasterAdmin = usuarioAtual?.role === 'MASTER_ADMIN'
const nomeUsuario = usuarioAtual?.nome || usuarioAtual?.email || 'Usuário'

const nomePerfil: Record<string, string> = {
  MASTER_ADMIN: 'Master Admin',
  ADMIN: 'Administrador',
  TECNICO: 'Técnico',
  VISUALIZADOR: 'Visualizador',
}

const equipamentos = ref<Equipamento[]>([])
const movimentacoes = ref<Movimentacao[]>([])
const ordens = ref<OrdemServico[]>([])
const loading = ref(true)
const errorMessage = ref('')

const totalEquipamentos = computed(() => equipamentos.value.length)

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

const ordensAbertas = computed(() =>
  ordens.value.filter(item => item.status === 'ABERTA').length,
)

const ordensEmAndamento = computed(() =>
  ordens.value.filter(item => item.status === 'EM_ANDAMENTO').length,
)

const ordensPendentes = computed(() =>
  ordensAbertas.value + ordensEmAndamento.value,
)

const distribuicao = computed(() => [
  { label: 'Disponíveis', quantidade: disponiveis.value, cor: '#16a36a' },
  { label: 'Em uso', quantidade: emUso.value, cor: '#3977dc' },
  { label: 'Em manutenção', quantidade: emManutencao.value, cor: '#e69a32' },
  { label: 'Inativos', quantidade: inativos.value, cor: '#8994a6' },
])

function percentual(valor: number) {
  if (!totalEquipamentos.value) return 0
  return (valor / totalEquipamentos.value) * 100
}

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

async function carregarDashboard() {
  loading.value = true
  errorMessage.value = ''

  const resultados = await Promise.allSettled([
    api.get('/equipamentos/'),
    api.get('/movimentacoes/'),
    api.get('/ordens-servico/'),
  ])

  if (resultados[0].status === 'fulfilled') {
    equipamentos.value = normalizarLista<Equipamento>(
      resultados[0].value.data,
    )
  }

  if (resultados[1].status === 'fulfilled') {
    movimentacoes.value = normalizarLista<Movimentacao>(
      resultados[1].value.data,
    )
  }

  if (resultados[2].status === 'fulfilled') {
    ordens.value = normalizarLista<OrdemServico>(
      resultados[2].value.data,
    )
  }

  const falhas = resultados.filter(
    resultado => resultado.status === 'rejected',
  ).length

  if (falhas > 0) {
    errorMessage.value =
      'Não foi possível carregar todos os dados. Verifique a conexão com a API.'
  }

  loading.value = false
}

function nomeEquipamento(item: Movimentacao | OrdemServico) {
  const detalhes =
    item.equipamento_detalhes ||
    (typeof item.equipamento === 'object' ? item.equipamento : null)

  if (detalhes?.codigo_patrimonial) {
    return `${detalhes.codigo_patrimonial} - ${detalhes.nome || 'Equipamento'}`
  }

  const equipamento = equipamentos.value.find(
    equipamento => equipamento.id === item.equipamento,
  )

  return equipamento
    ? `${equipamento.codigo_patrimonial} - ${equipamento.nome}`
    : `Equipamento #${item.equipamento}`
}

function formatarData(data: string) {
  if (!data) return '—'

  const dataObj = new Date(data)

  if (Number.isNaN(dataObj.getTime())) return '—'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dataObj)
}

function nomeTipo(tipo: string) {
  const tipos: Record<string, string> = {
    TRANSFERENCIA: 'Transferência',
    ENVIO_MANUTENCAO: 'Envio para manutenção',
    RETORNO_MANUTENCAO: 'Retorno de manutenção',
  }

  return tipos[tipo] || tipo
}

function classeStatus(status: string) {
  const classes: Record<string, string> = {
    ABERTA: 'bg-blue-50 text-blue-700',
    EM_ANDAMENTO: 'bg-amber-50 text-amber-700',
    CONCLUIDA: 'bg-emerald-50 text-emerald-700',
    CANCELADA: 'bg-slate-100 text-slate-600',
  }

  return classes[status] || 'bg-slate-100 text-slate-600'
}

function nomeStatus(status: string) {
  const nomes: Record<string, string> = {
    ABERTA: 'Aberta',
    EM_ANDAMENTO: 'Em andamento',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
  }

  return nomes[status] || status
}

function nomePrioridade(prioridade: string) {
  const nomes: Record<string, string> = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    URGENTE: 'Urgente',
  }

  return nomes[prioridade] || prioridade
}

onMounted(carregarDashboard)
</script>

<template>
  <div class="flex min-h-screen bg-[#f3f5fa] font-sans text-[#172b4d]">
    <!-- MENU LATERAL -->
    <aside
      class="sticky top-0 flex h-screen w-[280px] shrink-0 flex-col bg-[#172b4d] px-[18px] py-7 text-white max-[850px]:w-[76px] max-[850px]:px-2.5 max-[850px]:py-5"
    >
      <div
        class="flex items-center gap-3 px-2 pb-9 max-[850px]:justify-center max-[850px]:px-0"
      >
        <img
          src="../assets/images/labcontrol_logo.png"
          alt="LabControl"
          class="h-[43px] w-[43px] rounded-[10px] object-contain"
        />

        <div class="flex flex-col gap-1 max-[850px]:hidden">
          <strong class="text-lg tracking-tight">LabControl</strong>
          <span class="text-[9px] tracking-[1px] text-[#aebbd0]">
            GESTÃO DE ATIVOS
          </span>
        </div>
      </div>

      <div
        class="mb-3 px-2.5 text-[10px] font-bold tracking-[1.2px] text-[#91a2bd] max-[850px]:hidden"
      >
        MENU PRINCIPAL
      </div>

      <nav class="flex flex-col gap-1.5">
        <button
          type="button"
          class="flex min-h-[46px] items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors max-[850px]:justify-center max-[850px]:px-0"
          :class="
            secaoAtiva === 'dashboard'
              ? 'bg-[#2457a7] font-semibold text-white'
              : 'text-[#c2ccdc] hover:bg-white/10 hover:text-white'
          "
          :aria-current="secaoAtiva === 'dashboard' ? 'page' : undefined"
          @click="secaoAtiva = 'dashboard'"
        >
          <LayoutDashboard :size="19" />
          <span class="max-[850px]:hidden">Dashboard</span>
        </button>

        <button
          type="button"
          class="flex min-h-[46px] items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors max-[850px]:justify-center max-[850px]:px-0"
          :class="
            secaoAtiva === 'equipamentos'
              ? 'bg-[#2457a7] font-semibold text-white'
              : 'text-[#c2ccdc] hover:bg-white/10 hover:text-white'
          "
          :aria-current="secaoAtiva === 'equipamentos' ? 'page' : undefined"
          @click="secaoAtiva = 'equipamentos'"
        >
          <Monitor :size="19" />
          <span class="max-[850px]:hidden">Equipamentos</span>
        </button>

        <button
          type="button"
          class="flex min-h-[46px] items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors max-[850px]:justify-center max-[850px]:px-0"
          :class="
            secaoAtiva === 'movimentacoes'
              ? 'bg-[#2457a7] font-semibold text-white'
              : 'text-[#c2ccdc] hover:bg-white/10 hover:text-white'
          "
          :aria-current="secaoAtiva === 'movimentacoes' ? 'page' : undefined"
          @click="secaoAtiva = 'movimentacoes'"
        >
          <ArrowLeftRight :size="19" />
          <span class="max-[850px]:hidden">Movimentações</span>
        </button>

        <button
          type="button"
          class="flex min-h-[46px] items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors max-[850px]:justify-center max-[850px]:px-0"
          :class="
            secaoAtiva === 'ordens'
              ? 'bg-[#2457a7] font-semibold text-white'
              : 'text-[#c2ccdc] hover:bg-white/10 hover:text-white'
          "
          :aria-current="secaoAtiva === 'ordens' ? 'page' : undefined"
          @click="secaoAtiva = 'ordens'"
        >
          <ClipboardList :size="19" />
          <span class="max-[850px]:hidden">Ordens de serviço</span>
        </button>

        <button
          v-if="isMasterAdmin"
          type="button"
          class="flex min-h-[46px] items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors max-[850px]:justify-center max-[850px]:px-0"
          :class="
            secaoAtiva === 'usuarios'
              ? 'bg-[#2457a7] font-semibold text-white'
              : 'text-[#c2ccdc] hover:bg-white/10 hover:text-white'
          "
          :aria-current="secaoAtiva === 'usuarios' ? 'page' : undefined"
          @click="secaoAtiva = 'usuarios'"
        >
          <Users :size="19" />
          <span class="max-[850px]:hidden">Usuários</span>
        </button>
      </nav>

      <!-- RODAPÉ DO MENU -->
      <div class="mt-auto">
        <div
          class="flex items-center gap-3 border-t border-white/10 px-2 py-[18px] max-[850px]:justify-center max-[850px]:px-0"
        >
          <div
            class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dce8fb] text-xs font-extrabold text-[#2457a7]"
          >
            LC
          </div>

          <div class="flex flex-col gap-1 max-[850px]:hidden">
            <strong class="max-w-[150px] truncate text-xs">{{ nomeUsuario }}</strong>
            <span class="text-[11px] text-[#aebbd0]">{{ nomePerfil[usuarioAtual?.role || ''] || 'Usuário' }}</span>
          </div>
        </div>

        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg border border-white/15 px-2.5 py-3 text-left text-xs text-[#d6deeb] transition-colors hover:bg-white/[0.08] max-[850px]:justify-center max-[850px]:px-0"
          @click="emit('logout')"
        >
          <LogOut :size="18" />
          <span class="max-[850px]:hidden">Sair do sistema</span>
        </button>
      </div>
    </aside>

    <!-- CONTEÚDO PRINCIPAL -->
    <main
      class="min-w-0 flex-1 overflow-x-hidden"
      :class="
        secaoAtiva === 'movimentacoes'
          ? 'p-0'
          : 'px-9 py-[30px] max-[1200px]:px-[22px] max-[600px]:px-[13px] max-[600px]:py-5'
      "
    >
      <EquipamentosView
        v-if="secaoAtiva === 'equipamentos'"
      />

      <MovimentacoesView
        v-else-if="secaoAtiva === 'movimentacoes'"
      />

      <OrdensServicoView
        v-else-if="secaoAtiva === 'ordens'"
      />

      <UsuariosView
        v-else-if="secaoAtiva === 'usuarios' && isMasterAdmin"
      />

      <!-- DASHBOARD -->
      <template v-else>
        <header
          class="mb-[25px] flex items-center justify-between gap-5 max-[600px]:items-start"
        >
          <div>
            <span class="text-[11px] text-[#8290a5]">
              LabControl / Visão geral
            </span>

            <h1
              class="mb-1 mt-2 text-[27px] font-bold tracking-tight text-[#172b4d] max-[600px]:text-[23px]"
            >
              Dashboard
            </h1>

            <p class="text-xs text-[#8793a6]">
              Acompanhe os indicadores do laboratório.
            </p>
          </div>

          <button
            type="button"
            class="flex items-center gap-2 rounded-lg border border-[#e0e6ef] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#52637b] shadow-sm transition hover:bg-[#f8fafc]"
            @click="carregarDashboard"
          >
            <RefreshCw :size="15" :class="{ 'animate-spin': loading }" />
            <span class="max-[600px]:hidden">Atualizar dados</span>
          </button>
        </header>

        <div
          v-if="errorMessage"
          class="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"
        >
          <AlertCircle :size="16" class="mt-0.5 shrink-0" />
          {{ errorMessage }}
        </div>

        <!-- INDICADORES PRINCIPAIS -->
        <section class="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[600px]:grid-cols-1">
          <article class="rounded-[11px] border border-[#e8edf4] bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-[#8793a6]">Total de equipamentos</span>
              <div class="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-[#3977dc]">
                <Monitor :size="19" />
              </div>
            </div>
            <strong class="mt-4 block text-[29px] font-bold tracking-tight text-[#172b4d]">
              {{ loading ? '—' : totalEquipamentos }}
            </strong>
            <span class="mt-1 block text-[11px] text-[#8793a6]">Equipamentos cadastrados</span>
          </article>

          <article class="rounded-[11px] border border-[#e8edf4] bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-[#8793a6]">Disponíveis</span>
              <div class="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-[#16a36a]">
                <CheckCircle2 :size="19" />
              </div>
            </div>
            <strong class="mt-4 block text-[29px] font-bold tracking-tight text-[#172b4d]">
              {{ loading ? '—' : disponiveis }}
            </strong>
            <span class="mt-1 block text-[11px] text-[#8793a6]">Prontos para utilização</span>
          </article>

          <article class="rounded-[11px] border border-[#e8edf4] bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-[#8793a6]">Em uso</span>
              <div class="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-[#3977dc]">
                <Laptop :size="19" />
              </div>
            </div>
            <strong class="mt-4 block text-[29px] font-bold tracking-tight text-[#172b4d]">
              {{ loading ? '—' : emUso }}
            </strong>
            <span class="mt-1 block text-[11px] text-[#8793a6]">Em utilização no laboratório</span>
          </article>

          <article class="rounded-[11px] border border-[#e8edf4] bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-[#8793a6]">Em manutenção</span>
              <div class="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-[#e69a32]">
                <Wrench :size="19" />
              </div>
            </div>
            <strong class="mt-4 block text-[29px] font-bold tracking-tight text-[#172b4d]">
              {{ loading ? '—' : emManutencao }}
            </strong>
            <span class="mt-1 block text-[11px] text-[#8793a6]">Precisam de manutenção</span>
          </article>
        </section>

        <!-- VISÃO GERAL -->
        <section class="mt-[18px] grid grid-cols-2 gap-[18px] max-[950px]:grid-cols-1">
          <article class="min-w-0 rounded-[11px] border border-[#e8edf4] bg-white p-5 shadow-sm">
            <div class="mb-[23px] flex items-start justify-between gap-3">
              <div>
                <h2 class="mb-1 text-[15px] font-bold">Distribuição de equipamentos</h2>
                <p class="text-xs text-[#8793a6]">Situação atual do patrimônio.</p>
              </div>
              <Package :size="20" class="text-[#7890b3]" />
            </div>

            <div v-if="loading" class="flex min-h-[150px] items-center justify-center text-xs text-[#8b97a8]">
              Carregando equipamentos...
            </div>

            <div v-else-if="!totalEquipamentos" class="flex min-h-[150px] items-center justify-center text-xs text-[#8b97a8]">
              Nenhum equipamento cadastrado.
            </div>

            <div v-else class="space-y-[18px]">
              <div
                v-for="item in distribuicao"
                :key="item.label"
                class="space-y-2"
              >
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-[#52637b]">{{ item.label }}</span>
                  <strong class="text-[#172b4d]">{{ item.quantidade }}</strong>
                </div>

                <div class="h-1.5 overflow-hidden rounded-full bg-[#eef1f6]">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    :style="{
                      width: `${percentual(item.quantidade)}%`,
                      background: item.cor,
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </article>

          <article class="min-w-0 rounded-[11px] border border-[#e8edf4] bg-white p-5 shadow-sm">
            <div class="mb-[23px] flex items-start justify-between gap-3">
              <div>
                <h2 class="mb-1 text-[15px] font-bold">Ordens de serviço</h2>
                <p class="text-xs text-[#8793a6]">Acompanhamento das solicitações.</p>
              </div>
              <ClipboardList :size="20" class="text-[#7890b3]" />
            </div>

            <div v-if="loading" class="flex min-h-[100px] items-center justify-center text-xs text-[#8b97a8]">
              Carregando ordens...
            </div>

            <div v-else class="grid grid-cols-2 gap-x-[15px] gap-y-6 py-2">
              <div class="flex items-center gap-3">
                <span class="h-2.5 w-2.5 rounded-full bg-[#3977dc]"></span>
                <div>
                  <strong class="block text-[23px] text-[#172b4d]">{{ ordensAbertas }}</strong>
                  <span class="text-[11px] text-[#8793a6]">Ordens abertas</span>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="h-2.5 w-2.5 rounded-full bg-[#e69a32]"></span>
                <div>
                  <strong class="block text-[23px] text-[#172b4d]">{{ ordensEmAndamento }}</strong>
                  <span class="text-[11px] text-[#8793a6]">Em andamento</span>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="h-2.5 w-2.5 rounded-full bg-[#16a36a]"></span>
                <div>
                  <strong class="block text-[23px] text-[#172b4d]">
                    {{ ordens.filter(item => item.status === 'CONCLUIDA').length }}
                  </strong>
                  <span class="text-[11px] text-[#8793a6]">Concluídas</span>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="h-2.5 w-2.5 rounded-full bg-[#8994a6]"></span>
                <div>
                  <strong class="block text-[23px] text-[#172b4d]">
                    {{ ordens.filter(item => item.status === 'CANCELADA').length }}
                  </strong>
                  <span class="text-[11px] text-[#8793a6]">Canceladas</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <!-- MOVIMENTAÇÕES RECENTES -->
        <section class="mt-[18px] rounded-[11px] border border-[#e8edf4] bg-white p-5 shadow-sm">
          <div class="mb-[15px] flex items-start justify-between gap-3">
            <div>
              <h2 class="mb-1 text-[15px] font-bold">Movimentações recentes</h2>
              <p class="text-xs text-[#8793a6]">Últimas movimentações registradas no sistema.</p>
            </div>
            <ArrowLeftRight :size="20" class="text-[#7890b3]" />
          </div>

          <div v-if="loading" class="flex min-h-[100px] items-center justify-center text-xs text-[#8b97a8]">
            Carregando movimentações...
          </div>

          <div v-else-if="!movimentacoes.length" class="flex min-h-[100px] items-center justify-center text-xs text-[#8b97a8]">
            Nenhuma movimentação registrada.
          </div>

          <div v-else class="w-full overflow-x-auto">
            <table class="w-full border-collapse text-left whitespace-nowrap">
              <thead class="bg-[#f7f9fc] text-[10px] font-semibold text-[#8491a4]">
                <tr>
                  <th class="px-[13px] py-3">Equipamento</th>
                  <th class="px-[13px] py-3">Tipo</th>
                  <th class="px-[13px] py-3">Origem</th>
                  <th class="px-[13px] py-3">Destino</th>
                  <th class="px-[13px] py-3">Responsável</th>
                  <th class="px-[13px] py-3">Data</th>
                </tr>
              </thead>

              <tbody class="text-[11px] text-[#65748a]">
                <tr
                  v-for="item in movimentacoes.slice(0, 5)"
                  :key="item.id"
                  class="border-b border-[#edf0f5] last:border-0"
                >
                  <td class="px-[13px] py-3.5 font-semibold text-[#2457a7]">
                    {{ nomeEquipamento(item) }}
                  </td>
                  <td class="px-[13px] py-3.5">{{ nomeTipo(item.tipo) }}</td>
                  <td class="px-[13px] py-3.5">{{ item.origem }}</td>
                  <td class="px-[13px] py-3.5">{{ item.destino }}</td>
                  <td class="px-[13px] py-3.5">{{ item.responsavel }}</td>
                  <td class="px-[13px] py-3.5">{{ formatarData(item.data_movimentacao) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ORDENS RECENTES -->
        <section class="mt-[18px] rounded-[11px] border border-[#e8edf4] bg-white p-5 shadow-sm">
          <div class="mb-[15px] flex items-start justify-between gap-3">
            <div>
              <h2 class="mb-1 text-[15px] font-bold">Ordens de serviço recentes</h2>
              <p class="text-xs text-[#8793a6]">Últimas solicitações de manutenção.</p>
            </div>
            <Clock3 :size="20" class="text-[#7890b3]" />
          </div>

          <div v-if="loading" class="flex min-h-[100px] items-center justify-center text-xs text-[#8b97a8]">
            Carregando ordens de serviço...
          </div>

          <div v-else-if="!ordens.length" class="flex min-h-[100px] items-center justify-center text-xs text-[#8b97a8]">
            Nenhuma ordem de serviço cadastrada.
          </div>

          <div v-else class="w-full overflow-x-auto">
            <table class="w-full border-collapse text-left whitespace-nowrap">
              <thead class="bg-[#f7f9fc] text-[10px] font-semibold text-[#8491a4]">
                <tr>
                  <th class="px-[13px] py-3">Ordem</th>
                  <th class="px-[13px] py-3">Equipamento</th>
                  <th class="px-[13px] py-3">Título</th>
                  <th class="px-[13px] py-3">Prioridade</th>
                  <th class="px-[13px] py-3">Status</th>
                  <th class="px-[13px] py-3">Data de abertura</th>
                </tr>
              </thead>

              <tbody class="text-[11px] text-[#65748a]">
                <tr
                  v-for="item in ordens.slice(0, 5)"
                  :key="item.id"
                  class="border-b border-[#edf0f5] last:border-0"
                >
                  <td class="px-[13px] py-3.5">#{{ item.id }}</td>

                  <td class="px-[13px] py-3.5 font-semibold text-[#2457a7]">
                    {{ nomeEquipamento(item) }}
                  </td>

                  <td class="px-[13px] py-3.5">{{ item.titulo }}</td>

                  <td class="px-[13px] py-3.5">
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      :class="{
                        'bg-emerald-50 text-emerald-700': item.prioridade === 'BAIXA',
                        'bg-blue-50 text-blue-700': item.prioridade === 'MEDIA',
                        'bg-amber-50 text-amber-700': item.prioridade === 'ALTA',
                        'bg-red-50 text-red-700': item.prioridade === 'URGENTE',
                      }"
                    >
                      {{ nomePrioridade(item.prioridade) }}
                    </span>
                  </td>

                  <td class="px-[13px] py-3.5">
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      :class="classeStatus(item.status)"
                    >
                      {{ nomeStatus(item.status) }}
                    </span>
                  </td>

                  <td class="px-[13px] py-3.5">
                    {{ formatarData(item.data_abertura) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer class="flex justify-between gap-3 px-0.5 pb-1 pt-6 text-[10px] text-[#9aa4b3]">
          <span>© 2026 LabControl</span>
          <span>Gestão inteligente de ativos</span>
        </footer>
      </template>
    </main>
  </div>
</template>
