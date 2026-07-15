<template>
  <view class="invite-list-page" :style="themeVars">
    <!-- 通用导航栏 -->
    <NavBar title="我的邀请" @back="onBack" />

    <!-- 内容区域 -->
    <scroll-view scroll-y class="invite-content" :show-scrollbar="false">
      <view class="invite-body">
        <!-- 邀请进度卡片 -->
        <view class="progress-card">
          <view class="card-header">
            <text class="card-icon">🎁</text>
            <text class="card-title">邀请好友领福利</text>
          </view>
          <text class="card-desc"
            >邀请{{ shareTarget }}位好友即可解锁全部内容</text
          >

          <!-- 进度条 -->
          <view class="progress-row">
            <view class="progress-bar-bg">
              <view
                class="progress-bar-fill"
                :style="{ width: sharePercent + '%' }"
              />
            </view>
            <text class="progress-text"
              >{{ sharedCount }}/{{ shareTarget }}</text
            >
          </view>

          <!-- 好友槽位 -->
          <scroll-view
            scroll-x
            class="share-avatars"
            :show-scrollbar="false"
            :enhanced="true"
          >
            <view class="avatars-track">
              <view
                v-for="i in shareTarget"
                :key="i"
                class="avatar-slot"
                :class="{ filled: i <= sharedCount }"
              >
                <text class="avatar-text">{{
                  i <= sharedCount ? '✓' : i
                }}</text>
              </view>
            </view>
          </scroll-view>

          <button class="share-btn" open-type="share">
            <text class="share-btn-text">立即分享给好友</text>
          </button>
        </view>

        <!-- 邀请列表 -->
        <view class="list-section">
          <view class="list-header">
            <text class="list-title">邀请记录</text>
            <text class="list-count">共 {{ invitedList.length }} 人</text>
          </view>

          <view v-if="loading" class="list-empty">
            <text class="empty-text">加载中...</text>
          </view>

          <view v-else-if="invitedList.length === 0" class="list-empty">
            <text class="empty-icon">📭</text>
            <text class="empty-text">暂无邀请记录，快去邀请好友吧！</text>
          </view>

          <view v-else class="list-body">
            <view
              v-for="item in invitedList"
              :key="item.userId"
              class="invite-item"
            >
              <image
                class="item-avatar"
                :src="item.avatarUrl || defaultAvatar"
              />
              <view class="item-info">
                <text class="item-name">{{ item.nickName || '微信用户' }}</text>
                <text class="item-id">ID: {{ item.userId }}</text>
                <text class="item-time">{{ formatTime(item.joinTime) }}</text>
              </view>
              <view class="item-right">
                <text class="item-reward"
                  >+{{ item.rewardViews || 0 }}次奖励</text
                >
                <text class="item-badge">已加入</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { guardedOnShow } from '@/utils/auth-guard'
import {
  getBindCount,
  getInvitedList,
  getShareConfig,
  type InvitedItem,
  type ShareConfig,
} from '@/apis'
import NavBar from '@/components/nav-bar.vue'
import { useTheme } from '@/utils/theme'

const { themeVars } = useTheme()

const DEFAULT_AVATAR = '/static/default-avatar.svg'
const defaultAvatar = DEFAULT_AVATAR

/** 分享目标人数 */
const shareTarget = ref(5)
/** 已分享人数 */
const sharedCount = ref(0)
/** 进度百分比 */
const sharePercent = computed(() => {
  if (!shareTarget.value) return 0
  return Math.min(
    100,
    Math.round((sharedCount.value / shareTarget.value) * 100),
  )
})

/** 邀请列表 */
const invitedList = ref<InvitedItem[]>([])
/** 加载状态 */
const loading = ref(false)

/** 分享配置 */
const shareConfig = ref<ShareConfig | null>(null)

/** 获取分享配置 */
async function fetchShareConfig() {
  try {
    const data = await getShareConfig()
    if (data) shareConfig.value = data
  } catch (e) {
    console.error('获取分享配置失败:', e)
  }
}

/** 获取绑定数量 */
async function fetchBindCount() {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId
  if (!userId) return
  try {
    const data = await getBindCount(userId)
    const threshold = Number(data && data.threshold) || 0
    const count = Number(data && data.count) || 0
    if (threshold > 0) shareTarget.value = threshold
    sharedCount.value = Math.min(count, shareTarget.value)
  } catch (e) {
    console.error('获取绑定好友数量失败:', e)
  }
}

/** 获取邀请列表 */
async function fetchInvitedList() {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId
  if (!userId) return
  loading.value = true
  try {
    const data = await getInvitedList(userId)
    invitedList.value = data || []
  } catch (e) {
    console.error('获取邀请列表失败:', e)
    invitedList.value = []
  } finally {
    loading.value = false
  }
}

/** 格式化时间 */
function formatTime(timeStr: string) {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 刷新所有数据 */
function refreshAll() {
  fetchBindCount()
  fetchShareConfig()
  fetchInvitedList()
}

// 原生 onShow：立即刷新，不等待鉴权
onShow(() => {
  refreshAll()
})

// guardedOnShow：鉴权完成后再次刷新，确保数据最新
guardedOnShow(() => {
  refreshAll()
})

/** 返回 */
function onBack() {
  uni.navigateBack()
}

/** 分享给好友 */
onShareAppMessage(() => {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId ? userInfo.userId : ''
  const friend = shareConfig.value?.friend
  return {
    title: friend?.title || '宝宝星盒 - 免费儿童启蒙动画绘本故事',
    desc: friend?.desc || '',
    path: userId ? `/pages/index/index?userId=${userId}` : '/pages/index/index',
    imageUrl: friend?.imageUrl || '',
  }
})

/** 分享到朋友圈 */
onShareTimeline(() => {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId ? userInfo.userId : ''
  const timeline = shareConfig.value?.timeline
  return {
    title: timeline?.title || '宝宝星盒 - 免费儿童启蒙动画绘本故事',
    query: userId ? `userId=${userId}` : '',
    imageUrl: timeline?.imageUrl || '',
  }
})
</script>

<style lang="less" scoped>
.invite-list-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #fff8fb 0%, #f5f5f5 100%);
  overflow: hidden;
  box-sizing: border-box;
}

.invite-content {
  flex: 1;
  height: 0;
  padding: 4vw;
  box-sizing: border-box;
}

.invite-body {
  display: flex;
  flex-direction: column;
  gap: 4vw;
}

// 进度卡片
.progress-card {
  background: #fff;
  border-radius: 3vw;
  padding: 5vw;
  box-shadow: 0 0.4vw 1.6vw rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 2vw;
}

.card-icon {
  font-size: 5vw;
  margin-right: 2vw;
}

.card-title {
  font-size: 4.4vw;
  font-weight: bold;
  color: #333;
}

.card-desc {
  font-size: 3vw;
  color: #888;
  margin-bottom: 3vw;
}

// 进度条
.progress-row {
  display: flex;
  align-items: center;
  gap: 3vw;
  margin-bottom: 3vw;
}

.progress-bar-bg {
  flex: 1;
  height: 2.4vw;
  background: #eee;
  border-radius: 1.2vw;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--theme-start), var(--theme-end));
  border-radius: 1.2vw;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 3.2vw;
  font-weight: bold;
  color: var(--theme-end);
  white-space: nowrap;
}

// 好友槽位
.share-avatars {
  width: 100%;
  margin-bottom: 3vw;
  white-space: nowrap;
  overflow: hidden;
  box-sizing: border-box;
}

.avatars-track {
  display: inline-flex;
  gap: 2.4vw;
  padding: 0.4vw 0;
}

.avatar-slot {
  flex-shrink: 0;
  width: 10vw;
  height: 10vw;
  border-radius: 50%;
  background: #f0f0f0;
  border: 0.4vw dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;

  &.filled {
    background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
    border: 0.4vw solid var(--theme-end);
  }
}

.avatar-text {
  font-size: 3.6vw;
  color: #999;

  .filled & {
    color: #fff;
    font-weight: bold;
  }
}

// 分享按钮
.share-btn {
  width: 100%;
  height: 10vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  border-radius: 5vw;
  border: none;
  padding: 0;
  margin: 0;
  line-height: normal;
  box-shadow: 0 0.4vw 1.2vw rgba(var(--theme-shadow-rgb), 0.4);

  &::after {
    border: none;
  }
}

.share-btn-text {
  font-size: 3.6vw;
  font-weight: bold;
  color: #fff;
}

// 邀请列表
.list-section {
  background: #fff;
  border-radius: 3vw;
  padding: 4vw 5vw;
  box-shadow: 0 0.4vw 1.6vw rgba(0, 0, 0, 0.06);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3vw;
}

.list-title {
  font-size: 4vw;
  font-weight: bold;
  color: #333;
}

.list-count {
  font-size: 3vw;
  color: #999;
}

.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8vw 0;
  gap: 2vw;
}

.empty-icon {
  font-size: 10vw;
}

.empty-text {
  font-size: 3vw;
  color: #999;
}

.list-body {
  display: flex;
  flex-direction: column;
}

.invite-item {
  display: flex;
  align-items: center;
  padding: 3vw 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.item-avatar {
  width: 10vw;
  height: 10vw;
  border-radius: 50%;
  background: #f0f0f0;
  flex-shrink: 0;
  margin-right: 3vw;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8vw;
}

.item-name {
  font-size: 3.4vw;
  font-weight: 500;
  color: #333;
}

.item-id {
  font-size: 2.4vw;
  color: #bbb;
}

.item-time {
  font-size: 2.6vw;
  color: #bbb;
}

.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1.2vw;
  flex-shrink: 0;
}

.item-reward {
  font-size: 2.6vw;
  color: var(--theme-end);
  font-weight: 500;
}

.item-badge {
  font-size: 2.6vw;
  color: #52c41a;
  background: rgba(82, 196, 26, 0.1);
  padding: 0.8vw 2vw;
  border-radius: 2vw;
  flex-shrink: 0;
}
</style>

<style lang="less">
page {
  height: 100%;
}
</style>
