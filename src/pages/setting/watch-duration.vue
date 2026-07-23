<template>
  <view class="watch-duration-page" :style="themeVars">
    <!-- 通用导航栏 -->
    <NavBar title="每次观看时长" @back="onBack" />

    <!-- 内容区域 -->
    <scroll-view scroll-y class="duration-content" :show-scrollbar="false">
      <view class="duration-body">
        <!-- 说明文案 -->
        <view class="duration-tip">
          <text class="tip-text"
            >请设置视频的每次观看时长，宝宝星盒将提醒宝宝休息保护眼睛~</text
          >
        </view>

        <!-- 选项区 -->
        <text class="section-title">每次观看时长</text>
        <view class="duration-grid">
          <view
            v-for="item in DURATION_OPTIONS"
            :key="item"
            class="duration-item"
            :class="{ 'duration-item-active': selected === item }"
            @tap="onSelect(item)"
          >
            <text
              class="duration-item-text"
              :class="{ 'duration-item-text-active': selected === item }"
              >{{ item }}分钟</text
            >
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NavBar from '@/components/nav-bar.vue'
import { useTheme } from '@/utils/theme'
import {
  DURATION_OPTIONS,
  getWatchDuration,
  setWatchDuration,
} from '@/utils/watch-timer'

const { themeVars } = useTheme()

const selected = ref(getWatchDuration())

function onSelect(minutes: number) {
  selected.value = minutes
  setWatchDuration(minutes)
  uni.showToast({ title: `已设置 ${minutes} 分钟`, icon: 'none' })
}

function onBack() {
  uni.navigateBack({ delta: 1 })
}
</script>

<style scoped lang="less">
.watch-duration-page {
  --theme-start: #f9b0d0;
  --theme-end: #e8608c;
  --theme-shadow-rgb: 232, 96, 140;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f7f7f7;
  overflow: hidden;
}

.duration-content {
  flex: 1;
  overflow-y: auto;
}

.duration-body {
  padding: 4vw;
}

/* 说明文案 */
.duration-tip {
  background: #f0f1f3;
  border-radius: 2vw;
  padding: 3vw 3.5vw;
  margin-bottom: 6vw;
}

.tip-text {
  font-size: 3.2vw;
  color: #666;
  line-height: 1.6;
}

/* 选项区标题 */
.section-title {
  display: block;
  font-size: 3.6vw;
  font-weight: 600;
  color: #333;
  margin-bottom: 4vw;
}

/* 时长选项网格 */
.duration-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3.5vw;
  margin-bottom: 6vw;
}

.duration-item {
  height: 12vw;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2.5vw;
  border: 0.3vw solid #f5a623;
  background: #fff;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.96);
  }
}

.duration-item-active {
  background: #f5a623;
  border-color: #f5a623;
}

.duration-item-text {
  font-size: 3.4vw;
  font-weight: 600;
  color: #e8940a;
}

.duration-item-text-active {
  color: #fff;
}
</style>
