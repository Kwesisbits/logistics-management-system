import api from './axios'
import type { LoginRequest, LoginResponse, Role } from '@/types/auth'
import type { User, CreateUserRequest } from '@/types/users'

const BASE = import.meta.env.VITE_IDENTITY_SERVICE_URL

export const identityApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>(`${BASE}/auth/login`, data).then((r) => r.data),

  logout: (tokenJti: string, userId: string) =>
    api.post(`${BASE}/auth/logout`, null, {
      headers: { 'X-Token-JTI': tokenJti, 'X-User-ID': userId },
    }),

  getUsers: () => api.get<User[]>(`${BASE}/users`).then((r) => r.data),

  getUser: (userId: string) =>
    api.get<User>(`${BASE}/users/${userId}`).then((r) => r.data),

  createUser: (data: CreateUserRequest) =>
    api.post<User>(`${BASE}/users`, data).then((r) => r.data),

  deactivateUser: (userId: string) =>
    api.patch(`${BASE}/users/${userId}/deactivate`),

  changeRole: (userId: string, roleId: string) =>
    api.patch<User>(`${BASE}/users/${userId}/role`, { roleId }).then((r) => r.data),

  getRoles: () => api.get<Role[]>(`${BASE}/roles`).then((r) => r.data),
}
