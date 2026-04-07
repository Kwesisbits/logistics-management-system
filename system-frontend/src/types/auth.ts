export type RoleName = 'ADMIN' | 'WAREHOUSE_STAFF' | 'VIEWER'

export interface AuthUser {
  userId: string
  email: string
  firstName: string
  lastName: string
  roleName: RoleName
  warehouseId: string | null
  permissions: string[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

export interface Role {
  roleId: string
  roleName: string
  description: string
}
