<template>
  <view
    v-if="visible"
    class="dialog-overlay"
    :class="{ 'overlay-closing': isClosing }"
    @tap="onOverlayTap"
  >
    <!-- 外层：流体动画壳 -->
    <view class="dialog-shell" :class="shellAnimClass" @tap.stop>
      <!-- 关闭按钮 -->
      <view class="close-btn" @tap.stop="onClose">
        <text class="close-icon">×</text>
      </view>

      <!-- 装饰星星 -->
      <text class="deco-star star-1">✦</text>
      <text class="deco-star star-2">★</text>
      <text class="deco-star star-3">✦</text>

      <!-- 云朵装饰 -->
      <view class="deco-cloud cloud-left" />
      <view class="deco-cloud cloud-right" />

      <!-- 内层：固定内容区 -->
      <view class="dialog-container">
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
          <view class="qrcode-label">
            <text class="qrcode-label-line">长按识别二维码</text>
            <text class="qrcode-label-line">添加老师免费领取会员兑换码</text>
          </view>
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
              <text style="font-size: 1.4vw; font-weight: bold; color: #ffffff"
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
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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
const isClosing = ref(false)

const shellAnimClass = computed(() => {
  if (isClosing.value) return 'shell-closing'
  return 'shell-open'
})

function doClose() {
  isClosing.value = true
  setTimeout(() => {
    emit('update:visible', false)
    emit('close')
    isClosing.value = false
  }, 280)
}

function onClose() {
  doClose()
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
  animation: overlayFadeIn 0.3s ease both;
}

.overlay-closing {
  animation: overlayFadeOut 0.28s ease both !important;
}

/* ── 外层动画壳（比内层大，确保形变不裁切内容） ── */
.dialog-shell {
  position: relative;
  width: 54vw;
  min-height: 36vw;
  background: linear-gradient(
    160deg,
    #ffd4e0,
    #ffe5d4,
    #d4e8ff,
    #f0e4ff,
    #ffd4e0
  );
  background-size: 300% 300%;
  background-position: 0% 0%;
  box-shadow: 0 1vw 4vw rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 初始椭圆形态，避免入场时矩形闪烁 */
  border-radius: 65% 35% 55% 42% / 50% 58% 40% 48%;
}

/* 打开态：入场缩放 + 持续形变 */
.shell-open {
  animation:
    shellIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.15) both,
    fluidShape 18s linear infinite;
}

/* 关闭态：退场动画 */
.shell-closing {
  animation: shellOut 0.28s ease both !important;
}

/* ── 内层固定内容区（居中，不超出壳的安全区域） ── */
.dialog-container {
  width: 34vw;
  padding: 3vw 2vw 2vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 2vw;
  right: 3vw;
  width: 2.8vw;
  height: 2.8vw;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  z-index: 10;
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
  bottom: 6vw;
}

/* 标题区 */
.dialog-header {
  text-align: center;
  margin-bottom: 1.6vw;
  z-index: 2;
}

.dialog-title {
  font-size: 2.8vw;
  font-weight: 900;
  color: #4a3520;
  text-shadow: none;
  letter-spacing: 0.15vw;
}

/* 二维码区 */
.qrcode-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1vw;
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
  margin-bottom: 0.8vw;
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

.qrcode-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0.6vw;
}

.qrcode-label-line {
  font-size: 2vw;
  color: var(--theme-end, #e8608c);
  font-weight: 800;
  letter-spacing: 0.1vw;
  text-shadow: none;
  line-height: 1.4;
}

/* 提示文字 */
.qrcode-tip {
  display: block;
  text-align: center;
  font-size: 1.1vw;
  font-weight: 400;
  color: #b0a090;
  margin-bottom: 1.2vw;
  line-height: 1.4;
}

/* 兑换码输入区域 */
.redeem-section {
  margin-bottom: 1vw;
  padding: 0 2vw;
  width: 100%;
  box-sizing: border-box;
  z-index: 2;
}

.redeem-input-wrapper {
  display: flex;
  align-items: center;
  height: 4vw;
  border-radius: 1.8vw;
  overflow: hidden;
  background: #fff;
  border: none;
  box-shadow: 0 0.2vw 0.6vw rgba(0, 0, 0, 0.06);
}

.redeem-input {
  flex: 1;
  height: 4vw;
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
  height: 4vw;
  padding: 0 2vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4a90e2;
  flex-shrink: 0;
}

.redeem-btn-text {
  font-size: 1.4vw;
  font-weight: bold;
  color: #fff !important;
}

/* 剩余次数 */
.remain-section {
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding-top: 0.4vw;
  z-index: 2;
}

.remain-text {
  font-size: 1.4vw;
  font-weight: 600;
  color: #8a7a6a;
}

.remain-count {
  font-size: 2.4vw;
  font-weight: 800;
  color: #e85d5d;
  margin: 0 0.2vw;
  text-shadow: none;
}

/* ── 流体形变动画（16关键帧，极致顺滑） ── */
@keyframes fluidShape {
  0% {
    border-radius: 65% 35% 55% 42% / 50% 58% 40% 48%;
    background-position: 0% 0%;
  }
  6.25% {
    border-radius: 55% 45% 62% 38% / 42% 55% 48% 52%;
    background-position: 20% 15%;
  }
  12.5% {
    border-radius: 42% 58% 65% 35% / 38% 62% 55% 45%;
    background-position: 40% 30%;
  }
  18.75% {
    border-radius: 48% 52% 52% 48% / 45% 50% 62% 38%;
    background-position: 60% 20%;
  }
  25% {
    border-radius: 55% 45% 38% 62% / 58% 42% 55% 45%;
    background-position: 80% 40%;
  }
  31.25% {
    border-radius: 42% 58% 48% 52% / 52% 48% 42% 58%;
    background-position: 100% 60%;
  }
  37.5% {
    border-radius: 35% 65% 55% 45% / 45% 55% 35% 65%;
    background-position: 80% 80%;
  }
  43.75% {
    border-radius: 48% 52% 62% 38% / 38% 62% 45% 55%;
    background-position: 60% 100%;
  }
  50% {
    border-radius: 60% 40% 48% 52% / 55% 45% 58% 42%;
    background-position: 40% 80%;
  }
  56.25% {
    border-radius: 52% 48% 38% 62% / 48% 52% 52% 48%;
    background-position: 20% 100%;
  }
  62.5% {
    border-radius: 38% 62% 45% 55% / 62% 38% 48% 52%;
    background-position: 0% 80%;
  }
  68.75% {
    border-radius: 45% 55% 55% 45% / 55% 45% 38% 62%;
    background-position: 20% 60%;
  }
  75% {
    border-radius: 62% 38% 42% 58% / 40% 60% 55% 45%;
    background-position: 40% 40%;
  }
  81.25% {
    border-radius: 52% 48% 50% 50% / 48% 52% 62% 38%;
    background-position: 60% 20%;
  }
  87.5% {
    border-radius: 40% 60% 58% 42% / 55% 45% 50% 50%;
    background-position: 40% 10%;
  }
  93.75% {
    border-radius: 55% 45% 48% 52% / 45% 55% 42% 58%;
    background-position: 20% 5%;
  }
  100% {
    border-radius: 65% 35% 55% 42% / 50% 58% 40% 48%;
    background-position: 0% 0%;
  }
}

/* ── 弹框出入场过渡动画 ── */
@keyframes overlayFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes overlayFadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes shellIn {
  from {
    transform: scale(0.75);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes shellOut {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.75);
    opacity: 0;
  }
}
</style>
