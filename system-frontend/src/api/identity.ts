import api from './axios'
import { serviceBases } from './service-bases'
import { normalizeSpringPage } from '@/types/api'
import type { LoginRequest, LoginResponse, RawLoginResponse, AuthUser, Role } from '@/types/auth'
import type { User, CreateUserRequest } from '@/types/users'

const BASE = serviceBases.identity

function normalizeLoginResponse(raw: RawLoginResponse): LoginResponse {
  const payload = raw.data ?? raw
  const u = payload.user
  const roleName = u.roleName ?? u.role ?? 'VIEWER'
  const emailParts = u.email.split('@')[0].split('.')

  const user: AuthUser = {
    userId: u.userId,
    email: u.email,
    firstName: u.firstName ?? emailParts[0]?.charAt(0).toUpperCase() + (emailParts[0]?.slice(1) ?? ''),
    lastName: u.lastName ?? (emailParts[1]?.charAt(0).toUpperCase() + (emailParts[1]?.slice(1) ?? '') || ''),
    roleName,
    warehouseId: u.warehouseId ?? null,
    permissions: u.permissions ?? [],
  }

  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    expiresIn: payload.expiresIn,
    user,
  }
}

function mapUser(u: Record<string, unknown>): User {
  return {
    userId: String(u.userId),
    email: String(u.email ?? ''),
    firstName: String(u.firstName ?? ''),
    lastName: String(u.lastName ?? ''),
    roleName: String(u.roleName ?? u.role ?? ''),
    roleId: String(u.roleId ?? ''),
    warehouseId: u.warehouseId != null ? String(u.warehouseId) : null,
    active: Boolean(u.active ?? u.isActive ?? true),
    createdAt: String(u.createdAt ?? ''),
  }
}

export const identityApi = {
  login: (data: LoginRequest) =>
    api.post<RawLoginResponse>(`${BASE}/auth/login`, data).then((r) => normalizeLoginResponse(r.data)),

  logout: (tokenJti: string, userId: string) =>
    api.post(`${BASE}/auth/logout`, null, {
      headers: { 'X-Token-JTI': tokenJti, 'X-User-ID': userId },
    }),

  getUsers: () =>
    api
      .get(`${BASE}/users`, { params: { page: 1, limit: 500 } })
      .then((r) => {
        const norm = normalizeSpringPage<Record<string, unknown>>(r.data)
        return norm.data.map(mapUser)
      }),

  getUser: (userId: string) =>
    api.get(`${BASE}/users/${userId}`).then((r) => mapUser(r.data as Record<string, unknown>)),

  createUser: (data: CreateUserRequest) =>
    api.post(`${BASE}/users`, data).then((r) => mapUser(r.data as Record<string, unknown>)),

  deactivateUser: (userId: string) =>
    api.patch(`${BASE}/users/${userId}/deactivate`),

  changeRole: (userId: string, roleId: string) =>
    api.patch(`${BASE}/users/${userId}/role`, { roleId }).then((r) => mapUser(r.data as Record<string, unknown>)),

  getRoles: () => api.get<Role[]>(`${BASE}/roles`).then((r) => r.data),
}
