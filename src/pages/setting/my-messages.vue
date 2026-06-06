<template>
  <view class="my-messages-page" :style="themeVars">
    <!-- 通用导航栏 -->
    <NavBar title="我的留言" @back="onBack" />

    <!-- 内容区域 -->
    <scroll-view scroll-y class="messages-content" :show-scrollbar="false">
      <view class="messages-body">
        <view v-if="loading" class="list-empty">
          <text class="empty-text">加载中...</text>
        </view>
        <view v-else-if="messages.length === 0" class="list-empty">
          <text class="empty-icon">📭</text>
          <text class="empty-text">暂无留言记录</text>
        </view>
        <view v-else class="list-body">
          <view
            v-for="item in messages"
            :key="item.id"
            class="message-item-wrap"
          >
            <view
              class="message-item"
              :style="{
                transform: 'translateX(' + (item._offsetX || 0) + 'px)',
              }"
              @touchstart="onTouchStart($event, item)"
              @touchmove="onTouchMove($event, item)"
              @touchend="onTouchEnd($event, item)"
            >
              <view class="message-main">
                <text class="message-content">{{ item.content }}</text>
                <text class="message-time">{{
                  formatTime(item.createTime)
                }}</text>
              </view>
            </view>
            <view
              class="delete-action"
              :class="{ visible: item._offsetX && item._offsetX < -30 }"
              @tap="onDeleteTap(item)"
            >
              <text class="delete-text">删除</text>
            </view>
          </view>
        </view>
        <view v-if="messages.length > 0" class="load-more">
          <text class="load-more-text">{{
            hasMore ? '上拉加载更多' : '— 没有更多了 —'
          }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 删除确认弹框 -->
    <view v-if="showDeleteConfirm" class="confirm-mask" @tap="onCancelDelete">
      <view class="confirm-dialog" @tap.stop>
        <text class="confirm-title">确认删除</text>
        <text class="confirm-desc">确定要删除这条留言吗？删除后不可恢复。</text>
        <view class="confirm-actions">
          <view class="confirm-btn btn-cancel" @tap="onCancelDelete">
            <text class="btn-cancel-text">取消</text>
          </view>
          <view class="confirm-btn btn-delete" @tap="onConfirmDelete">
            <text class="btn-delete-text">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { guardedOnShow } from '@/utils/auth-guard'
import { getMyMessages, deleteMessage, type MessageItem } from '@/apis'
import NavBar from '@/components/nav-bar.vue'
import { useTheme } from '@/utils/theme'

const { themeVars } = useTheme()

interface MessageItemUI extends MessageItem {
  _offsetX?: number
  _startX?: number
  _startY?: number
  _swiping?: boolean
}

const messages = ref<MessageItemUI[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)

const showDeleteConfirm = ref(false)
const pendingDeleteItem = ref<MessageItemUI | null>(null)

async function fetchMessages(reset = false) {
  if (reset) {
    page.value = 1
    hasMore.value = true
  }
  if (!hasMore.value && !reset) return
  loading.value = true
  try {
    const data = await getMyMessages(page.value, pageSize)
    if (data && data.list) {
      const validList = data.list.filter((item) => item.status !== 2)
      if (reset) {
        messages.value = validList.map((item) => ({ ...item, _offsetX: 0 }))
      } else {
        messages.value.push(
          ...validList.map((item) => ({ ...item, _offsetX: 0 })),
        )
      }
      if (data.list.length < pageSize) {
        hasMore.value = false
      }
    } else {
      if (reset) messages.value = []
      hasMore.value = false
    }
  } catch (e) {
    console.error('获取留言列表失败:', e)
    if (reset) messages.value = []
  } finally {
    loading.value = false
  }
}

function onLoadMore() {
  if (loading.value || !hasMore.value) return
  page.value++
  fetchMessages()
}

guardedOnShow(() => {
  fetchMessages(true)
})

function formatTime(timeStr: string) {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const DELETE_BTN_WIDTH = 80

function resetAllSwipe(exceptId?: number) {
  messages.value.forEach((item) => {
    if (item.id !== exceptId) {
      item._offsetX = 0
    }
  })
}

function onTouchStart(e: any, item: MessageItemUI) {
  const touch = e.touches[0]
  item._startX = touch.clientX
  item._startY = touch.clientY
  item._swiping = false
  resetAllSwipe(item.id)
}

function onTouchMove(e: any, item: MessageItemUI) {
  const touch = e.touches[0]
  const deltaX = touch.clientX - (item._startX || 0)
  const deltaY = Math.abs(touch.clientY - (item._startY || 0))
  if (!item._swiping && deltaY > Math.abs(deltaX)) return
  item._swiping = true
  if (deltaX < 0) {
    item._offsetX = Math.max(-DELETE_BTN_WIDTH, deltaX)
  } else {
    item._offsetX = 0
  }
}

function onTouchEnd(e: any, item: MessageItemUI) {
  if (!item._swiping) return
  if ((item._offsetX || 0) < -DELETE_BTN_WIDTH / 2) {
    item._offsetX = -DELETE_BTN_WIDTH
  } else {
    item._offsetX = 0
  }
}

function onDeleteTap(item: MessageItemUI) {
  pendingDeleteItem.value = item
  showDeleteConfirm.value = true
}

function onCancelDelete() {
  showDeleteConfirm.value = false
  pendingDeleteItem.value = null
  resetAllSwipe()
}

async function onConfirmDelete() {
  const item = pendingDeleteItem.value
  if (!item) return
  showDeleteConfirm.value = false
  try {
    await deleteMessage(item.id)
    messages.value = messages.value.filter((m) => m.id !== item.id)
    uni.showToast({ title: '删除成功', icon: 'success' })
  } catch (err: any) {
    uni.showToast({
      title: err?.msg || err?.message || '删除失败',
      icon: 'none',
    })
  } finally {
    pendingDeleteItem.value = null
  }
}

function onBack() {
  uni.navigateBack()
}
</script>

<style lang="less" scoped>
.my-messages-page {
  --theme-start: #f9b0d0;
  --theme-end: #e8608c;
  --theme-shadow-rgb: 232, 96, 140;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #fff8fb 0%, #f5f5f5 100%);
  overflow: hidden;
  box-sizing: border-box;
}

.messages-content {
  flex: 1;
  height: 0;
  padding: 4vw;
  box-sizing: border-box;
}

.messages-body {
  display: flex;
  flex-direction: column;
}

.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16vw 0;
  gap: 2vw;
}

.empty-icon {
  font-size: 12vw;
}

.empty-text {
  font-size: 3.4vw;
  color: #999;
}

.list-body {
  display: flex;
  flex-direction: column;
  gap: 3vw;
}

.message-item-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 3vw;
}

.message-item {
  position: relative;
  background: #fff;
  border-radius: 3vw;
  padding: 4vw;
  box-shadow: 0 0.4vw 1.2vw rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease;
  z-index: 1;
}

.message-main {
  display: flex;
  flex-direction: column;
  gap: 2vw;
}

.message-content {
  font-size: 3.4vw;
  color: #333;
  line-height: 1.6;
  word-break: break-all;
}

.message-time {
  font-size: 2.6vw;
  color: #bbb;
}

.delete-action {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 80px;
  background: #ff4d4f;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 3vw 3vw 0;
  z-index: 0;
}

.delete-text {
  font-size: 3.4vw;
  color: #fff;
  font-weight: 600;
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4vw 0;
}

.load-more-text {
  font-size: 2.8vw;
  color: #ccc;
}

.confirm-mask {
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

.confirm-dialog {
  width: 70vw;
  background: #fff;
  border-radius: 3vw;
  padding: 6vw 5vw 4vw;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.confirm-title {
  font-size: 4.4vw;
  font-weight: 700;
  color: #333;
  margin-bottom: 2vw;
}

.confirm-desc {
  font-size: 3.2vw;
  color: #666;
  text-align: center;
  margin-bottom: 5vw;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  flex-direction: row;
  gap: 3vw;
  width: 100%;
}

.confirm-btn {
  flex: 1;
  height: 10vw;
  border-radius: 5vw;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-cancel {
  background: #f5f5f5;
}

.btn-cancel-text {
  font-size: 3.6vw;
  font-weight: 600;
  color: #666;
}

.btn-delete {
  background: #ff4d4f;
}

.btn-delete-text {
  font-size: 3.6vw;
  font-weight: 600;
  color: #fff;
}
</style>

<style lang="less">
page {
  height: 100%;
}
</style>
