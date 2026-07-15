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
        :controls="true"
        :show-center-play-btn="false"
        :enable-progress-gesture="true"
        :show-fullscreen-btn="false"
        :enable-play-gesture="true"
        :object-fit="showPlaylist ? 'contain' : 'contain'"
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

      <!-- 透明点击层 -->
      <view
        v-if="!showControls && !showSpeedPanel && !isListenMode"
        class="tap-layer"
        @tap.stop="onContainerTap"
      />

      <!-- 自定义中间播放按钮：视频暂停时显示 -->
      <view
        v-if="!isPlaying && !isListenMode && !showSpeedPanel"
        class="center-play-btn"
        @tap.stop="playVideo"
      >
        <text class="center-play-icon">▶</text>
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

      <!-- 控件覆盖层 -->
      <view
        v-if="showControls && !isListenMode"
        class="controls-overlay"
        @tap.stop="onContainerTap"
      >
        <!-- 左侧按钮 -->
        <view class="left-controls">
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
            <text class="btn-sub-text">{{
              isCasting ? '投屏中' : '投屏'
            }}</text>
          </view>
        </view>

        <!-- 右侧按钮 -->
        <view class="right-controls">
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
      >
        <view
          v-for="(item, index) in videoList"
          :key="index"
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
const showControls = ref(true)
const showPlaylist = ref(false)
const showSpeedPanel = ref(false)
const isListenMode = ref(false)
const isPlaying = ref(false)
const isCasting = ref(false)
const supportCasting = ref(false)
const showDevToolsTip = ref(false)

// 联系我们弹框
const showContactDialog = ref(false)
const contactQrcodeUrl = ref('')

/** 打开联系我们弹框 */
function onOpenContact() {
  showContactDialog.value = true
}

/** 加载联系我们二维码（type=2） */
async function loadContactQrcode() {
  // 未登录时不调用
  const userInfo = uni.getStorageSync('wx_user_info') as any
  if (!userInfo || !userInfo.userId) return
  try {
    const list = await getQrcodeListByType(2)
    if (list && list.length > 0) {
      const item = list[0]
      if (item.images && item.images.length > 0) {
        contactQrcodeUrl.value = item.images[0].imageUrl
      }
    }
  } catch (e) {
    console.error('获取联系我们二维码失败:', e)
  }
}

let controlsTimer: ReturnType<typeof setTimeout> | null = null

/** 播放列表滑动手势 */
let playlistTouchStartX = 0
let playlistTouchStartY = 0

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
  // 等待登录完成后再加载联系我们二维码
  await ensureAuth()
  loadContactQrcode()
  // 预加载全部视频
  preloadAll()
})

/** 检测是否在开发者工具中运行 */
function checkDevTools() {
  try {
    const systemInfo = uni.getSystemInfoSync()
    if ((systemInfo as any).platform === 'devtools') {
      // 延迟检测：如果 3 秒后视频已经在播放（isPlaying=true），
      // 说明 H.264 正常解码，无需提示
      setTimeout(() => {
        if (!isPlaying.value) {
          showDevToolsTip.value = true
        }
      }, 3000)
    }
  } catch (_e) {}
}

/** 通过 uni.createVideoContext 获取 VideoContext */
function initVideoContext() {
  const proxy = instance?.proxy as any
  if (!proxy) return
  videoContext = uni.createVideoContext('commonVideo', proxy)
  console.log('videoContext', videoContext)
  if (!videoContext) {
    setTimeout(() => {
      videoContext = uni.createVideoContext('commonVideo', proxy)
      console.log('videoContext retry', videoContext)
    }, 500)
  }
}

onBeforeUnmount(() => {
  clearControlsTimer()
  // 退出时如果处于听视频模式，退出后台播放
  if (isListenMode.value) {
    try {
      if (!videoContext) initVideoContext()
      if (videoContext) videoContext.exitBackgroundPlayback()
    } catch (_e) {
      /* 静默忽略 */
    }
  }
})

function startControlsTimer() {
  clearControlsTimer()
  controlsTimer = setTimeout(() => {
    if (!showPlaylist.value && !showSpeedPanel.value) {
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
  // 侧边视频列表弹框已打开时，点击视频主区域先关闭列表
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
    // 退出后台播放
    try {
      if (!videoContext) initVideoContext()
      if (videoContext) videoContext.exitBackgroundPlayback()
    } catch (_e) {
      /* 静默忽略 */
    }
    startControlsTimer()
    return
  }
  showControls.value = !showControls.value
  if (showControls.value) {
    startControlsTimer()
  }
}

function goBack() {
  emit('back')
  // 导航栈只有当前页时，回首页；否则返回上一页
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

function onPlaylistTouchMove(e: any) {
  // 阻止默认行为防止页面滑动
}

function onPlaylistTouchEnd(e: any) {
  const touch = e.changedTouches[0]
  const deltaX = touch.clientX - playlistTouchStartX
  const deltaY = Math.abs(touch.clientY - playlistTouchStartY)
  // 右滑超过 60px 且水平距离大于垂直距离，判定为右滑收起
  if (deltaX > 60 && deltaX > deltaY) {
    togglePlaylist()
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

/** 切换听视频模式（后台音频播放） */
function toggleListenMode() {
  isListenMode.value = !isListenMode.value
  showControls.value = false
  if (isListenMode.value) {
    clearControlsTimer()
    // 确保视频在播放
    if (!videoContext) initVideoContext()
    if (videoContext && !isPlaying.value) {
      try {
        videoContext.play()
      } catch (_e) {}
    }
    // 请求后台播放
    if (videoContext) {
      try {
        videoContext.requestBackgroundPlayback()
        console.log('[listenMode] requestBackgroundPlayback')
      } catch (_e) {
        console.warn('[listenMode] requestBackgroundPlayback 失败', _e)
      }
    }
  } else {
    // 退出后台播放
    if (!videoContext) initVideoContext()
    if (videoContext) {
      try {
        videoContext.exitBackgroundPlayback()
        console.log('[listenMode] exitBackgroundPlayback')
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
  // 通过 videoContext 设置倍速
  if (!videoContext) initVideoContext()
  if (videoContext) {
    console.log('videoContext playbackRate', speed)
    videoContext.playbackRate(speed)
  }
  showSpeedPanel.value = false
  startControlsTimer()
}

function switchVideo(index: number) {
  if (index === currentIndex.value) return
  // 外部冻结时阻止切换，并通知外部弹框
  if (props.paused) {
    emit('blocked')
    return
  }
  currentIndex.value = index
  emit('change', index)
  // src 变更后 autoplay 自动播放，通过 videoContext 确保倍速应用
  setTimeout(() => {
    if (!videoContext) initVideoContext()
    if (videoContext) {
      videoContext.play()
      if (playbackRate.value !== 1) {
        videoContext.playbackRate(playbackRate.value)
      }
    }
  }, 300)
}

function onPlay() {
  // 外部冻结时，原生控件点击播放也会被立即拦截
  if (props.paused) {
    if (videoContext) {
      try {
        videoContext.pause()
      } catch (_e) {}
    }
    emit('blocked')
    return
  }
  isPlaying.value = true
  // 播放/恢复时重新应用倍速（播放事件可能重置倍速）
  if (playbackRate.value !== 1 && videoContext) {
    setTimeout(() => {
      if (videoContext) videoContext.playbackRate(playbackRate.value)
    }, 100)
  }
}

/** 点击中间播放按钮恢复播放 */
function playVideo() {
  // 外部冻结时禁止播放，通知外部弹框
  if (props.paused) {
    emit('blocked')
    return
  }
  if (!videoContext) initVideoContext()
  if (videoContext) {
    try {
      videoContext.play()
    } catch (_e) {
      /* 静默忽略 */
    }
  }
  // 恢复播放后显示控件并重置自动隐藏定时器
  showControls.value = true
  startControlsTimer()
}

function onPause() {
  isPlaying.value = false
}

/** 视频加载出错时在开发工具环境下显示提示 */
function onVideoError(e: any) {
  console.warn('[video] error:', e.detail)
  // 开发者工具中 H.265 解码失败时展示提示
  try {
    const systemInfo = uni.getSystemInfoSync()
    if ((systemInfo as any).platform === 'devtools') {
      showDevToolsTip.value = true
    }
  } catch (_e) {}
}

function onEnded() {
  isPlaying.value = false
  emit('ended', currentIndex.value)
}

function onTimeUpdate(e: any) {
  if (e.detail && e.detail.currentTime != null) {
    // 可用于后续进度记录
  }
}

/** 检测当前环境是否支持投屏 */
function checkCastingSupport() {
  // #ifdef MP-WEIXIN
  try {
    const systemInfo = uni.getSystemInfoSync()
    const isHarmony =
      systemInfo.platform === 'harmony' ||
      (systemInfo as any).hostName?.includes('harmony')
    if (isHarmony) {
      // 鸿蒙OS暂不支持投屏
      supportCasting.value = false
    } else {
      supportCasting.value = true
    }
  } catch (_e) {
    supportCasting.value = false
  }
  // #endif
}

/** 手动触发投屏 */
function onCast() {
  if (!videoContext) initVideoContext()
  if (!videoContext) {
    uni.showToast({ title: '播放器未就绪', icon: 'none' })
    return
  }
  try {
    if (isCasting.value) {
      // 退出投屏
      videoContext.exitCasting()
    } else {
      // 发起投屏
      videoContext.startCasting()
    }
  } catch (_e) {
    uni.showToast({ title: '当前环境不支持投屏', icon: 'none' })
  }
}

/** 用户选择投屏设备 */
function onCastingUserSelect(e: any) {
  console.log('[casting] 用户选择设备:', e.detail)
}

/** 投屏状态变化 */
function onCastingStateChange(e: any) {
  console.log('[casting] 状态变化:', e.detail)
  const state = e.detail?.state
  if (state === 'connecting' || state === 'connected') {
    isCasting.value = true
  } else if (state === 'disconnected' || state === 'none') {
    isCasting.value = false
  }
}

/** 投屏被中断 */
function onCastingInterrupt(e: any) {
  console.log('[casting] 投屏中断:', e.detail)
  isCasting.value = false
  uni.showToast({ title: '投屏已断开', icon: 'none' })
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
        success: () => console.log('[preload] 预加载成功:', idx, item.title),
        fail: () => {},
      })
    } catch (_e) {
      // 低版本基础库不支持，静默忽略
    }
  })
  // #endif
}

watch(
  () => props.initialIndex,
  (val) => {
    if (val !== currentIndex.value && !props.paused) {
      switchVideo(val)
    }
  },
)

/** 外部 paused 变化时暂停/恢复播放 */
watch(
  () => props.paused,
  (val) => {
    if (val) {
      // 暂停视频
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
 * 微信开发者工具中 video 元素从空 src 切到非空 src 时，autoplay 经常不触发，
 * 这里在 URL 就绪后重建 videoContext 并显式调用 play() 兜底。
 */
watch(
  () => currentVideo.value.url,
  (newUrl, oldUrl) => {
    if (!newUrl || newUrl === oldUrl) return
    // 等 v-if 渲染出 video 元素后再创建 context
    setTimeout(() => {
      // 外部冻结时不自动播放
      if (props.paused) return
      initVideoContext()
      if (videoContext) {
        try {
          videoContext.play()
          if (playbackRate.value !== 1) {
            videoContext.playbackRate(playbackRate.value)
          }
        } catch (_e) {
          /* 静默忽略 */
        }
      }
    }, 150)
  },
)
</script>

<style lang="less" scoped>
.video-container {
  width: 80%;
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
  height: 70%;
  z-index: 5;
}

.center-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12vw;
  height: 12vw;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
  pointer-events: auto;
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

.center-play-icon {
  font-size: 5.333vw;
  color: #fff;
  margin-left: 0.8vw;
  line-height: 1;
}

.controls-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
  z-index: 10;
}

.left-controls,
.right-controls {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 1.6vw;
  gap: 1.6vw;
  pointer-events: auto;
  height: 100%;
}

.right-controls {
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

/** 无标题横杠样式：顶部仅保留一根居中的抓手横杠 + 右侧关闭按钮 */
.playlist-header-bar {
  position: relative;
  justify-content: flex-end;
  padding: 2vw 2.667vw 1.333vw;
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

.playlist-title {
  font-size: 3.2vw;
  color: #fff;
  font-weight: bold;
}

.playlist-close {
  width: 6vw;
  height: 6vw;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-icon {
  font-size: 4vw;
  color: #fff;
  font-weight: bold;
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
    // text-decoration: line-through;
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

.playlist-item-tag {
  font-size: 2vw;
  color: #fff;
  background-color: rgba(var(--theme-shadow-rgb), 0.85);
  padding: 0.4vw 1.2vw;
  border-radius: 0.8vw;
  flex-shrink: 0;
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
</style>
