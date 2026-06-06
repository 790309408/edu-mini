/**
 * 全局主题管理工具
 * 支持三种主题色：王子蓝、公主粉、精灵紫
 */
import { ref, onUnmounted } from 'vue'

export type ThemeKey = 'prince' | 'princess' | 'fairy'

export interface ThemeConfig {
  key: ThemeKey
  label: string
  /** 渐变起始色（浅） */
  gradientStart: string
  /** 渐变结束色（深/主色） */
  gradientEnd: string
  /** 阴影色（不含 alpha） */
  shadowRgb: string
}

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  prince: {
    key: 'prince',
    label: '王子蓝',
    gradientStart: '#6AABEF',
    gradientEnd: '#3A7BD5',
    shadowRgb: '58, 123, 213',
  },
  princess: {
    key: 'princess',
    label: '公主粉',
    gradientStart: '#F9B0D0',
    gradientEnd: '#E8608C',
    shadowRgb: '232, 96, 140',
  },
  fairy: {
    key: 'fairy',
    label: '精灵紫',
    gradientStart: '#A78BFA',
    gradientEnd: '#7C5CE0',
    shadowRgb: '124, 92, 224',
  },
}

const STORAGE_KEY = 'app_color_theme'
const DEFAULT_THEME: ThemeKey = 'princess'

/** 获取当前保存的主题 */
export function getSavedTheme(): ThemeKey {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY) as ThemeKey
    if (saved && THEMES[saved]) return saved
  } catch (_e) {
    // ignore
  }
  return DEFAULT_THEME
}

/** 切换主题并持久化，触发全局事件 */
export function switchTheme(key: ThemeKey) {
  try {
    uni.setStorageSync(STORAGE_KEY, key)
  } catch (_e) {
    // ignore
  }
  uni.$emit('themeChanged', key)
}

/**
 * 页面级主题 composable
 * 在页面 setup 中调用，返回当前主题 key 和用于绑定到根元素的 style 对象
 * 自动监听主题变化事件并更新
 */
export function useTheme() {
  const themeKey = ref<ThemeKey>(getSavedTheme())
  const themeVars = ref<Record<string, string>>(getThemeStyleObj(themeKey.value))

  function getThemeStyleObj(key: ThemeKey): Record<string, string> {
    const c = THEMES[key]
    return {
      '--theme-start': c.gradientStart,
      '--theme-end': c.gradientEnd,
      '--theme-shadow-rgb': c.shadowRgb,
    }
  }

  const handler = (key: ThemeKey) => {
    themeKey.value = key
    themeVars.value = getThemeStyleObj(key)
  }

  uni.$on('themeChanged', handler)

  onUnmounted(() => {
    uni.$off('themeChanged', handler)
  })

  return { themeKey, themeVars }
}
