<template>
  <view v-if="visible" class="vip-overlay" @tap="onOverlayTap">
    <view class="vip-container" @tap.stop>
      <!-- 关闭按钮 -->
      <view class="close-btn" @tap="onClose">
        <text class="close-icon">×</text>
      </view>

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
  background: #fff8eb;
  box-shadow: 0 0.8vw 3vw rgba(0, 0, 0, 0.15);
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
  background: rgba(255, 255, 255, 0.9);
  z-index: 2;
}

.close-icon {
  font-size: 1.8vw;
  color: #333333;
  line-height: 1;
}

/* 顶部标题 */
.vip-header {
  text-align: center;
  margin-bottom: 1.6vw;
}

.vip-title {
  display: block;
  font-size: 2.4vw;
  font-weight: 800;
  color: #333333;
}

.vip-subtitle {
  display: block;
  margin-top: 0.4vw;
  font-size: 1.6vw;
  font-weight: 600;
  color: #444444;
}

/* 二维码 */
.qrcode-section {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.2vw;
}

.qrcode-wrapper {
  width: 18vw;
  height: 18vw;
  border: none;
  border-radius: 0.6vw;
  background: #fff8eb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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
}

.vip-tip-text {
  font-size: 1.4vw;
  font-weight: 500;
  color: #999999;
  letter-spacing: 0.2vw;
}
</style>
