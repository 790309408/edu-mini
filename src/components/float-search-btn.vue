<template>
  <!-- 悬浮搜索按钮（可拖动） -->
  <view class="float-search" :style="positionStyle">
    <!-- 拖动热区 -->
    <view
      class="drag-layer"
      @touchstart.passive="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @tap.stop="goSearch"
    />
    <!-- 胶囊形搜索按钮 -->
    <view class="search-btn" :class="{ pressing: isPressing }">
      <!-- 纯 CSS 放大镜图标 -->
      <!-- 放大镜图标 -->
      <view class="icon-search">
        <view class="icon-lens"></view>
        <view class="icon-stick"></view>
      </view>
      <text class="btn-label">搜索</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

/** 按钮位置（transform GPU 加速） */
const posX = ref(0)
const posY = ref(0)

/** 拖动状态 */
let isDragging = false
let startX = 0
let startY = 0
let startPosX = 0
let startPosY = 0
let hasMoved = false

/** 按下态 */
const isPressing = ref(false)

/** 惯性滑动 */
const DAMPING = 0.92
let velocityX = 0
let velocityY = 0
let lastMoveTime = 0
let inertiaFrame = 0

const STORAGE_KEY = 'float_search_btn_pos'
const BTN_W = 72
const BTN_H = 36
const DRAG_THRESHOLD = 5

onMounted(() => {
  const info = uni.getWindowInfo()
  const saved = uni.getStorageSync(STORAGE_KEY) as
    | { x: number; y: number }
    | undefined
  if (saved && saved.x > 0 && saved.y > 0) {
    posX.value = saved.x
    posY.value = saved.y
  } else {
    posX.value = info.windowWidth - BTN_W - 16
    posY.value = info.windowHeight * 0.72
  }
})

const positionStyle = computed(() => ({
  transform: `translate3d(${posX.value}px, ${posY.value}px, 0)`,
}))

function onTouchStart(e: TouchEvent) {
  cancelInertia()
  const touch = e.touches[0]
  startX = touch.clientX
  startY = touch.clientY
  startPosX = posX.value
  startPosY = posY.value
  isDragging = true
  hasMoved = false
  velocityX = 0
  velocityY = 0
  lastMoveTime = Date.now()
  isPressing.value = true
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging) return
  const touch = e.touches[0]
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY
  if (
    !hasMoved &&
    (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
  ) {
    hasMoved = true
    isPressing.value = false
  }
  if (!hasMoved) return
  const info = uni.getWindowInfo()
  const maxX = info.windowWidth - BTN_W
  const maxY = info.windowHeight - BTN_H
  const newX = Math.max(0, Math.min(startPosX + dx, maxX))
  const newY = Math.max(0, Math.min(startPosY + dy, maxY))
  const now = Date.now()
  const dt = now - lastMoveTime
  if (dt > 0) {
    velocityX = ((newX - posX.value) / dt) * 16
    velocityY = ((newY - posY.value) / dt) * 16
  }
  lastMoveTime = now
  posX.value = newX
  posY.value = newY
}

function onTouchEnd() {
  if (!isDragging) return
  isDragging = false
  isPressing.value = false
  if (hasMoved) {
    startInertia()
    setTimeout(() => {
      uni.setStorageSync(STORAGE_KEY, { x: posX.value, y: posY.value })
    }, 400)
  }
}

function startInertia() {
  cancelInertia()
  const info = uni.getWindowInfo()
  const maxX = info.windowWidth - BTN_W
  const maxY = info.windowHeight - BTN_H

  function step() {
    velocityX *= DAMPING
    velocityY *= DAMPING
    if (Math.abs(velocityX) < 0.3 && Math.abs(velocityY) < 0.3) {
      snapToEdge(info.windowWidth, maxX, maxY)
      return
    }
    let nx = posX.value + velocityX
    let ny = posY.value + velocityY
    if (nx < 0) {
      nx = 0
      velocityX = -velocityX * 0.3
    }
    if (nx > maxX) {
      nx = maxX
      velocityX = -velocityX * 0.3
    }
    if (ny < 0) {
      ny = 0
      velocityY = -velocityY * 0.3
    }
    if (ny > maxY) {
      ny = maxY
      velocityY = -velocityY * 0.3
    }
    posX.value = nx
    posY.value = ny
    inertiaFrame = requestAnimationFrame(step)
  }
  inertiaFrame = requestAnimationFrame(step)
}

function snapToEdge(screenW: number, maxX: number, maxY: number) {
  const centerX = posX.value + BTN_W / 2
  const targetX = centerX < screenW / 2 ? 8 : maxX - 8
  const startSnapX = posX.value
  const startSnapY = Math.max(0, Math.min(posY.value, maxY))
  let progress = 0
  function snapStep() {
    progress += 0.06
    if (progress >= 1) {
      posX.value = targetX
      posY.value = startSnapY
      uni.setStorageSync(STORAGE_KEY, { x: posX.value, y: posY.value })
      return
    }
    const ease = 1 - Math.pow(1 - progress, 3)
    posX.value = startSnapX + (targetX - startSnapX) * ease
    posY.value = startSnapY
    inertiaFrame = requestAnimationFrame(snapStep)
  }
  inertiaFrame = requestAnimationFrame(snapStep)
}

function cancelInertia() {
  if (inertiaFrame) {
    cancelAnimationFrame(inertiaFrame)
    inertiaFrame = 0
  }
}

/** 点击跳转搜索页 */
function goSearch() {
  if (hasMoved) return
  uni.navigateTo({ url: '/pages/search/index' })
}
</script>

<style lang="less" scoped>
.float-search {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 999;
  will-change: transform;
  pointer-events: none;

  .search-btn {
    pointer-events: auto;
  }
}

.drag-layer {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  width: 72px;
  height: 36px;
  will-change: transform;
  pointer-events: auto;
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 14px 0 10px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  box-shadow:
    0 2px 10px rgba(var(--theme-shadow-rgb), 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.3s ease;

  &.pressing {
    transform: scale(0.9);
    box-shadow: 0 1px 4px rgba(var(--theme-shadow-rgb), 0.25);
  }
}

.btn-label {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  line-height: 1;
}

.icon-search {
  position: relative;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.icon-lens {
  position: absolute;
  top: 1.5px;
  left: 1.5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.8px solid #fff;
  box-sizing: border-box;
}

// 手柄起点紧贴镜片外缘 45° 处（圆心5,5 半径5 → 边缘≈8.5,8.5）
// 手柄高1.8px，center=0.9，top=8.5-0.9=7.6，整体居中偏移+1.5
.icon-stick {
  position: absolute;
  top: 9.1px;
  left: 10px;
  width: 6px;
  height: 1.8px;
  background: #fff;
  border-radius: 1px;
  transform: rotate(45deg);
  transform-origin: left center;
}
</style>
