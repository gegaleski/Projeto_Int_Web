import api from './api'

interface LoginResponse {
  access: string
  refresh: string
}

interface RegisterData {
  nome: string
  email: string
  senha: string
}

export interface CurrentUser {
  nome: string
  email: string
  role: string
  status_aprovacao: string
}

export async function login(
  email: string,
  password: string,
  _rememberAccess = true,
): Promise<void> {
  const response = await api.post<LoginResponse>('/token/', {
    username: email.trim(),
    password,
  })

  sessionStorage.setItem('labcontrol_access', response.data.access)
  sessionStorage.setItem('labcontrol_refresh', response.data.refresh)

  localStorage.removeItem('labcontrol_access')
  localStorage.removeItem('labcontrol_refresh')
}

export async function registerUser(data: RegisterData): Promise<void> {
  await api.post('/cadastro/', {
    nome: data.nome.trim(),
    email: data.email.trim(),
    senha: data.senha,
  })
}

export function getCurrentUser(): CurrentUser | null {
  const token = sessionStorage.getItem('labcontrol_access')

  if (!token) {
    return null
  }

  try {
    const payload = token.split('.')[1]
    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const decoded = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )

    const data = JSON.parse(decoded)

    return {
      nome: data.nome || '',
      email: data.email || '',
      role: data.role || '',
      status_aprovacao: data.status_aprovacao || '',
    }
  } catch (error) {
    console.error('Erro ao identificar usuário:', error)
    return null
  }
}

export function logout(): void {
  sessionStorage.removeItem('labcontrol_access')
  sessionStorage.removeItem('labcontrol_refresh')
}

export function isAuthenticated(): boolean {
  return !!sessionStorage.getItem('labcontrol_access')
}