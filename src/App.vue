<script setup lang="ts">
import { ref } from 'vue'
import LoginView from './views/LoginView.vue'
import CadastroView from './views/CadastroView.vue'
import DashboardView from './views/DashboardView.vue'
import { isAuthenticated } from './services/auth'

const autenticado = ref(isAuthenticated())
const telaAtual = ref<'login' | 'cadastro'>('login')

function handleAuthenticated() {
  autenticado.value = true
}

function handleLogout() {
  autenticado.value = false
  telaAtual.value = 'login'
}
</script>

<template>
  <DashboardView
    v-if="autenticado"
    @logout="handleLogout"
  />

  <CadastroView
    v-else-if="telaAtual === 'cadastro'"
    @go-to-login="telaAtual = 'login'"
  />

  <LoginView
    v-else
    @authenticated="handleAuthenticated"
    @go-to-register="telaAtual = 'cadastro'"
  />
</template>