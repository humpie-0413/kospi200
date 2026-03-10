export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AuthUser {
  username: string
  is_admin: boolean
}
