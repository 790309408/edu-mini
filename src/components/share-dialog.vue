<template>
  <view v-if="visible" class="share-overlay" @tap="onOverlayTap">
    <view class="share-container" @tap.stop>
      <!-- 关闭按钮 -->
      <view class="close-btn" @tap="onClose">
        <text class="close-icon">×</text>
      </view>

      <!-- 装饰星星 -->
      <text class="deco-star star-1">✦</text>
      <text class="deco-star star-2">★</text>
      <text class="deco-star star-3">✦</text>

      <!-- 标题区 -->
      <view class="title-section">
        <text class="main-title">分享得永久资格</text>
        <view class="activity-tag">
          <text class="activity-tag-text">限时活动</text>
        </view>
      </view>

      <!-- 云朵装饰 -->
      <view class="deco-cloud cloud-left" />
      <view class="deco-cloud cloud-right" />

      <!-- 规则区 -->
      <view class="rules-section">
        <!-- 规则一 -->
        <view class="rule-item">
          <view class="rule-badge">
            <text class="rule-badge-text">①</text>
          </view>
          <view class="rule-body">
            <text class="rule-text">分享{{ shareTarget }}人，即得永久</text>
          </view>
          <view class="rule-dot-right" />
        </view>

        <!-- 规则二 -->
        <view class="rule-item">
          <view class="rule-badge">
            <text class="rule-badge-text">②</text>
          </view>
          <view class="rule-body">
            <text class="rule-text">发布抖音，拿 </text>
            <text class="rule-gift">🎁</text>
            <text class="rule-text"> 奖励</text>
          </view>
          <view class="rule-dot-right" />
        </view>

        <!-- 名额有限标签 -->
        <view class="limited-badge">
          <text class="limited-badge-text">名额有限</text>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="btn-section">
        <view class="btn-cancel" @tap="onClose">
          <text class="btn-cancel-text">关闭</text>
        </view>
        <view class="btn-confirm" @tap="onConfirm">
          <text class="btn-confirm-text">去查看</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** 是否显示弹框 */
    visible: boolean
    /** 分享目标人数 */
    shareTarget?: number
    /** 点击遮罩是否关闭 */
    closeOnOverlay?: boolean
  }>(),
  {
    shareTarget: 10,
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
.share-overlay {
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

.share-container {
  position: relative;
  width: 36vw;
  padding: 2.6vw 2.4vw 2vw;
  border-radius: 2.4vw;
  background: linear-gradient(180deg, #ffb6c8 0%, #ff9ab5 40%, #ff85a8 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: visible;
  box-shadow: 0 1vw 4vw rgba(0, 0, 0, 0.15);
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
  background: rgba(255, 255, 255, 0.35);
  z-index: 5;
}

.close-icon {
  font-size: 2vw;
  color: #fff;
  line-height: 1;
}

/* 装饰星星 */
.deco-star {
  position: absolute;
  color: #ffe066;
  z-index: 1;
  text-shadow: 0 0.2vw 0.4vw rgba(255, 200, 0, 0.5);
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

/* 标题区 */
.title-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1vw;
  margin-bottom: 2vw;
  z-index: 2;
}

.main-title {
  font-size: 3.2vw;
  font-weight: 900;
  color: #fff;
  text-shadow:
    0.2vw 0.2vw 0 #d4306a,
    -0.1vw -0.1vw 0 #d4306a,
    0.1vw -0.1vw 0 #d4306a,
    -0.1vw 0.1vw 0 #d4306a;
  letter-spacing: 0.2vw;
}

.activity-tag {
  background: #4a90e2;
  border-radius: 1.2vw;
  padding: 0.3vw 1.6vw;
}

.activity-tag-text {
  font-size: 1.4vw;
  font-weight: bold;
  color: #fff;
}

/* 云朵装饰 */
.deco-cloud {
  position: absolute;
  width: 6vw;
  height: 2.4vw;
  background: rgba(255, 255, 255, 0.25);
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
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
}

.deco-cloud::after {
  content: '';
  position: absolute;
  top: -0.4vw;
  left: 3vw;
  width: 1.8vw;
  height: 1.8vw;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
}

.cloud-left {
  left: -1vw;
  top: 8vw;
}

.cloud-right {
  right: -0.6vw;
  bottom: 6vw;
}

/* 规则区 */
.rules-section {
  width: 88%;
  display: flex;
  flex-direction: column;
  gap: 1.2vw;
  margin-bottom: 2vw;
  z-index: 2;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 0.8vw;
}

.rule-badge {
  width: 2.8vw;
  height: 2.8vw;
  border-radius: 50%;
  background: #ffe066;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0.2vw 0.6vw rgba(255, 200, 0, 0.4);
}

.rule-badge-text {
  font-size: 1.6vw;
  font-weight: 800;
  color: #333;
}

.rule-body {
  flex: 1;
  display: flex;
  align-items: center;
  background: #fff5d6;
  border-radius: 1.4vw;
  padding: 1vw 1.4vw;
  box-shadow: 0 0.2vw 0.6vw rgba(0, 0, 0, 0.06);
}

.rule-text {
  font-size: 1.8vw;
  font-weight: 700;
  color: #333;
}

.rule-gift {
  font-size: 2vw;
}

.rule-dot-right {
  width: 0.8vw;
  height: 0.8vw;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

/* 名额有限标签 */
.limited-badge {
  align-self: flex-end;
  background: #ffe066;
  border: 0.2vw solid #e6c200;
  border-radius: 1vw;
  padding: 0.3vw 1.2vw;
  margin-top: 0.2vw;
  transform: rotate(-3deg);
}

.limited-badge-text {
  font-size: 1.4vw;
  font-weight: 800;
  color: #8b6914;
}

/* 底部按钮 */
.btn-section {
  width: 86%;
  display: flex;
  gap: 1.6vw;
  z-index: 2;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  height: 4.2vw;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2.1vw;
}

.btn-cancel {
  background: #fff;
  border: 0.2vw solid #e0e0e0;
}

.btn-cancel-text {
  font-size: 1.8vw;
  font-weight: 600;
  color: #666;
}

.btn-confirm {
  background: #4a90e2;
  box-shadow: 0 0.4vw 1.2vw rgba(74, 144, 226, 0.4);
}

.btn-confirm-text {
  font-size: 1.8vw;
  font-weight: bold;
  color: #fff;
}
</style>
