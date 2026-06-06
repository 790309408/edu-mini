<template>
  <view v-if="visible" class="dialog-overlay" @tap="onOverlayTap">
    <view class="dialog-container" @tap.stop>
      <!-- 关闭按钮 -->
      <view class="close-btn" @tap="onClose">
        <text class="close-icon">×</text>
      </view>

      <!-- 标题 -->
      <view class="dialog-header">
        <text class="dialog-title">{{ name }}</text>
      </view>

      <!-- 二维码 + 横排提示 -->
      <view class="qrcode-section">
        <view class="qrcode-wrapper">
          <image
            v-if="qrcodeUrl"
            class="qrcode-image"
            :src="qrcodeUrl"
            :show-menu-by-longpress="true"
            mode="aspectFit"
          />
          <view v-else class="qrcode-placeholder">
            <text class="qrcode-placeholder-text">二维码</text>
          </view>
        </view>
        <text class="qrcode-label">加老师免费领取兑换码</text>
      </view>

      <!-- 兑换码输入区域 -->
      <view class="redeem-section">
        <view class="redeem-input-wrapper">
          <input
            class="redeem-input"
            v-model="redeemCode"
            placeholder="输入兑换码"
            placeholder-class="input-placeholder"
            maxlength="32"
          />
          <view class="redeem-btn" @tap="onConfirm">
            <text style="font-size: 1.6vw; font-weight: bold; color: #ffffff"
              >确定</text
            >
          </view>
        </view>
      </view>

      <!-- 提示文字（输入框下方） -->
      <text class="qrcode-tip">{{ textContent }}</text>

      <!-- 剩余试看次数 -->
      <view class="remain-section">
        <text class="remain-text">剩余试看次数：</text>
        <text class="remain-count">{{ remainCount }}</text>
        <text class="remain-text">次</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  /** 是否显示弹框 */
  visible: boolean
  /** 二维码图片地址 */
  qrcodeUrl?: string
  /** 剩余试看次数 */
  remainCount?: number
  /** 点击遮罩是否关闭，默认 false */
  closeOnOverlay?: boolean
  /** 文本内容 */
  textContent?: string
  /** 弹框标题 */
  name?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'close'): void
  (e: 'confirm', code: string): void
}>()

const redeemCode = ref('')

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
  const code = redeemCode.value.trim()
  if (!code) {
    uni.showToast({ title: '请输入兑换码', icon: 'none' })
    return
  }
  emit('confirm', code)
}
</script>

<style scoped>
.dialog-overlay {
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

.dialog-container {
  position: relative;
  width: 36vw;
  padding: 2.4vw 2vw 1.6vw;
  border-radius: 2.4vw;
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

/* 标题区 */
.dialog-header {
  text-align: center;
  margin-bottom: 1.6vw;
}

.dialog-title {
  font-size: 2.4vw;
  font-weight: 800;
  color: #333333;
}

/* 二维码区 */
.qrcode-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1vw;
}

.qrcode-wrapper {
  width: 16vw;
  height: 16vw;
  border: none;
  border-radius: 0.8vw;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 0.2vw 0.8vw rgba(0, 0, 0, 0.06);
  margin-bottom: 0.8vw;
}

.qrcode-image {
  width: 15vw;
  height: 15vw;
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

.qrcode-label {
  font-size: 2vw;
  color: var(--theme-end, #e8608c);
  font-weight: 800;
  letter-spacing: 0.1vw;
  margin-top: 0.6vw;
}

/* 提示文字 */
.qrcode-tip {
  display: block;
  text-align: center;
  font-size: 1.2vw;
  font-weight: 400;
  color: #aaaaaa;
  margin-bottom: 1.2vw;
  line-height: 1.4;
}

/* 兑换码输入区域 */
.redeem-section {
  margin-bottom: 1.4vw;
  padding: 0 2vw;
}

.redeem-input-wrapper {
  display: flex;
  align-items: center;
  height: 3.6vw;
  border-radius: 1.8vw;
  overflow: hidden;
  background: #fef3e2;
  border: none;
}

.redeem-input {
  flex: 1;
  height: 3.6vw;
  padding: 0 1.4vw;
  font-size: 1.4vw;
  color: #333333;
  background: transparent;
}

.input-placeholder {
  color: #c0c0c0;
  font-size: 1.4vw;
}

.redeem-btn {
  height: 3.6vw;
  padding: 0 2vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5a0c0, var(--theme-end));
  flex-shrink: 0;
}

.redeem-btn-text {
  font-size: 1.6vw;
  font-weight: bold;
  color: #fff !important;
}

/* 剩余次数 */
.remain-section {
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding-top: 0.4vw;
}

.remain-text {
  font-size: 1.6vw;
  font-weight: 600;
  color: #444444;
}

.remain-count {
  font-size: 2.4vw;
  font-weight: 800;
  color: #e85d5d;
  margin: 0 0.2vw;
}
</style>
