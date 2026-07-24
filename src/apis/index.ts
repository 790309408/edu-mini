/**
 * 统一接口管理
 * 所有后端接口请求集中在此处定义和导出
 */

import { get, post, del } from '@/utils/request'

const BASE_URL = 'https://babytime.top'

// ============ 类型定义 ============

/** 微信登录返回结构 */
export interface LoginResult {
  userId: number
  openId: string
  nickName: string | null
  avatarUrl: string | null
  vip: boolean
  vipType: number
  vipDesc: string
  vipExpire: string | null
  vipExpired: boolean
  shareVip: boolean | null
  freeViewRemain: number
  session_key?: string
  token: string | null
  appToken?: string
}

/** 顶部 Tab 项 */
export interface TabItem {
  id: number
  name: string
  icon: string
  sort: number
  status: number
  createBy?: string
  updateBy?: string
  createTime?: string
  updateTime?: string
}

/** 分类项 */
export interface CategoryItem {
  id: number
  tabId: number
  name: string
  totalEpisodes: number
  cover: string
  isVip: number
  sort: number
  status: number
  /** 内容类型：1=视频课程，2=图文 */
  contentType?: number
  /** 图文富文本内容（contentType=2 时使用） */
  content?: string
  createBy?: string
  updateBy?: string
  createTime?: string
  updateTime?: string
}

/** 二维码图片 */
export interface QrcodeImage {
  id: number
  qrcodeId: number
  imageUrl: string
  sort: number
}

/** 二维码弹框项 */
export interface QrcodeItem {
  id: number
  title: string
  name: string
  type: number
  textContent: string
  images: QrcodeImage[]
}

/** 视频项 */
export interface VideoApiItem {
  id: number
  typeId: number
  name: string
  url: string
  sort: number
  status: number
  isFinish?: boolean
}

// ============ 用户 / 鉴权 ============

/**
 * 微信登录（code 换取 openid + token）
 * @param code wx.login 拿到的临时 code
 * @param openId 本地缓存的 openid（可选，便于后端复用）
 * @param bindUserId 分享进入时携带的邀请人 userId，用于后端建立绑定关系
 * @param sceneValue 扫描小程序码进入时携带的场景值
 */
export function wxLogin(code: string, openId?: string, bindUserId?: string | number, sceneValue?: string) {
  const payload: Record<string, any> = { code, openId }
  if (bindUserId !== undefined && bindUserId !== null && bindUserId !== '') {
    payload.bindUserId = bindUserId
  }
  if (sceneValue !== undefined && sceneValue !== null && sceneValue !== '') {
    payload.sceneValue = sceneValue
  }
  return post<LoginResult>('/app/user/wxlogin', payload, { showLoading: false, header: { appid: 'wx8dd20779c982510c' } })
}

/** 扣除用户试看次数 */
export function deductUserTimes(userId: number | string) {
  return post('/app/user/deduct', { userId }, { showLoading: false })
}

/** 分享拉新：将当前用户绑定到邀请人 */
export function bindUser(userId: number | string, bindUserId: number | string) {
  return post('/app/user/bind', { userId, bindUserId }, { showLoading: false, showError: false })
}

/** 已绑定好友数量响应 */
export interface BindCountInfo {
  /** 已绑定数量（当前进度） */
  count: number
  /** 目标总数 */
  threshold: number
}

/** 获取已绑定好友数量 */
export function getBindCount(userId: number | string) {
  return get<BindCountInfo>(`/app/user/bind/count/${userId}`, undefined, { showLoading: false, showError: false })
}

/** 邀请好友列表项 */
export interface InvitedItem {
  userId: number
  nickName: string
  avatarUrl: string | null
  joinTime: string
  rewardViews: number
}

/** 获取邀请好友列表 */
export function getInvitedList(userId: number | string) {
  return get<InvitedItem[]>(`/app/user/invited-list/${userId}`, undefined, { showLoading: false })
}

/** 兑换码兑换 */
export function redeemCode(userId: number | string, code: string) {
  return post('/app/user/redeem', { userId, code })
}

// ============ 首页内容 ============

/** 获取顶部 Tab 列表 */
export function getTabList() {
  return get<TabItem[]>('/app/tab/list', undefined, { showLoading: false })
}

/** 获取分类列表 */
export function getCategoryList(tabId: number) {
  return get<CategoryItem[]>('/app/category/list', { tabId }, { showLoading: false })
}

/** 按类型获取二维码弹框（type=1：非会员免费领取） */
export function getQrcodeListByType(type: number) {
  return get<QrcodeItem[]>('/app/qrcode/listByType', { type }, { showLoading: false })
}

// ============ 分享配置 ============

/** 分享渠道配置 */
export interface ShareChannelConfig {
  title: string
  imageUrl: string
  desc: string
}

/** 分享配置（好友 + 朋友圈） */
export interface ShareConfig {
  friend: ShareChannelConfig
  timeline: ShareChannelConfig
}

/** 获取小程序分享配置 */
export function getShareConfig() {
  return get<ShareConfig>('/app/config/share', undefined, { showLoading: false })
}

// ============ 视频 ============

/** 获取视频列表 */
export function getVideoList(typeId: number, userId?: number | string) {
  return get<VideoApiItem[]>('/app/video/list', {
    typeId,
    ...(userId ? { userId } : {}),
  }, { showLoading: false })
}

/** 上报视频观看完成 */
export function reportWatchFinish(params: {
  userId: number | string
  videoId: number
  typeId?: number
}) {
  return post('/app/video/watch', params, { showLoading: false, showError: false })
}

// ============ 留言 ============

/** 留言项 */
export interface MessageItem {
  id: number
  userId: number
  content: string
  /** 状态：1=正常，2=已删除 */
  status: number
  createTime: string
  nickName: string
  avatarUrl: string | null
}

/** 留言列表分页响应 */
export interface MessageListResult {
  total: number
  list: MessageItem[]
}

/** 提交留言 */
export function submitMessage(content: string) {
  return post('/app/message', { content })
}

/** 获取我的留言列表 */
export function getMyMessages(page = 1, size = 20) {
  return get<MessageListResult>('/app/message/my', { page, size }, { showLoading: false })
}

/** 删除留言 */
export function deleteMessage(id: number) {
  return del(`/app/message/${id}`, undefined, { showLoading: false })
}

// ============ 用户资料 ============

/** 保存用户昵称和头像 */
export function saveUserProfile(params: {
  userId: number | string
  nickName?: string
  avatarUrl?: string
}) {
  return post('/app/user/profile', params, { showLoading: true, loadingText: '保存中...' })
}

// ============ 上传 ============

/**
 * 上传单张图片
 * POST /vod/upload/images  (multipart/form-data)
 * 免鉴权
 */
export function uploadSingleImage(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + '/vod/upload/images',
      filePath,
      name: 'files',
      formData: {
        title: '用户头像',
        tags: 'avatar',
        desc: '用户上传头像',
      },
      success: (res) => {
        try {
          const body = JSON.parse(res.data)
          if (body.code === 200 && body.data) {
            resolve(body.data as string)
          } else {
            reject(new Error(body.message || '图片上传失败'))
          }
        } catch {
          reject(new Error('解析上传响应失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络异常，上传失败'))
      },
    })
  })
}

// ============ 搜索 ============

/** 搜索课程结果项（与 CategoryItem 结构一致） */
export interface SearchResultItem {
  id: number
  name: string
  totalEpisodes: number
  cover: string
  contentType: number
  isVip: number
  content: string
}

/** 搜索课程 */
export function searchCourse(keyword: string, userId?: number | string) {
  const params: Record<string, any> = { keyword }
  if (userId !== undefined && userId !== null && userId !== '') {
    params.userId = userId
  }
  return get<SearchResultItem[]>('/app/search/course', params, { showLoading: false })
}
