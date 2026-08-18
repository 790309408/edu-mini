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
          <text class="dialog-title">{{ displayTitle }}</text>
        </view>

        <!-- 会员到期模式：剩余天数提示 -->
        <view v-if="isExpire && remainDays" class="remain-days-section">
          <text class="remain-days-label">会员剩余</text>
          <text class="remain-days-num">{{ remainDays }}</text>
          <text class="remain-days-label">天到期</text>
        </view>

        <!-- 二维码 -->
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
          </view>
        </view>

        <!-- 展示文字 -->
        <text v-if="textContent" class="qrcode-tip">{{ textContent }}</text>

        <!-- 知道了按钮 -->
        <view class="confirm-btn" @tap="onClose">
          <text class="confirm-btn-text">我知道了</text>
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
  /** 弹框模式：announce=系统公告，expire=会员到期提醒 */
  mode?: 'announce' | 'expire'
  /** 弹框标题（接口未返回时按模式取默认值） */
  title?: string | null
  /** 展示文字 */
  textContent?: string
  /** 二维码图片地址 */
  qrcodeUrl?: string
  /** 距会员到期剩余天数（仅到期模式有值） */
  remainDays?: number | null
  /** 点击遮罩是否关闭，默认 true */
  closeOnOverlay?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'close'): void
}>()

const isClosing = ref(false)

/** 是否为会员到期模式 */
const isExpire = computed(() => props.mode === 'expire')

/** 标题：优先接口返回，兜底按模式取默认文案 */
const displayTitle = computed(() => {
  if (props.title) return props.title
  return isExpire.value ? '会员到期提醒' : '系统公告'
})

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
  // 默认允许点遮罩关闭
  if (props.closeOnOverlay === false) return
  onClose()
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
  padding: 3vw 2vw 2.4vw;
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

/* 剩余天数 */
.remain-days-section {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 1.2vw;
  z-index: 2;
}

.remain-days-label {
  font-size: 1.6vw;
  font-weight: 600;
  color: #8a7a6a;
}

.remain-days-num {
  font-size: 2.8vw;
  font-weight: 800;
  color: #e85d5d;
  margin: 0 0.3vw;
  line-height: 1;
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

/* 展示文字 */
.qrcode-tip {
  display: block;
  text-align: center;
  font-size: 1.2vw;
  font-weight: 400;
  color: #8a7a6a;
  margin-bottom: 1.4vw;
  line-height: 1.6;
  max-width: 30vw;
}

/* 知道了按钮 */
.confirm-btn {
  height: 4vw;
  padding: 0 3.4vw;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2vw;
  background: linear-gradient(90deg, #ff9a8b, #e8608c);
  box-shadow: 0 0.3vw 1vw rgba(232, 96, 140, 0.35);
  z-index: 2;
}

.confirm-btn-text {
  font-size: 1.6vw;
  font-weight: bold;
  color: #ffffff;
  letter-spacing: 0.1vw;
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
