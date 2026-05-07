import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/utils/request'

export interface User {
  id: number
  username: string
  email: string
  role: 'ADMIN' | 'EDITOR'
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isEditor = computed(() => user.value?.role === 'EDITOR')

  async function login(username: string, password: string) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const response = await request.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    token.value = response.data.accessToken
    localStorage.setItem('token', response.data.accessToken)
    user.value = response.data.user

    return response.data
  }

  async function fetchProfile() {
    const response = await request.get('/auth/profile')
    user.value = response.data
    return response.data
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isEditor,
    login,
    fetchProfile,
    logout,
  }
})
