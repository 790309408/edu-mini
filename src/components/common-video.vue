<template>
  <view class="video-container" @tap="onContainerTap">
    <!-- 视频播放器区域 -->
    <view class="video-wrapper" :class="{ 'video-shrink': showPlaylist }">
      <video
        v-if="currentVideo.url"
        id="commonVideo"
        ref="refVideo"
        class="video-player"
        :key="currentVideo.url"
        :src="currentVideo.url"
        :autoplay="true"
        :controls="false"
        :show-center-play-btn="false"
        :enable-progress-gesture="false"
        :show-fullscreen-btn="false"
        :enable-play-gesture="false"
        object-fit="contain"
        :show-casting-button="supportCasting"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        @timeupdate="onTimeUpdate"
        @error="onVideoError"
        @castinguserselect="onCastingUserSelect"
        @castingstatechange="onCastingStateChange"
        @castinginterrupt="onCastingInterrupt"
      ></video>

      <!-- 开发工具 H.265 不支持提示 -->
      <view v-if="showDevToolsTip" class="devtools-tip">
        <text class="devtools-tip-text"
          >开发工具不支持 H.265
          视频解码，仅有声音无画面属正常现象，请在真机上预览</text
        >
      </view>

      <!-- 透明点击层：始终覆盖视频区域，拦截所有点击传递给 onContainerTap -->
      <view v-if="!isListenMode" class="tap-layer" @tap.stop="onContainerTap" />

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
          @tap.stop="onCast"
        >
          <text class="btn-icon">{{ isCasting ? '📺' : '📡' }}</text>
          <text class="btn-sub-text">{{ isCasting ? '投屏中' : '投屏' }}</text>
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
    <view v-if="showSpeedPanel" class="speed-mask" @tap.stop="toggleSpeedPanel">
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
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  getCurrentInstance,
} from 'vue'
import VipDialog from './vip-dialog.vue'
import { getQrcodeListByType } from '@/apis'
import { ensureAuth } from '@/utils/auth-guard'

/** 视频项接口 */
export interface VideoItem {
  title: string
  url: string
  /** 是否已观看完成 */
  isFinish?: boolean
}

const props = withDefaults(
  defineProps<{
    videoList: VideoItem[]
    initialIndex?: number
    /** 外部控制暂停（如免费次数用完时冻结播放） */
    paused?: boolean
  }>(),
  {
    initialIndex: 0,
    paused: false,
  },
)

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'change', index: number): void
  (e: 'ended', index: number): void
  /** 次数耗尽时用户尝试播放/切换，通知外部弹框 */
  (e: 'blocked'): void
}>()

const speedOptions = [0.5, 0.8, 1, 1.25, 1.5, 2]

const currentIndex = ref(props.initialIndex)
const playbackRate = ref(1)
const duration = ref(0)
const currentTime = ref(0)
const showControls = ref(true)
const showPlaylist = ref(false)
const playlistScrollTarget = ref('')
const showSpeedPanel = ref(false)
const isListenMode = ref(false)
const isPlaying = ref(false)
const showCenterBtn = ref(false)
let centerBtnTimer: ReturnType<typeof setTimeout> | null = null
const isCasting = ref(false)
const supportCasting = ref(false)
const showDevToolsTip = ref(false)
const centerBounceKey = ref(0)

const isProgressDragging = ref(false)
const dragTime = ref(0)
let progressTouchStartX = 0
let progressTouchStartPercent = 0

const autoPlayNext = ref(true) // true=自动下一集, false=循环当前集
let autoNextTriggered = false // 防止同一视频重复触发 triggerAutoNext
let controlsTimer: ReturnType<typeof setTimeout> | null = null
let playlistTouchStartX = 0
let playlistTouchStartY = 0
let screenWidth = 375
try {
  screenWidth = uni.getSystemInfoSync().screenWidth
} catch (_e) {}

// 联系我们弹框
const showContactDialog = ref(false)
const contactQrcodeUrl = ref('')

const currentVideo = computed(() => {
  if (
    props.videoList.length > 0 &&
    currentIndex.value < props.videoList.length
  ) {
    return props.videoList[currentIndex.value]
  }
  return { title: '', url: '' }
})

let videoContext: any = null
const instance = getCurrentInstance()

onMounted(async () => {
  initVideoContext()
  startControlsTimer()
  checkCastingSupport()
  checkDevTools()
  await ensureAuth()
  loadContactQrcode()
  preloadAll()
})

onBeforeUnmount(() => {
  clearControlsTimer()
  if (isListenMode.value) {
    try {
      if (!videoContext) initVideoContext()
      if (videoContext) videoContext.exitBackgroundPlayback()
    } catch (_e) {
      /* 静默忽略 */
    }
  }
})

// ==================== 控件显隐 ====================

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
      if (!videoContext) initVideoContext()
      if (videoContext) videoContext.exitBackgroundPlayback()
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

function flashCenterBtn() {
  showCenterBtn.value = true
  if (centerBtnTimer) clearTimeout(centerBtnTimer)
  centerBtnTimer = setTimeout(() => {
    showCenterBtn.value = false
  }, 1500)
}

// ==================== 进度条 ====================

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
    if (!videoContext) initVideoContext()
    videoContext?.seek(time)
  } catch (_e) {
    console.warn('[seek] 调用失败:', _e)
  }
  currentTime.value = time
}

// ==================== 播放控制 ====================

function togglePlayPause() {
  if (props.paused) {
    emit('blocked')
    return
  }
  if (!videoContext) initVideoContext()
  if (!videoContext) return
  try {
    if (isPlaying.value) {
      videoContext.pause()
    } else {
      videoContext.play()
    }
  } catch (_e) {}
}

function onAutoPlayNextChange(e: any) {
  autoPlayNext.value = !!e.detail.value
}

function triggerAutoNext() {
  if (autoNextTriggered) return
  autoNextTriggered = true
  if (autoPlayNext.value) {
    const nextIndex = currentIndex.value + 1
    if (nextIndex < props.videoList.length) {
      // 先通知外部上报观看完成，再切集
      emit('ended', currentIndex.value)
      isPlaying.value = false
      currentTime.value = 0
      duration.value = 0
      switchVideo(nextIndex)
    } else {
      autoNextTriggered = false
    }
  } else {
    // 循环播放当前集：seek 回起点重新播放
    autoNextTriggered = false
    currentTime.value = 0
    if (!videoContext) initVideoContext()
    if (videoContext) {
      try {
        videoContext.seek(0)
        videoContext.play()
      } catch (_e) {}
    }
  }
}

function onPlay() {
  if (props.paused) {
    try {
      videoContext?.pause()
    } catch (_e) {}
    emit('blocked')
    return
  }
  isPlaying.value = true
  // 新视频已开始播放，重置自动切集标记
  autoNextTriggered = false
  flashCenterBtn()
  // 播放/恢复时重新应用倍速（播放事件可能重置倍速）
  if (playbackRate.value !== 1) {
    setTimeout(() => {
      if (!videoContext) initVideoContext()
      if (videoContext) videoContext.playbackRate(playbackRate.value)
    }, 100)
  }
}

function onPause() {
  isPlaying.value = false
  flashCenterBtn()
}

function onEnded() {
  isPlaying.value = false
  triggerAutoNext()
}

/** 视频加载出错时在开发工具环境下显示提示 */
function onVideoError(e: any) {
  console.warn('[video] error:', e.detail)
  try {
    const systemInfo = uni.getSystemInfoSync()
    if ((systemInfo as any).platform === 'devtools') {
      showDevToolsTip.value = true
    }
  } catch (_e) {}
}

function onTimeUpdate(e: any) {
  const d = e?.detail
  if (!d) return
  const dur = Number(d.duration)
  if (!isNaN(dur) && dur > 0) duration.value = dur
  // 拖拽期间跳过更新，避免与拖拽计算值冲突导致进度条抖动
  if (isProgressDragging.value) return
  const cur = Number(d.currentTime)
  if (!isNaN(cur) && cur >= 0) currentTime.value = cur
  // 接近结尾时自动下一集（兜底：防止 ended 事件不触发）
  if (dur > 5 && cur > 1 && dur - cur < 2) {
    triggerAutoNext()
  }
}

function switchVideo(index: number) {
  if (index === currentIndex.value) return
  if (props.paused) {
    emit('blocked')
    return
  }
  currentIndex.value = index
  currentTime.value = 0
  duration.value = 0
  playlistScrollTarget.value = `pl-item-${index}`
  emit('change', index)
  // src 变更后 autoplay 自动播放，通过 videoContext 确保倍速应用
  setTimeout(() => {
    if (!videoContext) initVideoContext()
    if (videoContext) {
      try {
        videoContext.play()
        if (playbackRate.value !== 1) {
          videoContext.playbackRate(playbackRate.value)
        }
      } catch (_e) {}
    }
  }, 300)
}

// ==================== 面板交互 ====================

function goBack() {
  emit('back')
  const pages = getCurrentPages()
  if (pages.length <= 1) {
    uni.reLaunch({ url: '/pages/index/index' })
  } else {
    uni.navigateBack()
  }
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
    if (!videoContext) initVideoContext()
    if (videoContext && !isPlaying.value) {
      try {
        videoContext.play()
      } catch (_e) {}
    }
    if (videoContext) {
      try {
        videoContext.requestBackgroundPlayback()
      } catch (_e) {}
    }
  } else {
    if (!videoContext) initVideoContext()
    if (videoContext) {
      try {
        videoContext.exitBackgroundPlayback()
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
  if (!videoContext) initVideoContext()
  if (videoContext) videoContext.playbackRate(speed)
  showSpeedPanel.value = false
  startControlsTimer()
}

// ==================== 投屏 ====================

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

function onCast() {
  if (!videoContext) initVideoContext()
  if (!videoContext) {
    uni.showToast({ title: '播放器未就绪', icon: 'none' })
    return
  }
  try {
    if (isCasting.value) {
      videoContext.exitCasting()
    } else {
      videoContext.startCasting()
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
  if (state === 'connecting' || state === 'connected') {
    isCasting.value = true
  } else if (state === 'disconnected' || state === 'none') {
    isCasting.value = false
  }
}

function onCastingInterrupt(e: any) {
  console.log('[casting] 投屏中断:', e.detail)
  isCasting.value = false
  uni.showToast({ title: '投屏已断开', icon: 'none' })
}

// ==================== 辅助功能 ====================

/** 打开联系我们弹框 */
function onOpenContact() {
  showContactDialog.value = true
}

/** 加载联系我们二维码（type=2） */
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

/** 通过 uni.createVideoContext 获取 VideoContext */
function initVideoContext() {
  const proxy = instance?.proxy as any
  if (!proxy) return
  videoContext = uni.createVideoContext('commonVideo', proxy)
  if (!videoContext) {
    setTimeout(() => {
      videoContext = uni.createVideoContext('commonVideo', proxy)
    }, 500)
  }
}

/** 检测是否在开发者工具中运行 */
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

/** 预加载所有视频（去重，跳过当前正在播放的） */
function preloadAll() {
  // #ifdef MP-WEIXIN
  const seen = new Set<string>()
  props.videoList.forEach((item, idx) => {
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

// ==================== Watchers ====================

watch(
  () => props.initialIndex,
  (val) => {
    if (val !== currentIndex.value && !props.paused) {
      switchVideo(val)
    }
  },
)

/** 外部 paused 变化时暂停播放 */
watch(
  () => props.paused,
  (val) => {
    if (val) {
      if (!videoContext) initVideoContext()
      if (videoContext) {
        try {
          videoContext.pause()
        } catch (_e) {}
      }
    }
  },
)

/**
 * 监听当前视频 URL 变化（如异步拉取列表回来后从空变为真实 URL）：
 * autoplay 可能不触发，这里在 URL 就绪后重建 videoContext 并显式 play() 兜底。
 */
watch(
  () => currentVideo.value.url,
  (newUrl, oldUrl) => {
    if (!newUrl || newUrl === oldUrl) return
    setTimeout(() => {
      if (props.paused) return
      initVideoContext()
      if (videoContext) {
        try {
          videoContext.play()
          if (playbackRate.value !== 1) {
            videoContext.playbackRate(playbackRate.value)
          }
        } catch (_e) {}
      }
    }, 150)
  },
)
</script>

<style lang="less" scoped>
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
