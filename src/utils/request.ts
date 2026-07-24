const TOKEN_KEY = 'wx_token'
/** 请求基础配置 */
const BASE_URL = 'https://xh.babytime.top'//'https://babytime.top'
//const BASE_URL = 'http://55124f33.r16.vip.cpolar.cn'

/** 请求超时时间（ms） */
const TIMEOUT = 15000

/** 响应数据结构 */
interface ResponseData<T = any> {
  code: number
  message: string
  data: T
}

/** 请求配置 */
interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
  header?: Record<string, string>
  /** 是否显示 loading，默认 true */
  showLoading?: boolean
  /** loading 提示文字 */
  loadingText?: string
  /** 是否显示错误提示，默认 true */
  showError?: boolean
}

/** 是否已处理过 401（整个 App 生命周期内只刷新一次，避免死循环） */
let isHandling401 = false

/** 处理 401：清除 token 并刷新当前页面，全生命周期只执行一次 */
function handle401() {
  if (isHandling401) return
  isHandling401 = true

  uni.removeStorageSync(TOKEN_KEY)
  uni.hideLoading()
  uni.showToast({ title: '登录已过期，正在刷新...', icon: 'none', duration: 1500 })

  setTimeout(() => {
    try {
      const pages = getCurrentPages()
      if (pages.length === 0) return
      const currentPage: any = pages[pages.length - 1]
      const route: string = currentPage.route || ''
      const options: Record<string, any> = currentPage.options || {}
      const query = Object.keys(options)
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(options[k])}`)
        .join('&')
      const fullPath = '/' + route + (query ? `?${query}` : '')

      uni.reLaunch({ url: fullPath })
    } catch (e) {
      console.error('401 刷新页面失败:', e)
    }
  }, 500)
}

/** 获取请求头 */
function getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'appId': 'wx8dd20779c982510c',
    ...customHeaders,
  }
  // 携带 token
  const token = uni.getStorageSync(TOKEN_KEY)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/** 统一请求方法 */
function request<T = any>(options: RequestOptions): Promise<T> {
  const {
    url,
    method = 'GET',
    data,
    header,
    showLoading = true,
    loadingText = '加载中...',
    showError = true,
  } = options

  if (showLoading) {
    uni.showLoading({ title: loadingText, mask: true })
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: getHeaders(header),
      timeout: TIMEOUT,
      success: (res) => {
        const statusCode = res.statusCode
        if (statusCode === 200) {
          const result = res.data as ResponseData<T>
          if (result.code === 0 || result.code === 200) {
            resolve(result.data)
          } else {
            // 业务错误
            // if (showError) {
            //   uni.showToast({ title: result.message || '请求失败', icon: 'none' })
            // }
            reject(result)
          }
        } else if (statusCode === 401) {
          // token 过期，刷新当前页面（并发 401 只刷新一次）
          handle401()
          reject(res)
        } else {
          if (showError) {
            uni.showToast({ title: `请求错误(${statusCode})`, icon: 'none' })
          }
          reject(res)
        }
      },
      fail: (err) => {
        console.error('请求失败:', err)
        if (showError) {
          uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        }
        reject(err)
      },
      complete: () => {
        if (showLoading) {
          uni.hideLoading()
        }
      },
    })
  })
}

/** GET 请求 */
export function get<T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>): Promise<T> {
  return request<T>({ url, method: 'GET', data, ...options })
}

/** POST 请求 */
export function post<T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>): Promise<T> {
  return request<T>({ url, method: 'POST', data, ...options })
}

/** PUT 请求 */
export function put<T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>): Promise<T> {
  return request<T>({ url, method: 'PUT', data, ...options })
}

/** DELETE 请求 */
export function del<T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>): Promise<T> {
  return request<T>({ url, method: 'DELETE', data, ...options })
}

export default request
