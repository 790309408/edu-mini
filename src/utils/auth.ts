/** 微信小程序登录鉴权工具 */

import { wxLogin, deductUserTimes as apiDeductUserTimes } from '@/apis'

const USER_INFO_KEY = 'wx_user_info'
const OPENID_KEY = 'wx_openid'
const SESSION_KEY = 'wx_session_key'
const TOKEN_KEY = 'wx_token'
const SCENE_VALUE_KEY = 'wx_scene_value'

/**
 * 调用 wx.login 获取临时 code
 */
function getLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        if (res.code) {
          resolve(res.code)
        } else {
          reject(new Error(res.errMsg || '获取登录 code 失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '调用 uni.login 失败'))
      },
    })
  })
}

/**
 * 获取用户信息
 * @param bindUserId 分享进入时携带的邀请人 userId，用于后端建立绑定关系
 */
export async function getUserInfo(bindUserId?: string | number) {
  // 1. 获取临时 code
  const code = await getLoginCode()
  // 2. 后端换取 openid
  const cachedOpenid = uni.getStorageSync(OPENID_KEY) as string
  // 3. 读取扫描小程序码时缓存的 sceneValue
  const sceneValue = uni.getStorageSync(SCENE_VALUE_KEY) as string | undefined
  const result = await wxLogin(code, cachedOpenid, bindUserId, sceneValue)
  if (!result.openId) {
    throw new Error('后端未返回 openid，请检查接口')
  }
  // 4. 缓存 openid
  uni.setStorageSync(OPENID_KEY, result.openId)
  // 5. 缓存 user
  uni.setStorageSync(USER_INFO_KEY, result)
  // 6.缓存token
  uni.setStorageSync(TOKEN_KEY, result.token || '')
  // 7.缓存腾讯云点播 appToken
  if (result.appToken) {
    uni.setStorageSync('app_token', result.appToken)
  }
}

/**
 * 扣除用户试看次数，扣减成功后自动刷新用户信息缓存（同步最新 freeViewRemain 等字段）
 * @param userId 用户ID
 */
export async function deductUserTimes(userId: number): Promise<any> {
  const result = await apiDeductUserTimes(userId)
  // 扣减成功后刷新用户信息，同步剩余次数等字段到缓存
  try {
    await getUserInfo()
  } catch (e) {
    console.error('扣减后刷新用户信息失败:', e)
  }
  return result
}

/**
 * 清除本地缓存的 openid 及 session_key
 */
export function clearOpenid(): void {
  uni.removeStorageSync(OPENID_KEY)
  uni.removeStorageSync(SESSION_KEY)
  uni.removeStorageSync(TOKEN_KEY)
}
