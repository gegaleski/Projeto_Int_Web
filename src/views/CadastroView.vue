<script setup lang="ts">
import { ref } from 'vue'
import {
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  UserPlus,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-vue-next'
import { registerUser } from '../services/auth'

const emit = defineEmits<{
  'go-to-login': []
}>()

const nome = ref('')
const email = ref('')
const senha = ref('')
const confirmarSenha = ref('')

const mostrarSenha = ref(false)
const mostrarConfirmacao = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const cadastroConcluido = ref(false)

async function handleCadastro() {
  errorMessage.value = ''

  if (!nome.value.trim() || !email.value.trim() || !senha.value || !confirmarSenha.value) {
    errorMessage.value = 'Preencha todos os campos para continuar.'
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errorMessage.value = 'Informe um endereço de e-mail válido.'
    return
  }

  if (senha.value.length < 8) {
    errorMessage.value = 'A senha deve possuir pelo menos 8 caracteres.'
    return
  }

  if (senha.value !== confirmarSenha.value) {
    errorMessage.value = 'As senhas não coincidem.'
    return
  }

  loading.value = true

  try {
    await registerUser({
      nome: nome.value,
      email: email.value,
      senha: senha.value,
    })

    cadastroConcluido.value = true
  } catch (error: unknown) {
    console.error('Erro ao cadastrar usuário:', error)

    const axiosError = error as {
      response?: {
        data?: Record<string, unknown>
      }
      message?: string
    }

    const data = axiosError.response?.data

    if (data) {
      const firstError = Object.values(data).flat()[0]
      errorMessage.value = typeof firstError === 'string'
        ? firstError
        : 'Não foi possível realizar o cadastro. Verifique os dados.'
    } else if (axiosError.message === 'Network Error') {
      errorMessage.value = 'Não foi possível conectar ao servidor. Tente novamente.'
    } else {
      errorMessage.value = 'Ocorreu um erro ao realizar o cadastro.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#f4f7fb] flex items-center justify-center px-4 py-10">
    <section class="w-full max-w-[480px]">
      <div class="mb-8 flex flex-col items-center text-center">
        <img
          src="../assets/images/labcontrol_logo.png"
          alt="LabControl"
          class="mb-4 h-16 w-16 object-contain"
        />

        <h1 class="text-2xl font-bold tracking-tight text-[#172b4d]">
          LabControl
        </h1>

        <p class="mt-1 text-sm text-[#8290a5]">
          Gestão de laboratórios e ativos
        </p>
      </div>

      <div class="rounded-2xl border border-[#e5eaf1] bg-white p-7 shadow-[0_12px_40px_rgba(20,40,80,0.07)] sm:p-9">
        <template v-if="!cadastroConcluido">
          <div class="mb-7">
            <span class="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3972bd]">
              NOVA CONTA
            </span>

            <h2 class="mt-2 text-2xl font-bold text-[#172b4d]">
              Crie sua conta
            </h2>

            <p class="mt-2 text-sm leading-relaxed text-[#8290a5]">
              Preencha seus dados para solicitar acesso ao sistema.
              Seu cadastro precisará ser aprovado por um administrador.
            </p>
          </div>

          <form class="space-y-5" @submit.prevent="handleCadastro">
            <div>
              <label for="nome" class="mb-2 block text-sm font-semibold text-[#34445e]">
                Nome completo
              </label>

              <div class="relative">
                <UserRound
                  :size="18"
                  class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                />

                <input
                  id="nome"
                  v-model="nome"
                  type="text"
                  placeholder="Digite seu nome completo"
                  autocomplete="name"
                  maxlength="150"
                  required
                  :disabled="loading"
                  class="w-full rounded-xl border border-[#dfe6ef] bg-white py-3 pl-11 pr-4 text-sm text-[#26364f] outline-none transition placeholder:text-[#a6b1c0] focus:border-[#3972bd] focus:ring-4 focus:ring-[#3972bd]/10 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label for="email-cadastro" class="mb-2 block text-sm font-semibold text-[#34445e]">
                E-mail
              </label>

              <div class="relative">
                <Mail
                  :size="18"
                  class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                />

                <input
                  id="email-cadastro"
                  v-model="email"
                  type="email"
                  placeholder="seu.email@instituicao.edu.br"
                  autocomplete="email"
                  required
                  :disabled="loading"
                  class="w-full rounded-xl border border-[#dfe6ef] bg-white py-3 pl-11 pr-4 text-sm text-[#26364f] outline-none transition placeholder:text-[#a6b1c0] focus:border-[#3972bd] focus:ring-4 focus:ring-[#3972bd]/10 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label for="senha-cadastro" class="mb-2 block text-sm font-semibold text-[#34445e]">
                Senha
              </label>

              <div class="relative">
                <LockKeyhole
                  :size="18"
                  class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                />

                <input
                  id="senha-cadastro"
                  v-model="senha"
                  :type="mostrarSenha ? 'text' : 'password'"
                  placeholder="Mínimo de 8 caracteres"
                  autocomplete="new-password"
                  minlength="8"
                  required
                  :disabled="loading"
                  class="w-full rounded-xl border border-[#dfe6ef] bg-white py-3 pl-11 pr-12 text-sm text-[#26364f] outline-none transition placeholder:text-[#a6b1c0] focus:border-[#3972bd] focus:ring-4 focus:ring-[#3972bd]/10 disabled:bg-gray-50"
                />

                <button
                  type="button"
                  class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#3972bd]"
                  :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'"
                  @click="mostrarSenha = !mostrarSenha"
                >
                  <EyeOff v-if="mostrarSenha" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </div>
            </div>

            <div>
              <label for="confirmar-senha" class="mb-2 block text-sm font-semibold text-[#34445e]">
                Confirmar senha
              </label>

              <div class="relative">
                <LockKeyhole
                  :size="18"
                  class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                />

                <input
                  id="confirmar-senha"
                  v-model="confirmarSenha"
                  :type="mostrarConfirmacao ? 'text' : 'password'"
                  placeholder="Digite sua senha novamente"
                  autocomplete="new-password"
                  required
                  :disabled="loading"
                  class="w-full rounded-xl border border-[#dfe6ef] bg-white py-3 pl-11 pr-12 text-sm text-[#26364f] outline-none transition placeholder:text-[#a6b1c0] focus:border-[#3972bd] focus:ring-4 focus:ring-[#3972bd]/10 disabled:bg-gray-50"
                />

                <button
                  type="button"
                  class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#3972bd]"
                  :aria-label="mostrarConfirmacao ? 'Ocultar confirmação' : 'Mostrar confirmação'"
                  @click="mostrarConfirmacao = !mostrarConfirmacao"
                >
                  <EyeOff v-if="mostrarConfirmacao" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </div>
            </div>

            <div
              v-if="errorMessage"
              class="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle :size="17" class="mt-0.5 shrink-0" />
              <span>{{ errorMessage }}</span>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2457a7] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d488d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus :size="18" />
              {{ loading ? 'Realizando cadastro...' : 'Criar minha conta' }}
            </button>
          </form>

          <div class="mt-6 flex items-center justify-center gap-2 text-sm text-[#8290a5]">
            Já possui uma conta?

            <button
              type="button"
              class="font-semibold text-[#2457a7] hover:underline"
              @click="emit('go-to-login')"
            >
              Fazer login
            </button>
          </div>
        </template>

        <template v-else>
          <div class="py-5 text-center">
            <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 :size="34" />
            </div>

            <h2 class="text-2xl font-bold text-[#172b4d]">
              Cadastro realizado!
            </h2>

            <p class="mt-3 text-sm leading-relaxed text-[#718096]">
              Seu cadastro foi realizado com sucesso. Aguarde a liberação do administrador para acessar o sistema.
            </p>

            <div class="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-left">
              <ShieldCheck :size="20" class="mt-0.5 shrink-0 text-[#3972bd]" />
              <p class="text-sm leading-relaxed text-[#36577f]">
                Você poderá entrar no LabControl assim que um administrador aprovar sua solicitação.
              </p>
            </div>

            <button
              type="button"
              class="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2457a7] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1d488d]"
              @click="emit('go-to-login')"
            >
              <ArrowLeft :size="17" />
              Voltar para o login
            </button>
          </div>
        </template>
      </div>

      <p class="mt-6 text-center text-xs text-[#9aa6b6]">
        © 2026 LabControl · Gestão inteligente de ativos
      </p>
    </section>
  </main>
</template>
