<template>
  <view v-if="visible" class="success-overlay" @tap="onOverlayTap">
    <view class="success-container" @tap.stop>
      <!-- 成功图标 -->
      <view class="success-icon-wrap">
        <view class="success-icon">
          <text class="success-check">✓</text>
        </view>
      </view>

      <!-- 标题 -->
      <text class="success-title">{{ title }}</text>

      <!-- 描述 -->
      <text v-if="content" class="success-content">{{ content }}</text>

      <!-- 确认按钮 -->
      <view class="success-btn" @tap="onConfirm">
        <text class="success-btn-text">{{ confirmText }}</text>
      </view>

      <!-- 关闭按钮 -->
      <view class="close-btn" @tap="onClose">
        <text class="close-icon">×</text>
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
    /** 描述内容 */
    content?: string
    /** 确认按钮文字 */
    confirmText?: string
    /** 点击遮罩是否关闭，默认 false */
    closeOnOverlay?: boolean
  }>(),
  {
    title: '兑换成功',
    content: '恭喜您，兑换码已成功兑换',
    confirmText: '我知道了',
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
  emit('update:visible', false)
  emit('confirm')
}
</script>

<style scoped>
.success-overlay {
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

.success-container {
  position: relative;
  width: 36vw;
  padding: 3vw 2.4vw 2.4vw;
  border-radius: 1.6vw;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 成功图标 */
.success-icon-wrap {
  margin-bottom: 1.6vw;
}

.success-icon {
  width: 7vw;
  height: 7vw;
  border-radius: 50%;
  background: linear-gradient(135deg, #8ed96a, #5bbf3f);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0.4vw 1.2vw rgba(91, 191, 63, 0.35);
}

.success-check {
  font-size: 4vw;
  color: #ffffff;
  font-weight: bold;
  line-height: 1;
  margin-top: -0.2vw;
}

/* 标题 */
.success-title {
  font-size: 2.2vw;
  font-weight: bold;
  color: #333333;
  margin-bottom: 1vw;
}

/* 描述 */
.success-content {
  font-size: 1.4vw;
  color: #888888;
  text-align: center;
  margin-bottom: 2vw;
  line-height: 1.6;
}

/* 确认按钮 */
.success-btn {
  width: 80%;
  height: 4vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  border-radius: 2vw;
}

.success-btn-text {
  font-size: 1.8vw;
  font-weight: bold;
  color: #ffffff;
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 0.8vw;
  right: 0.8vw;
  width: 3vw;
  height: 3vw;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.15);
}

.close-icon {
  font-size: 2vw;
  color: #ffffff;
  line-height: 1;
}
</style>
