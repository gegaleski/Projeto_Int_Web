
<script setup lang="ts">
import { ref } from 'vue'
import {
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  Check,
  Diamond,
  ShieldCheck,
  Monitor,
  Boxes,
  Activity,
  UserPlus,
} from 'lucide-vue-next'
import { login } from '../services/auth'

const emit = defineEmits<{
  authenticated: []
  'go-to-register': []
}>()

const email = ref('')
const password = ref('')
const rememberAccess = ref(true)
const showPassword = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const loading = ref(false)

async function handleLogin() {
  errorMessage.value = ''
  infoMessage.value = ''

  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'Preencha seu e-mail e sua senha para continuar.'
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errorMessage.value = 'Informe um endereço de e-mail válido.'
    return
  }

  loading.value = true

  try {
    await login(email.value, password.value, rememberAccess.value)
    password.value = ''
    emit('authenticated')
  } catch (error: unknown) {
    console.error('Erro ao autenticar:', error)

    const axiosError = error as {
      response?: {
        data?: {
          detail?: string
          non_field_errors?: string[]
        }
      }
      message?: string
    }

    const detail = axiosError.response?.data?.detail
    const nonFieldError = axiosError.response?.data?.non_field_errors?.[0]

    if (detail || nonFieldError) {
      errorMessage.value = detail || nonFieldError || 'Não foi possível entrar.'
    } else if (axiosError.message === 'Network Error') {
      errorMessage.value = 'Não foi possível conectar ao servidor. Verifique se o Django está em execução.'
    } else {
      errorMessage.value = 'E-mail ou senha incorretos. Verifique suas credenciais.'
    }
  } finally {
    loading.value = false
  }
}

function recoverPassword() {
  errorMessage.value = ''
  infoMessage.value = 'A recuperação de senha será disponibilizada em uma próxima etapa.'
}
</script>

<template>
  <main class="login-page">
    <section class="brand-panel">
      <header class="brand-header">
        <img
          src="../assets/images/labcontrol_logo.png"
          alt="Logo LabControl"
          class="brand-logo"
        />
        <div class="brand-name">
          <strong>LabControl</strong>
          <span>GESTÃO DE LABORATÓRIOS E ATIVOS</span>
        </div>
      </header>

      <div class="brand-content">
        <div class="brand-badge">
          <Check :size="14" />
          <span>Patrimônio de TI rastreável</span>
        </div>

        <h1>Gestão de ativos do Laboratório de Informática.</h1>

        <p class="brand-description">
          Controle computadores, switches, monitores e periféricos —
          patrimônio, chamados e movimentações internas em um único painel.
        </p>

        <div class="brand-stats">
          <div class="stat-item">
            <Monitor :size="19" />
            <strong>Gestão</strong>
            <span>de equipamentos</span>
          </div>
          <div class="stat-item">
            <Boxes :size="19" />
            <strong>Controle</strong>
            <span>de patrimônio</span>
          </div>
          <div class="stat-item">
            <Activity :size="19" />
            <strong>Histórico</strong>
            <span>de movimentações</span>
          </div>
        </div>
      </div>

      <div class="brand-decoration decoration-one"></div>
      <div class="brand-decoration decoration-two"></div>

      <footer class="brand-footer">
        <span>© 2026 LabControl</span>
        <span>Gestão inteligente de ativos</span>
      </footer>
    </section>

    <section class="form-panel">
      <div class="login-card">
        <div class="login-heading">
          <span class="welcome-label">ACESSO AO SISTEMA</span>
          <h2>Bem-vindo(a)!</h2>
          <p>Acesse o painel do Laboratório de Informática.</p>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="field-group">
            <label for="email">E-mail corporativo <span>*</span></label>
            <div class="input-wrapper">
              <Mail :size="19" class="input-icon" />
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="seu.email@instituicao.edu.br"
                autocomplete="username"
                required
                :disabled="loading"
              />
            </div>
          </div>

          <div class="field-group">
            <label for="password">Senha <span>*</span></label>
            <div class="input-wrapper">
              <LockKeyhole :size="19" class="input-icon" />
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Digite sua senha"
                autocomplete="current-password"
                required
                :disabled="loading"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="19" />
                <Eye v-else :size="19" />
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="remember-option">
              <input
                v-model="rememberAccess"
                type="checkbox"
                :disabled="loading"
              />
              <span>Lembrar meu acesso</span>
            </label>
            <button
              type="button"
              class="forgot-button"
              @click="recoverPassword"
            >
              Esqueci minha senha
            </button>
          </div>

          <div v-if="errorMessage" class="feedback error-feedback">
            {{ errorMessage }}
          </div>

          <div v-if="infoMessage" class="feedback info-feedback">
            {{ infoMessage }}
          </div>

          <button type="submit" class="login-button" :disabled="loading">
            <Diamond :size="17" />
            <span>{{ loading ? 'Autenticando...' : 'Entrar no sistema' }}</span>
          </button>
        </form>

        <div class="my-5 flex items-center justify-center gap-2 text-xs text-[#8290a5]">
          <span>Não tem uma conta?</span>
          <button
            type="button"
            class="inline-flex items-center gap-1 font-semibold text-[#2457a7] hover:underline"
            @click="emit('go-to-register')"
          >
            <UserPlus :size="14" />
            Cadastre-se
          </button>
        </div>

        <div class="security-notice">
          <ShieldCheck :size="17" />
          <span>Ambiente de acesso seguro</span>
        </div>
      </div>

      <span class="mobile-footer">© 2026 LabControl</span>
    </section>
  </main>
</template>
