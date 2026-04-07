export interface User {
  userId: string
  email: string
  firstName: string
  lastName: string
  roleName: string
  roleId: string
  warehouseId: string | null
  active: boolean
  createdAt: string
}

export interface CreateUserRequest {
  email: string
  temporaryPassword: string
  firstName: string
  lastName: string
  roleId: string
  warehouseId?: string
}
