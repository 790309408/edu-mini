/**
 * 页面鉴权守卫 —— 装饰 onLoad / onShow，确保回调执行前已完成鉴权
 *
 * 用法：在页面中用 guardedOnLoad / guardedOnShow 替代原生 onLoad / onShow
 */

import { onLoad, onShow } from '@dcloudio/uni-app'
import { getUserInfo } from './auth'

const TOKEN_KEY = 'wx_token'

/** 模块级鉴权 Promise，同一页面多次调用只执行一次 */
let authPromise: Promise<void> | null = null

/**
 * 确保已鉴权（有 token），否则调用 getUserInfo 完成登录
 * 同一生命周期内多次调用会复用同一个 Promise，避免重复请求
 * @param bindUserId 分享进入时携带的邀请人 userId，用于首次登录时传递给后端建立绑定关系
 */
async function ensureAuth(bindUserId?: string | number): Promise<void> {
  const token = uni.getStorageSync(TOKEN_KEY)
  if (token) return

  if (!authPromise) {
    authPromise = getUserInfo(bindUserId)
      .catch((err) => {
        console.error('[auth-guard] 鉴权失败:', err)
      })
      .finally(() => {
        authPromise = null
      })
  }
  await authPromise
}

/**
 * 带鉴权守卫的 onLoad
 * @param callback 原始 onLoad 回调，鉴权通过后执行
 */
export function guardedOnLoad(callback?: (query?: Record<string, any>) => void) {
  onLoad(async (query) => {
    // 从页面参数中提取 userId 作为 bindUserId（分享链接进入场景）
    const bindUserId = query && (query as any).userId
    await ensureAuth(bindUserId)
    callback?.(query)
  })
}

/**
 * 带鉴权守卫的 onShow
 * @param callback 原始 onShow 回调，鉴权通过后执行
 */
export function guardedOnShow(callback?: () => void) {
  onShow(async () => {
    await ensureAuth()
    callback?.()
  })
}
