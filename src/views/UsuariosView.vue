<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Users,
  UserCheck,
  UserX,
  Clock3,
  RefreshCw,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  Power,
  RotateCcw,
} from 'lucide-vue-next'
import api from '../services/api'

type Role = 'MASTER_ADMIN' | 'ADMIN' | 'TECNICO' | 'VISUALIZADOR'
type Tab = 'pendentes' | 'ativos' | 'inativos'

interface Perfil {
  role: Role
  role_display?: string
  status_aprovacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  status_display?: string
  data_criacao?: string
  data_aprovacao?: string | null
}

interface Usuario {
  id: number
  nome: string
  username: string
  email: string
  is_active: boolean
  date_joined: string
  perfil: Perfil | null
}

const usuarios = ref<Usuario[]>([])
const loading = ref(false)
const actionLoading = ref<number | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
const activeTab = ref<Tab>('pendentes')
const selectedRoles = ref<Record<number, Role>>({})

const tabs: { id: Tab; label: string }[] = [
  { id: 'pendentes', label: 'Pendentes' },
  { id: 'ativos', label: 'Ativos' },
  { id: 'inativos', label: 'Inativos' },
]

const roles: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'VISUALIZADOR', label: 'Visualizador' },
  { value: 'MASTER_ADMIN', label: 'Master Admin' },
]

function normalizarLista(data: unknown): Usuario[] {
  if (Array.isArray(data)) return data as Usuario[]

  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: Usuario[] }).results
  }

  return []
}

const pendentes = computed(() =>
  usuarios.value.filter(user => user.perfil?.status_aprovacao === 'PENDENTE'),
)

const ativos = computed(() =>
  usuarios.value.filter(user =>
    user.is_active && user.perfil?.status_aprovacao === 'APROVADO',
  ),
)

const inativos = computed(() =>
  usuarios.value.filter(user =>
    !user.is_active || user.perfil?.status_aprovacao === 'REJEITADO',
  ),
)

const usuariosVisiveis = computed(() => {
  if (activeTab.value === 'pendentes') return pendentes.value
  if (activeTab.value === 'ativos') return ativos.value
  return inativos.value
})

function formatarData(data?: string) {
  if (!data) return '—'

  const parsed = new Date(data)

  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

async function carregarUsuarios() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await api.get('/usuarios/')
    usuarios.value = normalizarLista(response.data)

    for (const user of usuarios.value) {
      if (user.perfil?.role) {
        selectedRoles.value[user.id] = user.perfil.role
      }
    }
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      'Não foi possível carregar os usuários. Verifique suas permissões e a conexão com a API.'
  } finally {
    loading.value = false
  }
}

async function executarAcao(
  user: Usuario,
  acao: 'aprovar' | 'rejeitar' | 'alterar_role' | 'desativar' | 'reativar',
) {
  errorMessage.value = ''
  successMessage.value = ''
  actionLoading.value = user.id

  try {
    const url = `/usuarios/${user.id}/${acao}/`

    if (acao === 'aprovar') {
      await api.post(url, {
        role: selectedRoles.value[user.id] || 'VISUALIZADOR',
      })

      successMessage.value = `A conta de ${user.nome || user.email} foi aprovada.`
    } else if (acao === 'alterar_role') {
      await api.patch(url, {
        role: selectedRoles.value[user.id] || user.perfil?.role,
      })

      successMessage.value = `O perfil de ${user.nome || user.email} foi atualizado.`
    } else {
      await api.post(url)

      const mensagens: Record<string, string> = {
        rejeitar: 'Cadastro rejeitado.',
        desativar: 'Conta desativada.',
        reativar: 'Conta reativada.',
      }

      successMessage.value = mensagens[acao]
    }

    await carregarUsuarios()
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      'Não foi possível concluir a ação. Tente novamente.'
  } finally {
    actionLoading.value = null
  }
}

onMounted(carregarUsuarios)
</script>

<template>
  <section class="min-h-full">
    <header class="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div>
        <span class="text-[11px] text-[#8290a5]">LabControl / Administração</span>

        <h1 class="mb-1 mt-2 text-[27px] font-bold tracking-tight text-[#172b4d]">
          Gerenciamento de usuários
        </h1>

        <p class="text-xs text-[#8793a6]">
          Aprove cadastros e gerencie os níveis de acesso ao sistema.
        </p>
      </div>

      <button
        type="button"
        :disabled="loading"
        class="flex items-center gap-2 rounded-lg border border-[#dce3ee] bg-white px-[15px] py-[11px] text-xs font-semibold text-[#2457a7] transition hover:bg-blue-50 disabled:opacity-60"
        @click="carregarUsuarios"
      >
        <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
        Atualizar lista
      </button>
    </header>

    <div class="mb-5 grid grid-cols-3 gap-3 max-[600px]:grid-cols-1">
      <article class="rounded-xl border border-[#e8edf4] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between text-xs text-[#78869a]">
          Cadastros pendentes
          <Clock3 :size="18" class="text-amber-500" />
        </div>

        <strong class="mt-2 block text-2xl text-[#172b4d]">
          {{ pendentes.length }}
        </strong>
      </article>

      <article class="rounded-xl border border-[#e8edf4] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between text-xs text-[#78869a]">
          Usuários ativos
          <UserCheck :size="18" class="text-emerald-600" />
        </div>

        <strong class="mt-2 block text-2xl text-[#172b4d]">
          {{ ativos.length }}
        </strong>
      </article>

      <article class="rounded-xl border border-[#e8edf4] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between text-xs text-[#78869a]">
          Usuários inativos
          <UserX :size="18" class="text-slate-500" />
        </div>

        <strong class="mt-2 block text-2xl text-[#172b4d]">
          {{ inativos.length }}
        </strong>
      </article>
    </div>

    <div
      v-if="errorMessage"
      class="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
    >
      <AlertCircle :size="17" class="shrink-0" />
      {{ errorMessage }}
    </div>

    <div
      v-if="successMessage"
      class="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700"
    >
      <Check :size="17" class="shrink-0" />
      {{ successMessage }}
    </div>

    <section class="overflow-hidden rounded-xl border border-[#e8edf4] bg-white shadow-sm">
      <div class="flex flex-wrap gap-1 border-b border-[#edf0f5] px-4 pt-3">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="border-b-2 px-3 py-3 text-xs font-semibold transition"
          :class="
            activeTab === tab.id
              ? 'border-[#2457a7] text-[#2457a7]'
              : 'border-transparent text-[#8290a5] hover:text-[#2457a7]'
          "
          @click="activeTab = tab.id"
        >
          {{ tab.label }}

          <span class="ml-1 rounded-full bg-[#eef2f8] px-1.5 py-0.5 text-[10px]">
            {{
              tab.id === 'pendentes'
                ? pendentes.length
                : tab.id === 'ativos'
                  ? ativos.length
                  : inativos.length
            }}
          </span>
        </button>
      </div>

      <div
        v-if="loading"
        class="flex min-h-[180px] items-center justify-center gap-2 text-xs text-[#8b97a8]"
      >
        <RefreshCw :size="18" class="animate-spin" />
        Carregando usuários...
      </div>

      <div
        v-else-if="!usuariosVisiveis.length"
        class="flex min-h-[200px] flex-col items-center justify-center px-5 text-center"
      >
        <Users :size="30" class="mb-3 text-[#aab5c5]" />

        <strong class="text-sm text-[#52627a]">
          Nenhum usuário nesta categoria
        </strong>

        <p class="mt-1 text-xs text-[#8793a6]">
          Os cadastros correspondentes aparecerão aqui.
        </p>
      </div>

      <div v-else class="divide-y divide-[#edf0f5]">
        <article
          v-for="user in usuariosVisiveis"
          :key="user.id"
          class="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
        >
          <div class="flex min-w-[220px] flex-1 items-start gap-3">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf1ff] text-sm font-bold text-[#2457a7]">
              {{ (user.nome || user.email || 'U').slice(0, 1).toUpperCase() }}
            </div>

            <div class="min-w-0">
              <strong class="block truncate text-sm text-[#172b4d]">
                {{ user.nome || 'Nome não informado' }}
              </strong>

              <span class="mt-0.5 block break-all text-xs text-[#78869a]">
                {{ user.email }}
              </span>

              <div class="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-[#9aa4b3]">
                <span>
                  Cadastro: {{ formatarData(user.perfil?.data_criacao || user.date_joined) }}
                </span>

                <span
                  v-if="user.perfil?.status_aprovacao === 'REJEITADO'"
                  class="rounded-full bg-red-50 px-2 py-1 font-semibold text-red-700"
                >
                  Rejeitado
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select
              v-model="selectedRoles[user.id]"
              :disabled="actionLoading === user.id"
              aria-label="Perfil do usuário"
              class="rounded-lg border border-[#dce3ee] bg-white px-3 py-2 text-xs text-[#42536d] outline-none focus:border-[#3977dc]"
            >
              <option
                v-for="role in roles"
                :key="role.value"
                :value="role.value"
              >
                {{ role.label }}
              </option>
            </select>

            <template v-if="user.perfil?.status_aprovacao === 'PENDENTE'">
              <button
                type="button"
                :disabled="actionLoading === user.id"
                class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                @click="executarAcao(user, 'aprovar')"
              >
                <Check :size="14" />
                Aprovar
              </button>

              <button
                type="button"
                :disabled="actionLoading === user.id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                @click="executarAcao(user, 'rejeitar')"
              >
                <X :size="14" />
                Rejeitar
              </button>
            </template>

            <template
              v-else-if="user.is_active && user.perfil?.status_aprovacao === 'APROVADO'"
            >
              <button
                type="button"
                :disabled="actionLoading === user.id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-[#dce3ee] px-3 py-2 text-xs font-semibold text-[#2457a7] hover:bg-blue-50 disabled:opacity-50"
                @click="executarAcao(user, 'alterar_role')"
              >
                <ShieldCheck :size="14" />
                Salvar perfil
              </button>

              <button
                type="button"
                :disabled="actionLoading === user.id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                @click="executarAcao(user, 'desativar')"
              >
                <Power :size="14" />
                Desativar
              </button>
            </template>

            <template v-else>
              <button
                type="button"
                :disabled="actionLoading === user.id"
                class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                @click="
                  executarAcao(
                    user,
                    user.perfil?.status_aprovacao === 'REJEITADO'
                      ? 'aprovar'
                      : 'reativar',
                  )
                "
              >
                <RotateCcw :size="14" />

                {{
                  user.perfil?.status_aprovacao === 'REJEITADO'
                    ? 'Aprovar cadastro'
                    : 'Reativar'
                }}
              </button>
            </template>
          </div>
        </article>
      </div>
    </section>

    <p class="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-[#8793a6]">
      <ShieldCheck :size="15" class="mt-0.5 shrink-0" />
      As alterações de acesso são registradas pelo servidor. Somente usuários com perfil Master Admin podem acessar esta área.
    </p>
  </section>
</template>