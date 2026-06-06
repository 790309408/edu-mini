<template>
  <view class="nav-wrapper">
    <!-- 状态栏占位 -->
    <view
      class="nav-status-bar"
      :style="{ height: statusBarHeight + 'px' }"
    ></view>

    <!-- 自定义顶部导航栏 -->
    <view class="nav-bar" :style="{ height: navBarHeight + 'px' }">
      <view class="nav-left" :style="{ width: titlePad + 'px' }">
        <view class="nav-back" @tap="onBack">
          <text class="back-icon">‹</text>
        </view>
      </view>
      <view class="nav-title">
        <text class="title-text">{{ title }}</text>
      </view>
      <view class="nav-right" :style="{ width: titlePad + 'px' }"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    /** 导航栏标题 */
    title?: string
  }>(),
  {
    title: '',
  },
)

const emit = defineEmits<{
  (e: 'back'): void
}>()

// 状态栏高度（px），默认 45px
const statusBarHeight = ref(45)
// 导航栏内容高度（px），固定 45px
const navBarHeight = ref(45)
// 标题左右内边距（px），取左右两侧较大值以保证标题绝对居中
const titlePad = ref(0)

try {
  const sysInfo = uni.getSystemInfoSync()
  // 状态栏高度：优先取系统值，无值时保持默认 45px
  const sysStatusBar = sysInfo.statusBarHeight
  if (sysStatusBar && sysStatusBar > 0) {
    statusBarHeight.value = sysStatusBar
  }

  // 竖屏页面实际视觉宽度 = 窗口短边（横屏小程序中 windowWidth 是长边）
  const portraitWidth = Math.min(sysInfo.windowWidth, sysInfo.windowHeight)
  // 左右两侧固定宽度 = 竖屏宽度的 20%，保证标题绝对居中
  titlePad.value = portraitWidth * 0.2
} catch (_e) {
  // 获取失败时保持默认值
  titlePad.value = 0
}

function onBack() {
  emit('back')
}

/** 导出高度信息，供父组件计算布局 */
defineExpose({ statusBarHeight, navBarHeight })
</script>

<style lang="less" scoped>
.nav-wrapper {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  box-shadow: 0 0.6vw 2vw rgba(var(--theme-shadow-rgb), 0.25);
}

.nav-status-bar {
  flex-shrink: 0;
  width: 100%;
}

.nav-bar {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  position: relative;
}

.nav-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: 100%;
}

.nav-back {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 2vw;
  border-radius: 2vw;

  .back-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 6vw;
    height: 6vw;
    font-size: 7vw;
    color: #fff;
    line-height: 1;
    font-weight: bold;
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.18);
  }
}

.nav-title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  .title-text {
    font-size: 4vw;
    color: #fff;
    font-weight: 600;
    letter-spacing: 0.2vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.nav-right {
  flex-shrink: 0;
  height: 100%;
}
</style>
