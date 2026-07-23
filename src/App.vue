<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { getDurationStorageKey, startWatchTimer } from '@/utils/watch-timer'

const SCENE_VALUE_KEY = 'wx_scene_value'

onLaunch(async (opt) => {
  console.log('App Launch', opt)
  // 冷启动时清空本地缓存（强制重新登录），但保留主题色设置和观看时长设置
  let savedTheme = ''
  let savedDuration = ''
  try {
    savedTheme = uni.getStorageSync('app_color_theme') || ''
    savedDuration = uni.getStorageSync(getDurationStorageKey()) || ''
  } catch (_e) {
    // ignore
  }
  try {
    uni.clearStorageSync()
  } catch (e) {
    console.warn('clearStorageSync failed', e)
  }
  if (savedTheme) {
    try {
      uni.setStorageSync('app_color_theme', savedTheme)
    } catch (_e) {
      // ignore
    }
  }
  if (savedDuration) {
    try {
      uni.setStorageSync(getDurationStorageKey(), savedDuration)
    } catch (_e) {
      // ignore
    }
  }
  // 冷启动开始计时（每次观看时长功能）
  startWatchTimer()
  // 扫描小程序码进入时，保存 query.scene 作为 sceneValue
  const scene = opt?.query?.scene
  if (scene) {
    try {
      uni.setStorageSync(SCENE_VALUE_KEY, decodeURIComponent(scene))
    } catch (e) {
      console.warn('保存 sceneValue 失败', e)
    }
  }
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="less">
/* 全局样式 */
page {
  width: 100%;
  height: 100%;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
}
</style>
