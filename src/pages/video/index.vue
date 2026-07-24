<template>
  <view class="video-page" :style="themeVars">
    <!-- apptoken 有值时使用 m-video 插件播放 -->
    <view v-if="apptoken" class="video-container" @tap="onContainerTap">
      <view class="video-wrapper" :class="{ 'video-shrink': showPlaylist }">
        <m-video
          class="video-player"
          :token="apptoken"
          id="refVideo"
          ref="refVideo"
          :key="currentVideo.url"
          :autoplay="!isPlayBlocked"
          :speedRate="playbackRate"
          :src="currentVideo.url"
          :showSpeedRateBtn="false"
          :muted="false"
          :show-casting-button="true"
          :enable-auto-rotation="false"
          :show-screen-lock-button="false"
          :show-background-playback-button="false"
          :controls="false"
          :enable-progress-gesture="false"
          :preferred-peak-bit-rate="-1"
          :showCustomCenterPlayBtn="false"
          @play="onPlay"
          @pause="onPause"
          @ended="onEnded"
          @timeupdate="onTimeUpdate"
          @loadedmetadata="onLoadedMetadata"
          @error="onVideoError"
          @castinguserselect="onCastingUserSelect"
          @castingstatechange="onCastingStateChange"
          @castinginterrupt="onCastingInterrupt"
          :debug="false"
        />
        <!-- 开发工具 H.265 不支持提示 -->
        <view v-if="showDevToolsTip" class="devtools-tip">
          <text class="devtools-tip-text"
            >开发工具不支持 H.265
            视频解码，仅有声音无画面属正常现象，请在真机上预览</text
          >
        </view>

        <!-- 透明点击层：始终覆盖视频区域，拦截所有点击传递给 onContainerTap -->
        <view
          v-if="!isListenMode"
          class="tap-layer"
          @tap.stop="onContainerTap"
        />

        <!-- 中央播放/暂停按钮 -->
        <view
          v-if="
            !isListenMode && !showSpeedPanel && (showControls || showCenterBtn)
          "
          class="center-play-btn"
          @tap.stop="onCenterBtnTap"
        >
          <view
            :key="centerBounceKey"
            class="center-play-circle center-bounce-anim"
          >
            <!-- 播放三角形 -->
            <view v-if="!isPlaying" class="css-play-icon" />
            <!-- 暂停双竖条 -->
            <view v-else class="css-pause-icon">
              <view class="pause-bar" />
              <view class="pause-bar" />
            </view>
          </view>
        </view>

        <!-- 听视频模式遮罩 -->
        <view
          v-if="isListenMode"
          class="listen-overlay"
          @tap.stop="onContainerTap"
        >
          <text class="listen-icon">🎧</text>
          <text class="listen-text">听视频模式</text>
          <text class="listen-sub-text">音频播放中，点击屏幕退出</text>
        </view>

        <!-- 左侧控制按钮 -->
        <view
          v-if="showControls && !isListenMode"
          class="side-controls left-controls"
        >
          <view class="control-btn" @tap.stop="goBack">
            <text class="btn-text">返回</text>
          </view>
          <view
            v-if="supportCasting"
            class="control-btn cast-btn"
            :class="{ 'btn-casting': isCasting }"
            @tap.stop="onCastBtnTap"
          >
            <text class="btn-icon">{{ isCasting ? '📺' : '📡' }}</text>
            <text class="btn-sub-text">{{
              isCasting ? '投屏中' : '投屏'
            }}</text>
          </view>
        </view>

        <!-- 自定义进度条 -->
        <view
          v-if="!isListenMode && (showControls || isProgressDragging)"
          class="progress-bar"
        >
          <view class="progress-bar__mask" />
          <view class="progress-bar__content">
            <text class="progress-bar__time progress-bar__time--current">{{
              formatTime(isProgressDragging ? dragTime : currentTime)
            }}</text>
            <view
              class="progress-bar__track"
              @tap.stop="onProgressTrackTap"
              @touchstart.stop="onProgressTouchStart"
              @touchmove.stop.prevent="onProgressTouchMove"
              @touchend.stop="onProgressTouchEnd"
            >
              <view class="progress-bar__bg" />
              <view
                class="progress-bar__fill"
                :class="{ 'progress-bar__fill--dragging': isProgressDragging }"
                :style="{ width: progressPercent + '%' }"
              />
              <view
                class="progress-bar__thumb"
                :class="{ 'progress-bar__thumb--active': isProgressDragging }"
                :style="{ left: progressPercent + '%' }"
              />
            </view>
            <text class="progress-bar__time progress-bar__time--total">{{
              formatTime(duration)
            }}</text>
          </view>
        </view>

        <!-- 右侧控制按钮 -->
        <view
          v-if="showControls && !isListenMode"
          class="side-controls right-controls"
        >
          <view class="control-btn menu-btn" @tap.stop="togglePlaylist">
            <text class="btn-icon">☰</text>
          </view>
          <view class="control-btn speed-btn" @tap.stop="toggleSpeedPanel">
            <text class="btn-text">{{ playbackRate }}x</text>
            <text class="btn-sub-text">倍速</text>
          </view>
          <view class="control-btn listen-btn" @tap.stop="toggleListenMode">
            <text class="btn-icon">🎧</text>
            <text class="btn-sub-text">听视频</text>
          </view>
        </view>
      </view>

      <!-- 视频列表面板 -->
      <view
        v-if="showPlaylist"
        class="playlist-panel"
        @tap.stop
        @touchstart="onPlaylistTouchStart"
        @touchmove="onPlaylistTouchMove"
        @touchend="onPlaylistTouchEnd"
      >
        <view class="playlist-header playlist-header-bar">
          <view class="playlist-grip" />
        </view>
        <scroll-view
          scroll-y
          class="playlist-scroll"
          :show-scrollbar="false"
          :enhanced="true"
          :bounces="true"
          :scroll-into-view="playlistScrollTarget"
        >
          <view
            v-for="(item, index) in videoList"
            :key="index"
            :id="'pl-item-' + index"
            class="playlist-item"
            :class="{
              'playlist-item-active': index === currentIndex,
              'playlist-item-finished': item.isFinish,
            }"
            @tap.stop="switchVideo(index)"
          >
            <text class="playlist-item-text">{{ item.title }}</text>
          </view>
          <view class="playlist-footer">
            <text class="playlist-footer-text">更多内容持续更新中</text>
            <text class="playlist-footer-link" @tap.stop="onOpenContact"
              >👉联系我们催更</text
            >
          </view>
        </scroll-view>
      </view>

      <!-- 播放模式切换开关（左侧视频区域） -->
      <view v-if="showPlaylist" class="play-mode-switch" @tap.stop>
        <text class="play-mode-label">{{
          autoPlayNext ? '自动下一集' : '循环当前集'
        }}</text>
        <switch
          class="play-mode-toggle"
          :checked="autoPlayNext"
          @change="onAutoPlayNextChange"
          color="var(--theme-end)"
        />
      </view>

      <!-- 倍速选择面板 -->
      <view
        v-if="showSpeedPanel"
        class="speed-mask"
        @tap.stop="toggleSpeedPanel"
      >
        <view class="speed-panel" @tap.stop>
          <text class="speed-title">播放速度</text>
          <view class="speed-grid">
            <view
              v-for="speed in speedOptions"
              :key="speed"
              class="speed-item"
              :class="{ 'speed-active': playbackRate === speed }"
              @tap.stop="setSpeed(speed)"
            >
              <text class="speed-text">{{ speed }}x</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 联系我们弹框 -->
      <VipDialog
        :visible="showContactDialog"
        :qrcode-url="contactQrcodeUrl"
        title="联系我们"
        subtitle="添加老师微信，催更更多内容"
        confirm-text="长按识别添加老师"
        @update:visible="showContactDialog = $event"
        @close="showContactDialog = false"
      />
    </view>

    <!-- apptoken 无值时使用原生 video（common-video 组件） -->
    <CommonVideo
      v-else
      :video-list="videoList"
      :initial-index="initialIndex"
      :paused="isPlayBlocked"
      @change="onCommonChange"
      @ended="onCommonEnded"
      @blocked="onCommonBlocked"
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

    <!-- 家长验证算术弹框（观看时长到达） -->
    <GuardDialog
      :visible="showGuardDialog"
      @success="onGuardSuccess"
      @close="onGuardClose"
    />
  </view>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onBeforeUnmount,
  getCurrentInstance,
  nextTick,
} from 'vue'
import {
  onShareAppMessage,
  onShareTimeline,
  onLoad,
  onShow,
  onHide,
} from '@dcloudio/uni-app'
import { guardedOnLoad, ensureAuth } from '@/utils/auth-guard'
import FreeDialog from '@/components/free-dialog.vue'
import SuccessDialog from '@/components/success-dialog.vue'
import VipDialog from '@/components/vip-dialog.vue'
import CommonVideo from '@/components/common-video.vue'
import GuardDialog from '@/components/guard-dialog.vue'
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
import {
  onTimeUp,
  offTimeUp,
  resetWatchTimer,
  startWatchTimer,
  isWatchBlocked,
  setWatchBlocked,
  clearWatchBlocked,
} from '@/utils/watch-timer'

const { themeVars } = useTheme()
const AppToken = ref('0UMjhze9Y39699Jc/hovtjUz1yJsnVjw3j5Tew1LBvQ=')
/** 视频项接口 */
interface VideoItem {
  title: string
  url: string
  id?: number | string
  isFinish?: boolean
}

const speedOptions = [0.5, 0.8, 1, 1.25, 1.5, 2]
/** 腾讯云点播 AppToken：取登录接口返回值，有值走 m-video 插件，无值走原生 video */
const apptoken = ref(uni.getStorageSync('app_token') || '')
/** 进度记录项 */
interface ProgressRecord {
  videoId: string
  time: number
  updatedAt: number
}

/** 最多保留 10 条进度记录 */
const MAX_PROGRESS_RECORDS = 10

/** 播放进度存储 key 前缀（userId 拼接） */
const PROGRESS_STORAGE_PREFIX = 'video_play_progress_'

/** 获取当前用户的进度存储 key */
function getProgressStorageKey(): string {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo?.userId || 'anonymous'
  return `${PROGRESS_STORAGE_PREFIX}${userId}`
}

/** 读取当前用户的全部进度记录 */
function loadProgressList(): ProgressRecord[] {
  try {
    const stored = uni.getStorageSync(getProgressStorageKey())
    if (!stored) return []
    const list = JSON.parse(stored) as ProgressRecord[]
    if (Array.isArray(list)) return list
    // 兼容旧格式：单条记录 { videoId, time }
    if (list && (list as any).videoId) {
      return [
        {
          videoId: (list as any).videoId,
          time: (list as any).time,
          updatedAt: Date.now(),
        },
      ]
    }
    return []
  } catch (_e) {
    return []
  }
}

/** 持久化进度记录列表 */
function saveProgressList(list: ProgressRecord[]) {
  try {
    uni.setStorageSync(getProgressStorageKey(), JSON.stringify(list))
  } catch (_e) {
    console.error('[progress] 持久化进度失败')
  }
}

const playbackRate = ref(1)
const duration = ref(0)
const currentTime = ref(0)
const currentIndex = ref(0)
const showPlaylist = ref(false)
const playlistScrollTarget = ref('')
let playlistTouchStartX = 0
let playlistTouchStartY = 0
const rawVideoList = ref<VideoApiItem[]>([])
const videoList = ref<VideoItem[]>([])
const initialIndex = ref(0)

const autoPlayNext = ref(true) // true=自动下一集, false=循环当前集
const showControls = ref(true)
let controlsTimer: ReturnType<typeof setTimeout> | null = null
const showSpeedPanel = ref(false)
const isListenMode = ref(false)
const isPlaying = ref(false)
const showCenterBtn = ref(false)
let centerBtnTimer: ReturnType<typeof setTimeout> | null = null
const isCasting = ref(false)
const supportCasting = ref(false)
/** 切集期间忽略投屏断开事件，避免 isCasting 被误清 */
let switchingVideo = false
/** 投屏保护时间戳（不受 onPlay 重置影响） */
let castingProtectUntil = 0
const showDevToolsTip = ref(false)
const centerBounceKey = ref(0)
// 全屏相关已移除

const isProgressDragging = ref(false)
const dragTime = ref(0)
let progressTouchStartX = 0
let progressTouchStartPercent = 0
/** 节流保存进度的时间戳（每 5 秒保存一次） */
let lastProgressSaveTime = 0

// 自动切集相关
let autoNextTriggered = false // 防止同一视频重复触发 triggerAutoNext
let autoNextFromIndex = -1 // 记录触发自动下一集的视频索引，拦截旧事件
let autoNextTimer: ReturnType<typeof setInterval> | null = null // 轮询定时器
let skipProgressRestore = false // 自动切集时跳过进度恢复，让下一集从 0 开始
let switchCooldownUntil = 0 // 切集冷却时间戳，期间忽略旧组件的延迟事件
let screenWidth = 375
try {
  screenWidth = uni.getSystemInfoSync().screenWidth
} catch (_e) {}

const currentVideo = computed(() => {
  if (
    videoList.value.length > 0 &&
    currentIndex.value < videoList.value.length
  ) {
    return videoList.value[currentIndex.value]
  }
  return { title: '', url: '', id: undefined, isFinish: false }
})
const currentTypeId = ref<number | undefined>(undefined)
const courseCover = ref('')
let hasExplicitIndex = false
const showNoTimesDialog = ref(false)
const timesExhausted = ref(false)

const showFreeDialog = ref(false)
const freeName = ref('')
const freeTextContent = ref('')
const freeQrcodeUrl = ref('')
const remainCount = ref(0)

const showSuccessDialog = ref(false)
const showContactDialog = ref(false)
const contactQrcodeUrl = ref('')

// 家长验证弹框（观看时长到达）
const showGuardDialog = ref(false)

const QRCODE_INDEX_KEY = 'free_qrcode_index'

const isPlayBlocked = computed(
  () =>
    timesExhausted.value ||
    showNoTimesDialog.value ||
    showFreeDialog.value ||
    showGuardDialog.value,
)

/** 从 storage 读取指定视频的保存进度 */
function getSavedProgressTime(): number {
  const videoKey = getCurrentVideoKey()
  if (!videoKey) return 0
  const list = loadProgressList()
  const record = list.find((r) => r.videoId === videoKey)
  return record && record.time > 0 ? record.time : 0
}

let videoContext: any = null
const { proxy } = getCurrentInstance() as any

/** 获取视频插件实例，若已失效则重新获取 */
function initVideoContext(): any {
  if (videoContext) return videoContext
  try {
    videoContext = proxy.selectComponent('#refVideo')
    console.log('videoContext', videoContext)
  } catch (_e) {
    videoContext = null
  }
  return videoContext
}

/**
 * 重试暂停视频（兼容部分机型插件组件延迟就绪，onLoad 时 pause 无效的情况）
 * 最多重试 10 次，每次间隔 300ms，确保视频不会在受限期间播放
 */
function pauseVideoWithRetry(attempt = 0) {
  if (!isPlayBlocked.value) return // 已解除受限，无需继续暂停
  try {
    videoContext = null
    const ctx = initVideoContext()
    if (ctx && ctx.video) {
      ctx.video.pause()
      return // 暂停成功
    }
  } catch (_e) {}
  // 实例未就绪，延迟重试
  if (attempt < 10) {
    setTimeout(() => pauseVideoWithRetry(attempt + 1), 300)
  }
}

onLoad(async () => {
  initVideoContext()
  startControlsTimer()
  checkCastingSupport()
  checkDevTools()
  // 防沉迷：注册时间到达回调（无论是否受限都需注册，答对后重新计时仍可能再次触发）
  onTimeUp(() => {
    // 时间到：标记受限、暂停视频并弹出家长验证弹框
    setWatchBlocked()
    showGuardDialog.value = true
    try {
      const ctx = initVideoContext()
      ctx?.video?.pause()
    } catch (_e) {}
  })
  if (isWatchBlocked()) {
    // 仍受限：立即弹出家长验证弹框，禁止播放
    showGuardDialog.value = true
    pauseVideoWithRetry()
  } else {
    // 未受限：进入视频页重新开始计时
    startWatchTimer()
  }
  await ensureAuth()
  // 鉴权完成后刷新 appToken（首次登录时 setup 阶段 storage 可能还为空）
  apptoken.value = uni.getStorageSync('app_token') || ''
  loadContactQrcode()
  // preloadAll()
})

onBeforeUnmount(() => {
  clearControlsTimer()
  stopAutoNextPolling()
  saveProgress()
  offTimeUp()
  // 离开视频页（返回主页等）时重置计时，防沉迷弹框仅在视频页生效
  resetWatchTimer()
  if (isListenMode.value) {
    try {
      videoContext?.video?.exitBackgroundPlayback()
    } catch (_e) {
      /* 静默忽略 */
    }
  }
})

/** 锁屏/切后台前记住投屏状态 */
let wasCastingBeforeHide = false
onHide(() => {
  wasCastingBeforeHide = isCasting.value
  console.log('[casting] onHide wasCasting:', wasCastingBeforeHide)
})

/** 从锁屏/后台返回时自动重新投屏 */
onShow(() => {
  if (wasCastingBeforeHide && !isCasting.value) {
    console.log('[casting] onShow 自动重新投屏')
    wasCastingBeforeHide = false
    setTimeout(() => {
      const ctx = initVideoContext()
      const video = ctx && ctx.video
      if (video) {
        autoResumeCasting(video)
      }
    }, 1000)
  }
  wasCastingBeforeHide = false
})

function syncVideoList() {
  videoList.value = rawVideoList.value.map((item) => ({
    id: item.id,
    title: item.name,
    url: item.url,
    isFinish: !!item.isFinish,
  }))
}

/** 读取用户最近观看的视频 ID（用于定位初始视频） */
function getRememberedVideoId(): string | null {
  const list = loadProgressList()
  if (!list.length) return null
  const latest = list.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b))
  return latest && latest.time > 0 ? String(latest.videoId) : null
}

async function fetchVideoList(typeId: number) {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo?.userId
  try {
    const data = await getVideoList(typeId, userId)
    if (data && data.length) {
      rawVideoList.value = data
      syncVideoList()
      if (!hasExplicitIndex) {
        const rememberedId = getRememberedVideoId()
        if (rememberedId) {
          const memIdx = data.findIndex(
            (item) => String(item.id) === rememberedId,
          )
          if (memIdx >= 0) {
            initialIndex.value = memIdx
            currentIndex.value = memIdx
          }
        }
        if (initialIndex.value === 0) {
          const firstUnfinished = data.findIndex((item) => !item.isFinish)
          const idx = firstUnfinished >= 0 ? firstUnfinished : 0
          initialIndex.value = idx
          currentIndex.value = idx
        }
      }
    }
  } catch (err) {
    console.error('获取视频列表失败:', err)
  }
}

async function handleShareBind(bindUserId: string | number) {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const currentUserId = userInfo && userInfo.userId
  if (!currentUserId) return
  if (String(currentUserId) === String(bindUserId)) return
  try {
    await bindUser(currentUserId, bindUserId)
  } catch (e) {
    console.error('绑定分享用户失败:', e)
  }
}

guardedOnLoad((query) => {
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
  if (query?.index != null && query.index !== '') {
    const idx = Number(query.index)
    if (Number.isFinite(idx) && idx > 0) {
      hasExplicitIndex = true
      initialIndex.value = idx
      currentIndex.value = idx
    }
  }
  if (query?.typeId) {
    const typeId = Number(query.typeId)
    currentTypeId.value = typeId
    fetchVideoList(typeId)
  }
  if (query && query.userId) {
    handleShareBind(query.userId)
  }
  const userInfo0 = uni.getStorageSync('wx_user_info') as any
  if (userInfo0 && (userInfo0.vip === false || userInfo0.vipType === 0)) {
    remainCount.value = Number(userInfo0.freeViewRemain) || 0
    fetchFreeQrcode()
  }
  doDeduct()
  fetchShareConfig()
  courseCover.value = uni.getStorageSync('video_course_cover') || ''
})

function onLoadedMetadata(e: any) {
  const d = e?.detail?.detail ?? e
  if (!d) return
  const dur = d.duration
  if (dur > 0) duration.value = dur
}

function onTimeUpdate(e: any) {
  const d = e?.detail?.detail ?? e
  if (!d) return
  const dur = Number(
    d.duration ?? d.totalTime ?? d.videoDuration ?? d.total ?? d.data?.duration,
  )
  if (!isNaN(dur) && dur > 0) duration.value = dur
  // 拖拽期间跳过更新，避免与拖拽计算值冲突导致进度条抖动
  if (isProgressDragging.value) return
  const cur = Number(
    d.currentTime ?? d.position ?? d.currentPosition ?? d.data?.currentTime,
  )
  if (!isNaN(cur) && cur >= 0) currentTime.value = cur

  // 接近结尾时自动下一集（兜底：防止 ended 事件不触发）
  if (Date.now() < switchCooldownUntil || autoNextTriggered) return
  if (
    dur > 5 &&
    cur > 1 &&
    dur - cur < 2 &&
    (autoNextFromIndex < 0 || autoNextFromIndex === currentIndex.value)
  ) {
    triggerAutoNext()
  }
}

function onVideoError(e: any) {
  console.warn('[video] error:', e.detail)
  try {
    const systemInfo = uni.getSystemInfoSync()
    if ((systemInfo as any).platform === 'devtools') {
      showDevToolsTip.value = true
    }
  } catch (_e) {}
}

async function doDeduct() {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo?.userId
  if (!userId) return
  if (userInfo?.vip === true && Number(userInfo?.vipType) > 0) return
  if (userInfo.freeViewRemain != null && userInfo.freeViewRemain <= 0) {
    timesExhausted.value = true
    showNoTimesDialog.value = true
    return
  }
  try {
    await deductUserTimes(userId)
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

function onDialogCancel() {
  showNoTimesDialog.value = false
  uni.reLaunch({ url: '/pages/index/index' })
}

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

function onDialogConfirm() {
  showNoTimesDialog.value = false
  showFreeDialog.value = true
}

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
    timesExhausted.value = false
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

// ==================== 控件交互 ====================

function startControlsTimer() {
  clearControlsTimer()
  controlsTimer = setTimeout(() => {
    if (
      !showPlaylist.value &&
      !showSpeedPanel.value &&
      !isProgressDragging.value
    ) {
      showControls.value = false
    }
  }, 4000)
}

function clearControlsTimer() {
  if (controlsTimer) {
    clearTimeout(controlsTimer)
    controlsTimer = null
  }
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00'
  const s = Math.floor(seconds)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const progressPercent = computed(() => {
  if (!duration.value || duration.value <= 0) return 0
  const t = isProgressDragging.value ? dragTime.value : currentTime.value
  return Math.min((t / duration.value) * 100, 100)
})

const PROGRESS_MARGIN_VW = 2.4

function onProgressTrackTap(e: any) {
  const clientX = e.touches?.[0]?.clientX ?? e.detail?.x ?? 0
  const trackWidthPx =
    screenWidth - (PROGRESS_MARGIN_VW * 2 * screenWidth) / 100
  const marginLeftPx = (PROGRESS_MARGIN_VW * screenWidth) / 100
  const offsetX = clientX - marginLeftPx
  const percent = Math.max(0, Math.min(1, offsetX / trackWidthPx))
  seekTo(percent * duration.value)
}

function onProgressTouchStart(e: any) {
  isProgressDragging.value = true
  dragTime.value = currentTime.value
  clearControlsTimer()
  const touch = e.touches[0]
  progressTouchStartX = touch.clientX
  progressTouchStartPercent = progressPercent.value
}

function onProgressTouchMove(e: any) {
  if (!isProgressDragging.value) return
  const touch = e.touches[0]
  const deltaX = touch.clientX - progressTouchStartX
  const trackWidthPx =
    screenWidth - (PROGRESS_MARGIN_VW * 2 * screenWidth) / 100
  const deltaPercent = (deltaX / trackWidthPx) * 100
  const newPercent = Math.max(
    0,
    Math.min(100, progressTouchStartPercent + deltaPercent),
  )
  dragTime.value = (newPercent / 100) * duration.value
}

function onProgressTouchEnd() {
  if (!isProgressDragging.value) return
  seekTo(dragTime.value)
  currentTime.value = dragTime.value
  isProgressDragging.value = false
  startControlsTimer()
}

function seekTo(time: number) {
  try {
    console.log('[seek] time:', time)
    const ctx = initVideoContext()
    ctx?.video?.seek(time)
  } catch (_e) {
    console.warn('[seek] 调用失败:', _e)
  }
  currentTime.value = time
}

function onContainerTap() {
  if (showPlaylist.value) {
    togglePlaylist()
    return
  }
  if (showSpeedPanel.value) {
    showSpeedPanel.value = false
    return
  }
  if (isListenMode.value) {
    isListenMode.value = false
    try {
      const ctx = initVideoContext()
      if (ctx && ctx.video) ctx.video.exitBackgroundPlayback()
    } catch (_e) {}
    startControlsTimer()
    return
  }
  showControls.value = !showControls.value
  if (showControls.value) startControlsTimer()
}

function onCenterBtnTap() {
  togglePlayPause()
  if (showControls.value) startControlsTimer()
  // 递增 key 强制重建元素，触发 CSS 弹跳动画
  centerBounceKey.value++
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length <= 1) {
    uni.reLaunch({ url: '/pages/index/index' })
  } else {
    uni.navigateBack()
  }
}

/** 家长验证答对：解除受限、关闭弹框、重置计时、继续播放 */
function onGuardSuccess() {
  clearWatchBlocked()
  showGuardDialog.value = false
  resetWatchTimer()
  startWatchTimer()
  try {
    const ctx = initVideoContext()
    ctx?.video?.play()
  } catch (_e) {}
}

/** 家长验证弹框关闭（未答对）：不重置时间，仍不能观看，返回上一页 */
function onGuardClose() {
  showGuardDialog.value = false
  goBack()
}

function togglePlaylist() {
  showPlaylist.value = !showPlaylist.value
  showSpeedPanel.value = false
  if (showPlaylist.value) {
    playlistScrollTarget.value = `pl-item-${currentIndex.value}`
    clearControlsTimer()
    showControls.value = false
  } else {
    showControls.value = true
    startControlsTimer()
  }
}

function toggleSpeedPanel() {
  showSpeedPanel.value = !showSpeedPanel.value
  if (showSpeedPanel.value) {
    clearControlsTimer()
  } else {
    startControlsTimer()
  }
}

function toggleListenMode() {
  isListenMode.value = !isListenMode.value
  showControls.value = false
  if (isListenMode.value) {
    clearControlsTimer()
    const listenCtx = initVideoContext() && videoContext.video
    if (listenCtx && !isPlaying.value) {
      try {
        listenCtx.play()
      } catch (_e) {}
    }
    if (listenCtx) {
      try {
        listenCtx.requestBackgroundPlayback()
      } catch (_e) {}
    }
  } else {
    const exitCtx = initVideoContext() && videoContext.video
    if (exitCtx) {
      try {
        exitCtx.exitBackgroundPlayback()
      } catch (_e) {}
    }
    startControlsTimer()
  }
}

function setSpeed(speed: number) {
  if (speed === playbackRate.value) {
    showSpeedPanel.value = false
    startControlsTimer()
    return
  }
  playbackRate.value = speed
  const rateCtx = initVideoContext()
  if (rateCtx) rateCtx.playbackRate(speed)
  showSpeedPanel.value = false
  startControlsTimer()
}

// ==================== 播放控制 ====================

function stopAutoNextPolling() {
  if (autoNextTimer) {
    clearInterval(autoNextTimer)
    autoNextTimer = null
  }
}

function startAutoNextPolling() {
  stopAutoNextPolling()
  autoNextTimer = setInterval(() => {
    if (Date.now() < switchCooldownUntil) return // 冷却期内等待
    if (autoNextTriggered) {
      stopAutoNextPolling()
      return
    }
    const dur = duration.value
    const cur = currentTime.value
    if (
      dur > 5 &&
      cur > 1 &&
      dur - cur < 2 &&
      (autoNextFromIndex < 0 || autoNextFromIndex === currentIndex.value)
    ) {
      triggerAutoNext()
      stopAutoNextPolling()
    }
  }, 1000)
}

function onAutoPlayNextChange(e: any) {
  autoPlayNext.value = !!e.detail.value
}

/** 模拟 tap 点击视频区域，唤醒 m-video 插件重连投屏设备 */
function simulateTapForCastingReconnect() {
  try {
    const query = uni.createSelectorQuery()
    query
      .select('.video-player')
      .boundingClientRect((rect: any) => {
        if (!rect) {
          console.warn('[casting] 模拟tap: 未获取到视频区域')
          return
        }
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        console.log('[casting] 模拟tap点击:', x, y)
        // #ifdef MP-WEIXIN
        // 通过 wx 内部接口模拟触摸事件，唤醒插件投屏 UI
        const pages = getCurrentPages()
        const page = pages[pages.length - 1] as any
        if (page && page.$vm) {
          const evt = {
            type: 'tap',
            detail: { x, y },
            touches: [{ clientX: x, clientY: y, pageX: x, pageY: y }],
            changedTouches: [{ clientX: x, clientY: y, pageX: x, pageY: y }],
            timeStamp: Date.now(),
            target: { id: 'refVideo', dataset: {} },
            currentTarget: { id: 'refVideo', dataset: {} },
          }
          // 直接触发 m-video 组件上的 tap
          try {
            const comp = page.$vm.$refs?.refVideo
            if (comp && comp.$emit) {
              comp.$emit('tap', evt)
              console.log('[casting] 模拟tap: 已通过 $emit 触发')
            }
          } catch (_e) {}
        }
        // #endif
      })
      .exec()
  } catch (e) {
    console.warn('[casting] 模拟tap异常:', e)
  }
}

function triggerAutoNext() {
  if (autoNextTriggered) return
  console.log(
    '[autoNext] triggerAutoNext from index:',
    currentIndex.value,
    'autoPlayNext:',
    autoPlayNext.value,
  )
  autoNextTriggered = true
  autoNextFromIndex = currentIndex.value
  if (autoPlayNext.value) {
    // 自动播放下一集
    const nextIndex = currentIndex.value + 1
    if (nextIndex < videoList.value.length) {
      // 投屏中：先模拟 tap 点击唤醒插件重连投屏设备
      const wasCastingBeforeSwitch = isCasting.value
      if (wasCastingBeforeSwitch) {
        console.log('[casting] 自动切集前模拟tap重连投屏')
        simulateTapForCastingReconnect()
      }
      isPlaying.value = false
      currentTime.value = 0
      clearProgressForCurrentVideo()
      skipProgressRestore = true
      console.log('[autoNext] switching to next index:', nextIndex)
      reportWatchFinished(currentIndex.value)
      switchVideo(nextIndex, true)
    }
  } else {
    // 循环播放当前集：seek 回起点重新播放
    autoNextTriggered = false
    autoNextFromIndex = -1
    currentTime.value = 0
    const ctx = initVideoContext()
    const video = ctx && ctx.video
    if (video) {
      try {
        video.seek(0)
        video.play()
      } catch (_e) {}
    }
  }
}

function onPlay() {
  if (isPlayBlocked.value) {
    // 兼容部分机型：强制重新获取实例后暂停
    try {
      videoContext = null
      const ctx = initVideoContext()
      ctx?.video?.pause()
    } catch (_e) {}
    // 防沉迷弹框期间仅暂停，不弹免费弹框
    if (!showGuardDialog.value) {
      onPlayBlocked()
    }
    return
  }
  isPlaying.value = true
  // 新视频已开始播放，切集结束
  switchingVideo = false
  // 新视频开始播放后，清除旧视频的 ended 拦截标记
  autoNextFromIndex = -1
  flashCenterBtn()
  startAutoNextPolling()
  // 安全兜底：8 秒后检查视频是否正常加载，异常时重试播放
  const checkIndex = currentIndex.value
  setTimeout(() => {
    if (currentIndex.value !== checkIndex) return // 已切到别的视频
    if (isPlayBlocked.value) return // 受限期间不重试播放
    if (duration.value > 0) return // 视频正常加载
    console.warn('[video] 视频 8s 未加载，重试播放')
    videoContext = null
    const ctx = initVideoContext()
    const video = ctx && ctx.video
    if (video) {
      try {
        video.play()
      } catch (_e) {}
    }
  }, 8000)
  // 投屏时启用后台音频，锁屏后尽量保持进程活跃以维持投屏连接
  // 注意：requestBackgroundPlayback 与投屏可能冲突，仅在非投屏时使用
  if (!isCasting.value && isListenMode.value) {
    try {
      const ctx = initVideoContext()
      ctx?.video?.requestBackgroundPlayback()
    } catch (_e) {}
  }
  // 投屏状态下，视频开始播放后延迟重新投屏（确保视频已稳定）
  if (isCasting.value) {
    setTimeout(() => {
      const ctx = initVideoContext()
      if (ctx?.video) autoResumeCasting(ctx.video)
    }, 2000)
  }
  if (playbackRate.value !== 1) {
    setTimeout(() => {
      const ctx = initVideoContext()
      if (ctx) ctx.playbackRate(playbackRate.value)
    }, 100)
  }
}

function onPause() {
  isPlaying.value = false
  flashCenterBtn()
  stopAutoNextPolling()
  saveProgress()
  // 非听视频模式下，投屏暂停时释放后台音频
  if (!isListenMode.value && isCasting.value) {
    try {
      const ctx = initVideoContext()
      ctx?.video?.exitBackgroundPlayback()
    } catch (_e) {}
  }
}

function togglePlayPause() {
  if (isPlayBlocked.value) {
    // 防沉迷弹框期间忽略播放操作
    if (!showGuardDialog.value) {
      onPlayBlocked()
    }
    return
  }
  const ctx = initVideoContext()
  const video = ctx && ctx.video
  if (!video) return
  try {
    if (isPlaying.value) {
      video.pause()
    } else {
      video.play()
    }
  } catch (_e) {}
  startControlsTimer()
}

function flashCenterBtn() {
  showCenterBtn.value = true
  if (centerBtnTimer) clearTimeout(centerBtnTimer)
  centerBtnTimer = setTimeout(() => {
    showCenterBtn.value = false
  }, 1500)
}

function switchVideo(index: number, fromAutoNext = false) {
  if (index === currentIndex.value) return
  if (isPlayBlocked.value) {
    // 防沉迷弹框期间忽略切集操作
    if (!showGuardDialog.value) {
      onPlayBlocked()
    }
    return
  }
  switchingVideo = true
  // 投屏保护 3 秒（独立于 switchingVideo，不受 onPlay 提前重置）
  castingProtectUntil = Date.now() + 3000
  // 安全超时：如果 onPlay 未触发，自动重置标记
  setTimeout(() => {
    switchingVideo = false
  }, 10000)
  saveProgress()
  stopAutoNextPolling()
  autoNextTriggered = false
  // 设置 3 秒冷却，防止旧组件销毁期间的延迟事件误触发自动切集
  switchCooldownUntil = Date.now() + 3000
  // 手动切集时清除旧 ended 拦截标记，并恢复进度恢复能力
  if (!fromAutoNext) {
    autoNextFromIndex = -1
    skipProgressRestore = false
  }
  currentIndex.value = index
  currentTime.value = 0
  duration.value = 0
  playlistScrollTarget.value = `pl-item-${index}`
  onChange(index)
  videoContext = null
}

function onPlaylistTouchStart(e: any) {
  const touch = e.touches[0]
  playlistTouchStartX = touch.clientX
  playlistTouchStartY = touch.clientY
}

function onPlaylistTouchMove(_e: any) {}

function onPlaylistTouchEnd(e: any) {
  const touch = e.changedTouches[0]
  const deltaX = touch.clientX - playlistTouchStartX
  const deltaY = Math.abs(touch.clientY - playlistTouchStartY)
  if (deltaX > 60 && deltaX > deltaY) togglePlaylist()
}

// ==================== 投屏 ====================

function onCastBtnTap() {
  const ctx = initVideoContext()
  const video = ctx && ctx.video
  if (!video) {
    uni.showToast({ title: '播放器未就绪', icon: 'none' })
    return
  }
  try {
    if (isCasting.value) {
      video.exitCasting()
    } else {
      video.startCasting()
    }
  } catch (_e) {
    uni.showToast({ title: '当前环境不支持投屏', icon: 'none' })
  }
}

function onCastingUserSelect(e: any) {
  console.log('[casting] 用户选择设备:', e.detail)
}

function onCastingStateChange(e: any) {
  console.log('[casting] 状态变化:', e.detail)
  const state = e.detail?.state
  // 切集保护期内忽略断开状态变化，保留 isCasting 以便自动重新投屏
  if (
    Date.now() < castingProtectUntil &&
    (state === 'disconnected' || state === 'none')
  ) {
    console.log('[casting] 保护期内忽略 disconnected 状态')
    return
  }
  if (state === 'connecting' || state === 'connected') {
    isCasting.value = true
  } else if (state === 'disconnected' || state === 'none') {
    isCasting.value = false
  }
}

function onCastingInterrupt(e: any) {
  // 切集保护期内的断开事件是组件重建导致的，忽略它
  if (Date.now() < castingProtectUntil) {
    console.log('[casting] 保护期内忽略 castinginterrupt')
    return
  }
  isCasting.value = false
  uni.showToast({ title: '投屏已断开', icon: 'none' })
}

/** 切集后自动重新投屏（延迟确保视频已就绪） */
function autoResumeCasting(video: any, attempt = 0) {
  if (!isCasting.value) return
  try {
    video.startCasting()
    console.log('[casting] 自动重新投屏成功, attempt:', attempt)
  } catch (e: any) {
    console.warn('[casting] startCasting 异常:', e?.message || e)
    if (attempt < 8) {
      setTimeout(() => autoResumeCasting(video, attempt + 1), 1500)
    } else {
      console.warn('[casting] 自动重新投屏失败，已达最大重试')
    }
  }
}

// 全屏相关已移除

// ==================== 进度记忆 ====================

function getCurrentVideoKey(): string {
  const v = currentVideo.value
  return v.id != null ? String(v.id) : v.url || ''
}

function saveProgress() {
  const videoKey = getCurrentVideoKey()
  if (!videoKey || currentTime.value <= 0) return
  const list = loadProgressList()
  const filtered = list.filter((r) => r.videoId !== videoKey)
  filtered.unshift({
    videoId: videoKey,
    time: currentTime.value,
    updatedAt: Date.now(),
  })
  const trimmed = filtered.slice(0, MAX_PROGRESS_RECORDS)
  saveProgressList(trimmed)
}

function clearProgressForCurrentVideo() {
  const videoKey = getCurrentVideoKey()
  if (!videoKey) return
  const list = loadProgressList()
  const filtered = list.filter((r) => r.videoId !== videoKey)
  saveProgressList(filtered)
}

// ==================== 联系我们 ====================

function onOpenContact() {
  showContactDialog.value = true
}

async function loadContactQrcode() {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  if (!userInfo || !userInfo.userId) return
  try {
    const list = await getQrcodeListByType(2)
    if (list && list.length > 0 && list[0].images?.length > 0) {
      contactQrcodeUrl.value = list[0].images[0].imageUrl
    }
  } catch (e) {
    console.error('获取联系我们二维码失败:', e)
  }
}

// ==================== 辅助功能 ====================

function onPlayBlocked() {
  showFreeDialog.value = true
}
function onChange(index: number) {
  doDeduct()
}

// ==================== common-video 事件 ====================

function onCommonChange(index: number) {
  currentIndex.value = index
  doDeduct()
}

function onCommonEnded(index: number) {
  reportWatchFinished(index)
}

function onCommonBlocked() {
  showFreeDialog.value = true
}

function checkCastingSupport() {
  // #ifdef MP-WEIXIN
  try {
    const systemInfo = uni.getSystemInfoSync()
    const isHarmony =
      systemInfo.platform === 'harmony' ||
      (systemInfo as any).hostName?.includes('harmony')
    supportCasting.value = !isHarmony
  } catch (_e) {
    supportCasting.value = false
  }
  // #endif
}

function checkDevTools() {
  try {
    const systemInfo = uni.getSystemInfoSync()
    if ((systemInfo as any).platform === 'devtools') {
      setTimeout(() => {
        if (!isPlaying.value) showDevToolsTip.value = true
      }, 3000)
    }
  } catch (_e) {}
}

function preloadAll() {
  // #ifdef MP-WEIXIN
  const seen = new Set<string>()
  videoList.value.forEach((item, idx) => {
    if (idx === currentIndex.value || seen.has(item.url)) return
    seen.add(item.url)
    try {
      ;(wx as any).preloadMedia({
        sources: [{ url: item.url, type: 'video' }],
        success: () => {},
        fail: () => {},
      })
    } catch (_e) {}
  })
  // #endif
}

async function reportWatchFinished(index: number) {
  const item = rawVideoList.value[index]
  if (!item || item.isFinish) return
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo?.userId
  if (!userId) return
  try {
    await reportWatchFinish({
      userId,
      videoId: item.id,
      ...(currentTypeId.value ? { typeId: currentTypeId.value } : {}),
    })
    item.isFinish = true
    if (videoList.value[index])
      videoList.value[index] = { ...videoList.value[index], isFinish: true }
  } catch (err) {
    console.error('视频观看完成上报失败:', err)
  }
}

function onEnded() {
  // 冷却期内忽略（旧组件销毁延迟导致的 ended 事件）
  if (Date.now() < switchCooldownUntil) return
  // 拦截旧视频的 ended 事件（组件销毁延迟导致）
  if (autoNextFromIndex >= 0 && autoNextFromIndex !== currentIndex.value) return
  triggerAutoNext()
}

// ==================== Watchers ====================

/**
 * 监听当前视频 URL 变化：真机上 autoplay 可能不触发，
 * 这里在 URL 就绪后重试调用 play() 兜底。
 */
watch(
  () => currentVideo.value.url,
  (newUrl, oldUrl) => {
    if (!newUrl || newUrl === oldUrl) return
    videoContext = null
    let retryCount = 0
    const tryPlay = () => {
      if (isPlayBlocked.value) return
      // 强制重新获取实例，避免缓存了旧的组件引用
      videoContext = null
      const ctx = initVideoContext()
      const video = ctx && ctx.video
      if (ctx && video) {
        try {
          video.play()
          // 自动切集时跳过进度恢复，让下一集从 0 开始
          if (!skipProgressRestore) {
            const savedTime = getSavedProgressTime()
            if (savedTime > 0) {
              console.log('[watch] 恢复进度:', savedTime)
              video.seek(savedTime)
              currentTime.value = savedTime
            }
          } else {
            console.log(
              '[watch] skipProgressRestore=true，显式 seek(0)，从 0 开始',
            )
            video.seek(0)
            currentTime.value = 0
          }
          if (playbackRate.value !== 1) ctx.playbackRate(playbackRate.value)
          // 如果之前在投屏，延迟后自动重新投屏（确保视频已稳定播放）
          setTimeout(() => autoResumeCasting(video), 1500)
        } catch (_e) {
          // play 调用失败也重试
          if (retryCount < 8) {
            retryCount++
            setTimeout(tryPlay, 600)
          }
        }
      } else if (retryCount < 8) {
        retryCount++
        setTimeout(tryPlay, 600)
      }
    }
    nextTick(() => {
      setTimeout(tryPlay, 600)
    })
  },
)

// ==================== 分享 ====================

const shareConfig = ref<ShareConfig | null>(null)

async function fetchShareConfig() {
  try {
    const data = await getShareConfig()
    if (data) shareConfig.value = data
  } catch (e) {
    console.error('获取分享配置失败:', e)
  }
}

onShareAppMessage(() => {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId ? userInfo.userId : ''
  const friend = shareConfig.value?.friend
  const typeId = currentTypeId.value || ''
  const params = [
    typeId ? `typeId=${typeId}` : '',
    userId ? `userId=${userId}` : '',
  ]
    .filter(Boolean)
    .join('&')
  return {
    title: friend?.title || '宝宝星盒 - 免费儿童启蒙动画视频',
    desc: friend?.desc || '',
    path: params ? `/pages/video/index?${params}` : '/pages/video/index',
    imageUrl: courseCover.value || friend?.imageUrl || '',
  }
})

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
    title: timeline?.title || '宝宝星盒 - 免费儿童启蒙动画视频',
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
.video-container {
  width: 100%;
  height: 100%;
  margin: 0 auto;
  background-color: #000;
  display: flex;
  flex-direction: row;
  position: relative;
  overflow: hidden;
}
.video-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  transition: width 0.3s ease;
  &.video-shrink {
    width: 50%;
  }
}
.video-player {
  width: 100%;
  height: 100%;
}
.tap-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
}
.center-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
}
.center-play-circle {
  width: 9.6vw;
  height: 9.6vw;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.center-bounce-anim {
  animation: centerBounce 0.4s ease-out;
}
@keyframes centerBounce {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(0.78);
  }
  55% {
    transform: scale(1.12);
  }
  80% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}
.css-play-icon {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 1.2vw 0 1.2vw 2vw;
  border-color: transparent transparent transparent rgba(255, 255, 255, 0.85);
  margin-left: 0.4vw;
}
.css-pause-icon {
  display: flex;
  gap: 0.8vw;
}
.pause-bar {
  width: 0.6vw;
  height: 2.4vw;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 0.2vw;
}
.center-play-icon {
  font-size: 3.733vw;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1;
}
.devtools-tip {
  position: absolute;
  bottom: 12vw;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 180, 0, 0.9);
  border-radius: 1.2vw;
  padding: 1.2vw 2.4vw;
  z-index: 25;
  max-width: 80%;
}
.devtools-tip-text {
  font-size: 2vw;
  color: #333;
  text-align: center;
  white-space: nowrap;
}
.side-controls {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 1.6vw;
  gap: 1.6vw;
  height: 100%;
  z-index: 10;
}
.left-controls {
  left: 0;
}
.right-controls {
  right: 0;
  align-items: flex-end;
}
.control-btn {
  background-color: rgba(30, 50, 80, 0.85);
  padding: 1.333vw 2.4vw;
  border-radius: 0.8vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 10vw;
}
.btn-text {
  font-size: 2.4vw;
  color: #fff;
  font-weight: 500;
}
.btn-sub-text {
  font-size: 2vw;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.267vw;
}
.btn-icon {
  font-size: 3.733vw;
  color: #fff;
}
.menu-btn {
  padding: 1.067vw 2.4vw;
}
.cast-btn {
  padding: 1.067vw 2.4vw;
}
.listen-btn {
  padding: 1.067vw 2.4vw;
}
.btn-casting {
  background-color: rgba(7, 193, 96, 0.85);
}
.listen-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.listen-icon {
  font-size: 10.667vw;
  margin-bottom: 2.667vw;
}
.listen-text {
  font-size: 4.8vw;
  color: #fff;
  font-weight: bold;
  margin-bottom: 1.6vw;
}
.listen-sub-text {
  font-size: 3.2vw;
  color: rgba(255, 255, 255, 0.5);
}
.playlist-panel {
  width: 50%;
  height: 100%;
  background-color: #1a1a1a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.playlist-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 2.667vw 4vw 1.6vw;
  flex-shrink: 0;
}
.playlist-header-bar {
  position: relative;
  justify-content: flex-end;
  padding: 2vw 2.667vw 1.333vw;
}
.play-mode-switch {
  position: absolute;
  left: 2.4vw;
  top: 2.4vw;
  z-index: 15;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.2vw;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 2vw;
  padding: 1.2vw 2vw;
}
.play-mode-label {
  font-size: 1.6vw;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
}
.play-mode-toggle {
  transform: scale(0.55);
}
.playlist-grip {
  position: absolute;
  top: 1.6vw;
  left: 50%;
  transform: translateX(-50%);
  width: 8vw;
  height: 0.533vw;
  background-color: rgba(255, 255, 255, 0.35);
  border-radius: 0.533vw;
}
.playlist-scroll {
  flex: 1;
  height: 0;
  padding: 0 2.667vw;
  -webkit-overflow-scrolling: touch;
}
.playlist-item {
  padding: 2.4vw 2.667vw;
  border-bottom: 0.133vw solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1.6vw;
}
.playlist-item-active {
  .playlist-item-text {
    color: var(--theme-end);
  }
}
.playlist-item-finished {
  .playlist-item-text {
    color: rgba(255, 255, 255, 0.35);
  }
}
.playlist-item-active.playlist-item-finished {
  .playlist-item-text {
    color: var(--theme-end);
    text-decoration: none;
  }
}
.playlist-item-text {
  font-size: 1.8vw;
  color: rgba(255, 255, 255, 0.85);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.playlist-footer {
  padding: 3.2vw 2.667vw 4vw;
  display: flex;
  align-items: center;
  justify-content: center;
}
.playlist-footer-text {
  font-size: 1.6vw;
  color: rgba(255, 255, 255, 0.35);
}
.playlist-footer-link {
  font-size: 1.6vw;
  color: var(--theme-end);
  font-weight: 600;
  margin-left: 0.5vw;
}
.speed-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}
.speed-panel {
  width: 55%;
  background-color: rgba(40, 40, 40, 0.95);
  border-radius: 2.4vw;
  padding: 3.2vw 4vw 4vw;
}
.speed-title {
  font-size: 3.2vw;
  color: #fff;
  font-weight: bold;
  text-align: center;
  display: block;
  margin-bottom: 2.667vw;
}
.speed-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2vw;
}
.speed-item {
  width: ~'calc((100% - 4vw) / 3)';
  height: 9.333vw;
  background-color: rgba(20, 20, 20, 0.9);
  border-radius: 1.6vw;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.speed-active {
  background-color: var(--theme-end) !important;
}
.speed-text {
  font-size: 3.2vw;
  color: #fff;
  font-weight: 500;
}
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
  color: #333;
  margin-bottom: 1.2vw;
}
.no-times-desc {
  font-size: 1.6vw;
  color: #666;
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
  color: #666;
}
.btn-confirm {
  background: linear-gradient(135deg, #f5a0c0, var(--theme-end));
}
.btn-confirm-text {
  font-size: 1.8vw;
  font-weight: 600;
  color: #fff;
}
.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 15;
}
.progress-bar__mask {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 8vw;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent);
  pointer-events: none;
}
.progress-bar__content {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 2.4vw 2.4vw;
  gap: 1.6vw;
  z-index: 1;
}
.progress-bar__time {
  font-size: 2.4vw;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  min-width: 8vw;
  text-align: center;
  flex-shrink: 0;
}
.progress-bar__time--current {
  text-align: right;
}
.progress-bar__time--total {
  text-align: left;
}

.progress-bar__track {
  flex: 1;
  height: 2.4vw;
  position: relative;
  display: flex;
  align-items: center;
}
.progress-bar__bg {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1.2vw;
  transform: translateY(-50%);
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 0.6vw;
}
.progress-bar__fill {
  position: absolute;
  top: 50%;
  left: 0;
  height: 1.2vw;
  transform: translateY(-50%);
  background: linear-gradient(to right, var(--theme-start), var(--theme-end));
  border-radius: 0.6vw;
  transition: width 0.15s linear;
}
.progress-bar__fill--dragging {
  transition: none;
}
.progress-bar__thumb {
  position: absolute;
  top: 50%;
  width: 4vw;
  height: 4vw;
  transform: translate(-50%, -50%);
  background-color: #fff;
  border: 0.4vw solid var(--theme-end);
  border-radius: 50%;
  box-sizing: border-box;
  box-shadow: 0 0.2vw 0.8vw rgba(0, 0, 0, 0.3);
  transition:
    width 0.15s,
    height 0.15s;
}
.progress-bar__thumb--active {
  width: 5.333vw;
  height: 5.333vw;
}
</style>
