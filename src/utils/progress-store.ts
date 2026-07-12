/**
 * 视频播放进度 —— 纯内存 store（冷启动即清空）
 * 每用户仅保留一条记录：{ videoId, time }
 */
import { reactive } from 'vue'

export interface VideoProgress {
  videoId: string
  time: number
}

/** 内存中的进度表：userId -> progress */
const progressMap = reactive<Record<string, VideoProgress>>({})

/** 保存进度 */
export function saveVideoProgress(userId: string | number, videoId: string, time: number) {
  progressMap[String(userId)] = { videoId, time }
  console.log('[progress-store] 保存:', userId, videoId, time)
}

/** 读取进度 */
export function getVideoProgress(userId: string | number): VideoProgress | null {
  return progressMap[String(userId)] ?? null
}

/** 清除进度 */
export function clearVideoProgress(userId: string | number) {
  delete progressMap[String(userId)]
  console.log('[progress-store] 清除:', userId)
}
