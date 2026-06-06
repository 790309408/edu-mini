<template>
  <view class="disclaimer-page" :style="themeVars">
    <!-- 通用导航栏 -->
    <NavBar title="免责声明" @back="onBack" />

    <!-- 内容区域 -->
    <scroll-view scroll-y class="disclaimer-content" :show-scrollbar="false">
      <view class="disclaimer-body">
        <text class="disclaimer-heading">免责声明</text>

        <view class="disclaimer-section">
          <text class="disclaimer-text"
            >本小程序所展示的部分音视频内容来源于互联网公开平台（如哔哩哔哩等），仅用于学习交流与信息整理展示，未对相关内容进行任何形式的剪辑、改编或二次创作。</text
          >
        </view>

        <view class="disclaimer-section">
          <text class="disclaimer-text"
            >本小程序不对上述内容主张任何著作权或相关权利，亦不通过相关音视频内容本身直接收费或进行商业化售卖。</text
          >
        </view>

        <view class="disclaimer-section">
          <text class="disclaimer-text"
            >相关内容的著作权及其他合法权益均归原作者或原权利人所有。若相关内容涉及权利争议，请权利人提供有效证明与我们联系，我们将在核实后第一时间采取包括但不限于删除、下架或断开展示链接等必要措施。</text
          >
        </view>

        <view class="disclaimer-footer">
          <text class="footer-text">宝宝星盒</text>
          <text class="footer-date">2026年</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import NavBar from '@/components/nav-bar.vue'
import { useTheme } from '@/utils/theme'

const { themeVars } = useTheme()

const onBack = () => {
  uni.navigateBack({ delta: 1 })
}
</script>

<style scoped lang="less">
.disclaimer-page {
  --theme-start: #f9b0d0;
  --theme-end: #e8608c;
  --theme-shadow-rgb: 232, 96, 140;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
  overflow: hidden;
}

.disclaimer-content {
  flex: 1;
  overflow-y: auto;
}

.disclaimer-body {
  padding: 6vw 5vw;
  padding-bottom: 8vw;
}

.disclaimer-heading {
  display: block;
  font-size: 5vw;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 6vw;
}

.disclaimer-section {
  background: #fff;
  border-radius: 2vw;
  padding: 4vw;
  margin-bottom: 3vw;
  box-shadow: 0 0.2vw 0.8vw rgba(0, 0, 0, 0.04);
}

.disclaimer-text {
  font-size: 3vw;
  color: #555;
  line-height: 1.8;
  text-align: justify;
}

.disclaimer-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1vw;
  margin-top: 6vw;
  padding-top: 4vw;
  border-top: 1px solid #e8e8e8;
}

.footer-text {
  font-size: 3.2vw;
  font-weight: 500;
  color: #999;
}

.footer-date {
  font-size: 2.8vw;
  color: #bbb;
}
</style>

<style lang="less">
page {
  height: 100%;
}
</style>
