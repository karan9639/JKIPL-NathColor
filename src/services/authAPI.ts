import API from './axiosInstance'

export interface LoginPayload {
  email: string
  password: string
  deviceID?: string
  deviceIP?: string
  uuid?: string
}

export interface AuthApiResponse {
  status?: string
  success?: boolean
  message?: string
  token?: string
  accessToken?: string
  menuoptionslist?: string
  user?: {
    username?: string
    token?: string
    accessToken?: string
    menuoptionslist?: string
  }
  data?: {
    token?: string
    accessToken?: string
    menuoptionslist?: string
    foundUser?: {
      _id?: string
      fullname?: string
      email?: string
      role?: string
    }
  }
}

const loginUser = async (userData: LoginPayload) =>
  API.post<AuthApiResponse>('user/login', userData)

const logoutUser = async () => API.post<AuthApiResponse>('user/logout')

export { loginUser, logoutUser }
