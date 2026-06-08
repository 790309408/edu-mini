<template>
  <view class="video-page" :style="themeVars">
    <common-video
      :video-list="videoList"
      :initial-index="initialIndex"
      :paused="isPlayBlocked"
      @cast="onCast"
      @change="onChange"
      @ended="onEnded"
      @blocked="onPlayBlocked"
    />

    <!-- 免费次数用完提示弹框 -->
    <view v-if="showNoTimesDialog" class="no-times-overlay">
      <view class="no-times-dialog">
        <text class="no-times-title">免费次数已用完</text>
        <text class="no-times-desc"
          >您的免费观看次数已用完，成为会员即可无限观看</text
        >
        <view class="no-times-actions">
          <view class="no-times-btn btn-cancel" @tap="onDialogCancel">
            <text class="btn-cancel-text">取消</text>
          </view>
          <view class="no-times-btn btn-confirm" @tap="onDialogConfirm">
            <text class="btn-confirm-text">获取会员</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 免费领取弹框 -->
    <free-dialog
      v-model:visible="showFreeDialog"
      :name="freeName"
      :text-content="freeTextContent"
      :qrcode-url="freeQrcodeUrl"
      :remain-count="remainCount"
      :close-on-overlay="true"
      @confirm="onRedeemConfirm"
    />

    <!-- 兑换成功弹框 -->
    <success-dialog
      v-model:visible="showSuccessDialog"
      title="兑换成功"
      content="恭喜您，兑换码已成功兑换，快去畅享精彩内容吧！"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { guardedOnLoad } from '@/utils/auth-guard'
import CommonVideo from '@/components/common-video.vue'
import type { VideoItem } from '@/components/common-video.vue'
import FreeDialog from '@/components/free-dialog.vue'
import SuccessDialog from '@/components/success-dialog.vue'
import { deductUserTimes, getUserInfo } from '@/utils/auth'
import {
  getVideoList,
  reportWatchFinish,
  getQrcodeListByType,
  getShareConfig,
  bindUser,
  redeemCode as apiRedeemCode,
  type VideoApiItem,
  type ShareConfig,
} from '@/apis'
import { useTheme } from '@/utils/theme'

const { themeVars } = useTheme()

/** 原始视频列表（用于获取 id、isFinish 等业务字段） */
const rawVideoList = ref<VideoApiItem[]>([])
/** 传给组件的视频列表（保留 isFinish 状态，便于样式区分） */
const videoList = ref<VideoItem[]>([])
const initialIndex = ref(0)
/** 当前分类 ID */
const currentTypeId = ref<number | undefined>(undefined)
/** 当前课程封面图（用于分享） */
const courseCover = ref('')
/** 页面参数中是否显式指定了 index */
let hasExplicitIndex = false
/** 免费次数用完弹框 */
const showNoTimesDialog = ref(false)
/** 次数已耗尽的持久冻结标记（只有兑换成功才解除） */
const timesExhausted = ref(false)

/** 免费领取弹框 */
const showFreeDialog = ref(false)
const freeName = ref('')
const freeTextContent = ref('')
const freeQrcodeUrl = ref('')
const remainCount = ref(0)

/** 兑换成功弹框 */
const showSuccessDialog = ref(false)

const QRCODE_INDEX_KEY = 'free_qrcode_index'

/** 冻结播放：次数耗尽且未兑换成功时始终禁止播放 */
const isPlayBlocked = computed(
  () => timesExhausted.value || showNoTimesDialog.value || showFreeDialog.value,
)

/** 同步视频列表到组件，保持 isFinish 状态 */
function syncVideoList() {
  videoList.value = rawVideoList.value.map((item) => ({
    title: item.name,
    url: item.url,
    isFinish: !!item.isFinish,
  }))
}

/** 从接口获取视频列表 */
async function fetchVideoList(typeId: number) {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo?.userId
  try {
    const data = await getVideoList(typeId, userId)
    if (data && data.length) {
      rawVideoList.value = data
      syncVideoList()
      // 未显式指定 index 时，定位到第一个未完成的视频；全部完成则默认第一个
      if (!hasExplicitIndex) {
        const firstUnfinished = data.findIndex((item) => !item.isFinish)
        initialIndex.value = firstUnfinished >= 0 ? firstUnfinished : 0
      }
    }
  } catch (err) {
    console.error('获取视频列表失败:', err)
  }
}

/** 处理分享进入时的用户绑定逻辑 */
async function handleShareBind(bindUserId: string | number) {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const currentUserId = userInfo && userInfo.userId
  if (!currentUserId) return
  // 自己分享给自己无需绑定
  if (String(currentUserId) === String(bindUserId)) return
  try {
    await bindUser(currentUserId, bindUserId)
  } catch (e) {
    console.error('绑定分享用户失败:', e)
  }
}

guardedOnLoad((query) => {
  // 兼容小程序码 scene 传参（如 {"scene":"typeId=4"}）
  if (query?.scene) {
    const sceneStr = decodeURIComponent(query.scene as string)
    sceneStr.split('&').forEach((pair) => {
      const [key, val] = pair.split('=')
      if (key && val && !(key in (query as any))) {
        ;(query as any)[key] = val
      }
    })
  }
  console.log('query11', JSON.stringify(query))
  // 从页面参数获取初始索引：仅当指定为大于 0 的有效索引时才视为显式指定，
  // 避免传 index=0 时覆盖掉"第一个未完成"的默认策略
  if (query?.index != null && query.index !== '') {
    const idx = Number(query.index)
    if (Number.isFinite(idx) && idx > 0) {
      hasExplicitIndex = true
      initialIndex.value = idx
    }
  }
  // 通过 typeId 从接口拉取视频列表
  if (query?.typeId) {
    const typeId = Number(query.typeId)
    currentTypeId.value = typeId
    fetchVideoList(typeId)
  }
  // 从分享链接进入：携带 userId 时调用绑定接口
  if (query && query.userId) {
    handleShareBind(query.userId)
  }
  // 非 VIP 时预获取免费领取二维码数据
  const userInfo0 = uni.getStorageSync('wx_user_info') as any
  if (userInfo0 && (userInfo0.vip === false || userInfo0.vipType === 0)) {
    remainCount.value = Number(userInfo0.freeViewRemain) || 0
    fetchFreeQrcode()
  }
  // 每打开一个视频页面，扣减一次观看次数
  doDeduct()
  // 获取分享配置
  fetchShareConfig()
  // 读取当前课程封面（首页跳转前已写入）
  courseCover.value = uni.getStorageSync('video_course_cover') || ''
})

/**
 * 执行扣除次数（每打开一个视频页面扣减一次）
 */
async function doDeduct() {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo?.userId
  if (!userId) return

  // VIP 用户（vip=true 且 vipType>0）不扣减试看次数
  if (userInfo?.vip === true && Number(userInfo?.vipType) > 0) {
    console.log('VIP 用户，跳过扣减次数')
    return
  }

  // 非 VIP 且剩余次数已用完，直接弹框提示
  if (userInfo.freeViewRemain != null && userInfo.freeViewRemain <= 0) {
    timesExhausted.value = true
    showNoTimesDialog.value = true
    return
  }

  try {
    await deductUserTimes(userId)
    console.log('扣除次数成功')
    // 扣减后重新检查剩余次数
    const updatedInfo = uni.getStorageSync('wx_user_info') as any
    if (
      updatedInfo &&
      !updatedInfo.vip &&
      updatedInfo.freeViewRemain != null &&
      updatedInfo.freeViewRemain <= 0
    ) {
      timesExhausted.value = true
      showNoTimesDialog.value = true
    }
  } catch (err) {
    console.error('扣除次数失败:', err)
  }
}

/** 弹框取消：回到首页 */
function onDialogCancel() {
  showNoTimesDialog.value = false
  uni.reLaunch({ url: '/pages/index/index' })
}

/** 获取非会员免费领取二维码弹框数据 */
async function fetchFreeQrcode() {
  try {
    const data = await getQrcodeListByType(1)
    if (!data || !data.length) return
    const item = data[0]
    const images = item.images || []
    if (!images.length) return

    let idx = Number(uni.getStorageSync(QRCODE_INDEX_KEY)) || 0
    if (idx < 0 || isNaN(idx)) idx = 0
    idx = idx % images.length

    freeName.value = item.name || ''
    freeTextContent.value = item.textContent || ''
    freeQrcodeUrl.value = images[idx].imageUrl || ''

    const nextIdx = (idx + 1) % images.length
    uni.setStorageSync(QRCODE_INDEX_KEY, nextIdx)
  } catch (e) {
    console.error('获取免费领取二维码失败:', e)
  }
}

/** 弹框确认：弹出免费领取弹框 */
function onDialogConfirm() {
  showNoTimesDialog.value = false
  showFreeDialog.value = true
}

/** 兑换码确认 */
async function onRedeemConfirm(code: string) {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId
  if (!userId) {
    uni.showToast({ title: '用户信息丢失，请重试', icon: 'none' })
    return
  }
  try {
    await apiRedeemCode(userId, code)
    showFreeDialog.value = false
    timesExhausted.value = false // 兑换成功，解除冻结
    try {
      await getUserInfo()
    } catch (refreshErr) {
      console.error('兑换后刷新用户信息失败:', refreshErr)
    }
    showSuccessDialog.value = true
  } catch (e) {
    console.error('兑换失败:', e)
  }
}

function onCast(video: VideoItem) {
  console.log('投屏:', video.title)
}

/** 次数耗尽时用户尝试播放/切换，弹出免费领取弹框 */
function onPlayBlocked() {
  showFreeDialog.value = true
}

function onChange(index: number) {
  console.log('切换到视频:', index)
  // 每次切换视频扣减一次观看次数
  doDeduct()
}

/** 上报视频观看完成 */
async function reportWatchFinished(index: number) {
  const item = rawVideoList.value[index]
  if (!item) return
  // 已完成则不再上报
  if (item.isFinish) return

  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo?.userId
  if (!userId) return

  try {
    await reportWatchFinish({
      userId,
      videoId: item.id,
      ...(currentTypeId.value ? { typeId: currentTypeId.value } : {}),
    })
    // 本地标记为已完成，同步到组件视频列表，避免重复上报并刷新样式
    item.isFinish = true
    if (videoList.value[index]) {
      videoList.value[index] = { ...videoList.value[index], isFinish: true }
    }
    console.log('视频观看完成上报成功:', item.id)
  } catch (err) {
    console.error('视频观看完成上报失败:', err)
  }
}

function onEnded(index: number) {
  console.log('视频播放完成:', index)
  reportWatchFinished(index)
}

/** 分享配置（从接口获取） */
const shareConfig = ref<ShareConfig | null>(null)

/** 获取分享配置 */
async function fetchShareConfig() {
  try {
    const data = await getShareConfig()
    if (data) {
      shareConfig.value = data
    }
  } catch (e) {
    console.error('获取分享配置失败:', e)
  }
}

/** 分享给好友（微信分享回调） */
onShareAppMessage(() => {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId ? userInfo.userId : ''
  const friend = shareConfig.value?.friend
  const typeId = currentTypeId.value || ''
  // 分享链接直接打开课程页，携带 userId 用于绑定 + typeId 定位课程
  const params = [
    typeId ? `typeId=${typeId}` : '',
    userId ? `userId=${userId}` : '',
  ]
    .filter(Boolean)
    .join('&')
  return {
    title: friend?.title || '宝宝爱听 — 免费儿童教育视频',
    desc: friend?.desc || '',
    path: params ? `/pages/video/index?${params}` : '/pages/video/index',
    imageUrl: courseCover.value || friend?.imageUrl || '',
  }
})

/** 分享到朋友圈 */
onShareTimeline(() => {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId ? userInfo.userId : ''
  const timeline = shareConfig.value?.timeline
  const typeId = currentTypeId.value || ''
  const parts = [
    typeId ? `typeId=${typeId}` : '',
    userId ? `userId=${userId}` : '',
  ].filter(Boolean)
  return {
    title: timeline?.title || '宝宝爱听 — 免费儿童教育视频',
    query: parts.join('&'),
    imageUrl: courseCover.value || timeline?.imageUrl || '',
  }
})
</script>

<style lang="less" scoped>
.video-page {
  width: 100%;
  height: 100vh;
  background-color: #000;
  overflow: hidden;
  box-sizing: border-box;
  padding-left: env(safe-area-inset-left);
}

/* 免费次数用完弹框 */
.no-times-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.no-times-dialog {
  width: 40vw;
  padding: 3vw 3vw 2.4vw;
  border-radius: 2.4vw;
  background: #fff8eb;
  box-shadow: 0 0.8vw 3vw rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.no-times-title {
  font-size: 2.6vw;
  font-weight: 800;
  color: #333333;
  margin-bottom: 1.2vw;
}

.no-times-desc {
  font-size: 1.6vw;
  color: #666666;
  text-align: center;
  margin-bottom: 2.4vw;
  line-height: 1.6;
}

.no-times-actions {
  display: flex;
  flex-direction: row;
  gap: 2vw;
  width: 100%;
  justify-content: center;
}

.no-times-btn {
  flex: 1;
  height: 4.4vw;
  border-radius: 2.2vw;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-cancel {
  background: #f0f0f0;
}

.btn-cancel-text {
  font-size: 1.8vw;
  font-weight: 600;
  color: #666666;
}

.btn-confirm {
  background: linear-gradient(135deg, #f5a0c0, var(--theme-end));
}

.btn-confirm-text {
  font-size: 1.8vw;
  font-weight: 600;
  color: #ffffff;
}
</style>
