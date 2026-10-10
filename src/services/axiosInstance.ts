import axios from 'axios'
import { session } from '../lib/session'

const API = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request Interceptor
 *
 * Important:
 * - Normal JSON requests -> application/json
 * - FormData requests -> browser automatically sets
 *   multipart/form-data with the required boundary
 *
 * DO NOT manually set multipart/form-data here.
 */
API.interceptors.request.use(
  (config) => {
    const token = session.getToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)

    const isFormData =
      typeof FormData !== 'undefined' &&
      config.data instanceof FormData

    if (isFormData) {
      // Remove JSON content-type so Axios/browser can
      // automatically create the correct multipart boundary.
      if (config.headers) {
        delete config.headers['Content-Type']
        delete config.headers['content-type']
      }
    }

    return config
  },
  (error) => Promise.reject(error),
)

API.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status

    if (!error.response) {
      error.userMessage =
        error.code === 'ECONNABORTED'
          ? 'The request took too long. Please try again.'
          : 'We could not reach the server. Check your internet connection and try again.'

      return Promise.reject(error)
    }

    if (status === 401) {
      error.userMessage =
        'Your session has expired. Please sign in again.'
    } else if (status === 403) {
      error.userMessage =
        'You do not have permission to do that.'
    } else if (status === 404) {
      error.userMessage =
        'The requested item could not be found.'
    } else if (status === 409) {
      error.userMessage =
        'That item already exists. Please review and try again.'
    } else if (status === 422) {
      error.userMessage =
        'Please review the highlighted fields and try again.'
    } else if (status === 429) {
      error.userMessage =
        'Too many requests were made. Please wait a moment and try again.'
    } else if (status >= 500) {
      error.userMessage =
        'Something went wrong on our side. Please try again in a moment.'
    }

    return Promise.reject(error)
  },
)

export default API