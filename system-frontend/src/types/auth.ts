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

export interface RawLoginUser {
  userId: string
  email: string
  role?: RoleName
  roleName?: RoleName
  firstName?: string
  lastName?: string
  warehouseId?: string | null
  permissions?: string[]
}

export interface RawLoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: RawLoginUser
  data?: {
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: RawLoginUser
  }
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
