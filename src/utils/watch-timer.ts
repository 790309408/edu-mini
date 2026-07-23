/**
 * 每次观看时长 - 全局计时模块
 * 冷启动时开始计时，到达设定时长后触发回调（在视频页弹出家长验证弹框）
 */

/** 观看时长设置存储 key */
const WATCH_DURATION_KEY = 'watch_duration_setting'

/** 默认时长（分钟） */
export const DEFAULT_DURATION = 20

/** 可选时长列表（分钟） */
export const DURATION_OPTIONS = [1, 10, 20, 30, 40, 50, 60]

/** 获取已设置的观看时长（分钟），默认 20 分钟 */
export function getWatchDuration(): number {
  try {
    const val = uni.getStorageSync(WATCH_DURATION_KEY)
    if (val && Number(val) > 0) return Number(val)
  } catch (_e) {
    // ignore
  }
  return DEFAULT_DURATION
}

/** 保存观看时长设置（分钟） */
export function setWatchDuration(minutes: number) {
  try {
    uni.setStorageSync(WATCH_DURATION_KEY, minutes)
  } catch (_e) {
    // ignore
  }
}

/** 获取存储 key（供 App.vue 冷启动清理时保留用） */
export function getDurationStorageKey(): string {
  return WATCH_DURATION_KEY
}

// ====== 全局计时器 ======

type TimeUpCallback = () => void

let elapsedSeconds = 0
let timerInterval: ReturnType<typeof setInterval> | null = null
let timeUpCallback: TimeUpCallback | null = null
let timeUpFired = false

/** 注册"时间到"回调（由视频页注册） */
export function onTimeUp(cb: TimeUpCallback) {
  timeUpCallback = cb
}

/** 注销回调 */
export function offTimeUp() {
  timeUpCallback = null
}

/** 启动全局计时（冷启动时调用一次） */
export function startWatchTimer() {
  stopWatchTimer()
  elapsedSeconds = 0
  timeUpFired = false
  timerInterval = setInterval(() => {
    elapsedSeconds++
    const limitSeconds = getWatchDuration() * 60
    if (!timeUpFired && elapsedSeconds >= limitSeconds) {
      timeUpFired = true
      if (timeUpCallback) {
        timeUpCallback()
      }
    }
  }, 1000)
}

/** 停止计时 */
export function stopWatchTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

/** 重置计时（答对算术题后调用） */
export function resetWatchTimer() {
  elapsedSeconds = 0
  timeUpFired = false
}

/** 获取已计时秒数 */
export function getElapsedSeconds(): number {
  return elapsedSeconds
}

/** 计时是否已触发过 */
export function isTimeUpFired(): boolean {
  return timeUpFired
}

/** 计时器是否正在运行 */
export function isTimerRunning(): boolean {
  return timerInterval !== null
}
