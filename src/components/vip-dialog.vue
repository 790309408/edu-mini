<template>
  <view v-if="visible" class="vip-overlay" @tap="onOverlayTap">
    <view class="vip-container" @tap.stop>
      <!-- 关闭按钮 -->
      <view class="close-btn" @tap="onClose">
        <text class="close-icon">×</text>
      </view>

      <!-- 装饰星星 -->
      <text class="deco-star star-1">✦</text>
      <text class="deco-star star-2">★</text>
      <text class="deco-star star-3">✦</text>

      <!-- 云朵装饰 -->
      <view class="deco-cloud cloud-left" />
      <view class="deco-cloud cloud-right" />

      <!-- 标题区 -->
      <view class="vip-header">
        <text class="vip-title">{{ title }}</text>
        <text v-if="subtitle" class="vip-subtitle">{{ subtitle }}</text>
      </view>

      <!-- 二维码区 -->
      <view class="qrcode-section">
        <view class="qrcode-wrapper">
          <image
            v-if="qrcodeUrl"
            class="qrcode-image"
            :src="qrcodeUrl"
            mode="aspectFit"
            :show-menu-by-longpress="true"
          />
          <view v-else class="qrcode-placeholder">
            <text class="qrcode-placeholder-text">二维码</text>
          </view>
        </view>
      </view>

      <!-- 长按识别提示 -->
      <view class="vip-tip">
        <text class="vip-tip-text">{{ confirmText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** 是否显示弹框 */
    visible: boolean
    /** 弹框标题 */
    title?: string
    /** 副标题文案 */
    subtitle?: string
    /** 二维码图片地址 */
    qrcodeUrl?: string
    /** 确认按钮文案 */
    confirmText?: string
    /** 点击遮罩是否关闭，默认 false */
    closeOnOverlay?: boolean
  }>(),
  {
    title: '扫码添加专属客服',
    subtitle: '一对一为您答疑',
    qrcodeUrl: '',
    confirmText: '长按识别添加客服',
    closeOnOverlay: false,
  },
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'close'): void
  (e: 'confirm'): void
}>()

function onClose() {
  emit('update:visible', false)
  emit('close')
}

function onOverlayTap() {
  if (props.closeOnOverlay) {
    onClose()
  }
}

function onConfirm() {
  emit('confirm')
}
</script>

<style scoped>
.vip-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.vip-container {
  position: relative;
  width: 36vw;
  padding: 2.4vw 2vw 1.4vw;
  border-radius: 3vw;
  background: #f5ead6;
  box-shadow: 0 1vw 4vw rgba(0, 0, 0, 0.15);
  overflow: visible;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 1vw;
  right: 1vw;
  width: 2.8vw;
  height: 2.8vw;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  z-index: 5;
}

.close-icon {
  font-size: 2vw;
  color: #666;
  line-height: 1;
}

/* 装饰星星 */
.deco-star {
  position: absolute;
  color: #e8c860;
  z-index: 1;
  text-shadow: 0 0.2vw 0.4vw rgba(200, 160, 0, 0.3);
}

.star-1 {
  top: 1.2vw;
  left: 3vw;
  font-size: 2vw;
}

.star-2 {
  top: 0.6vw;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.6vw;
}

.star-3 {
  top: 1.6vw;
  right: 4vw;
  font-size: 1.4vw;
}

/* 云朵装饰 */
.deco-cloud {
  position: absolute;
  width: 6vw;
  height: 2.4vw;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 1.2vw;
  z-index: 0;
}

.deco-cloud::before {
  content: '';
  position: absolute;
  top: -0.8vw;
  left: 1.2vw;
  width: 2.4vw;
  height: 2.4vw;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}

.deco-cloud::after {
  content: '';
  position: absolute;
  top: -0.4vw;
  left: 3vw;
  width: 1.8vw;
  height: 1.8vw;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}

.cloud-left {
  left: 0.5vw;
  top: 8vw;
}

.cloud-right {
  right: 0.5vw;
  bottom: 5vw;
}

/* 顶部标题 */
.vip-header {
  text-align: center;
  margin-bottom: 1.6vw;
  z-index: 2;
}

.vip-title {
  display: block;
  font-size: 2.6vw;
  font-weight: 900;
  color: #4a3520;
  text-shadow: none;
  letter-spacing: 0.15vw;
}

.vip-subtitle {
  display: block;
  margin-top: 0.6vw;
  font-size: 1.6vw;
  font-weight: 600;
  color: #8a7a6a;
}

/* 二维码 */
.qrcode-section {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.2vw;
  z-index: 2;
}

.qrcode-wrapper {
  width: 18vw;
  height: 18vw;
  border: none;
  border-radius: 1vw;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 0.3vw 1vw rgba(0, 0, 0, 0.08);
}

.qrcode-image {
  width: 17vw;
  height: 17vw;
}

.qrcode-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.qrcode-placeholder-text {
  font-size: 1.8vw;
  color: #cccccc;
}

/* 底部提示标签 */
.vip-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6vw 0;
  z-index: 2;
}

.vip-tip-text {
  font-size: 1.4vw;
  font-weight: 600;
  color: #8a7a6a;
  letter-spacing: 0.1vw;
}
</style>
