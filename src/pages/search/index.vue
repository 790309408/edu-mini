<template>
  <view class="search-page" :style="themeVars">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-back" @tap="goBack">
          <view class="back-arrow"></view>
        </view>
        <text class="nav-title">搜索</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar-wrap">
      <view class="search-bar">
        <view class="bar-icon">
          <view class="icon-search">
            <view class="icon-lens"></view>
            <view class="icon-stick"></view>
          </view>
        </view>
        <input
          class="bar-input"
          v-model="keyword"
          placeholder="搜索精彩内容..."
          placeholder-class="bar-placeholder"
          confirm-type="search"
          focus
          @confirm="doSearch"
        />
        <view v-if="keyword" class="bar-clear" @tap="clearKeyword">
          <view class="clear-x clear-x1"></view>
          <view class="clear-x clear-x2"></view>
        </view>
      </view>
      <view class="btn-search" @tap="doSearch">
        <text class="btn-search-text">搜索</text>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view scroll-y class="content-area">
      <!-- 搜索加载动画 -->
      <view v-if="loading" class="loading-wrap">
        <view class="loading-ring">
          <view class="ring-dot"></view>
        </view>
        <text class="loading-text">正在搜索精彩内容...</text>
      </view>

      <!-- 搜索结果 -->
      <view v-else-if="searched">
        <view v-if="!results.length" class="empty-wrap">
          <image
            class="empty-qrcode"
            src="https://vod.babytime.top/7b92ebcf79cc40f2ab70b55291761e2c?a=0&auth_key=2096765798-165e1a85e1a448bf92185e5e15034e33-0-2a974150a210fc2cee2b9740baac68e5"
            mode="aspectFit"
          />
          <text class="empty-text"
            >当前您搜索的课程不方便展示，请联系我们沟通</text
          >
        </view>
        <view v-else class="card-grid">
          <view
            v-for="(item, cardIdx) in results"
            :key="item.id"
            class="card-item"
            @tap="onItemTap(item)"
          >
            <view class="card-cover">
              <image
                v-if="item.cover"
                class="cover-img"
                :src="item.cover"
                mode="aspectFill"
              />
              <view
                v-else
                class="cover-placeholder"
                :style="{ background: getPlaceholderBg(cardIdx) }"
              >
                <text class="placeholder-text">{{ item.title }}</text>
              </view>
              <view v-if="item.isVip === 1" class="vip-badge">
                <text class="vip-text">VIP</text>
              </view>
              <view v-if="item.episodes > 1" class="episode-badge">
                <text class="episode-text">{{ item.episodes }}集</text>
              </view>
            </view>
            <view class="card-title">
              <text class="title-text">{{ item.title }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 默认内容：热门搜索 + 内容分类 -->
      <view v-else class="default-content">
        <!-- 热门搜索 -->
        <view v-if="hotKeywords.length" class="section">
          <view class="section-header">
            <view class="hot-icon">
              <view class="hot-flame"></view>
            </view>
            <text class="section-title">热门搜索</text>
          </view>
          <view class="tag-grid">
            <view
              v-for="(kw, idx) in hotKeywords"
              :key="idx"
              class="tag-item"
              :class="{ 'is-hot': idx < 2 }"
              @tap="onHotKeywordTap(kw)"
            >
              <text v-if="idx < 2" class="hot-badge">热</text>
              <text class="tag-text">{{ kw }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCategoryList, searchCourse, type SearchResultItem } from '@/apis'
import { useTheme } from '@/utils/theme'

const { themeVars } = useTheme()

/** 状态栏高度，iOS 上 getWindowInfo 可能返回 0，需多策略兼容 */
const statusBarHeight = ref(45)
try {
  const sysInfo = uni.getSystemInfoSync()
  const h = sysInfo.statusBarHeight
  if (h && h > 0) {
    statusBarHeight.value = h
  } else {
    const winInfo = uni.getWindowInfo()
    const wh = winInfo.statusBarHeight
    if (wh && wh > 0) {
      statusBarHeight.value = wh
    }
  }
} catch (_e) {
  // 获取失败时保持默认 45px
}
const keyword = ref('')
const searched = ref(false)
const loading = ref(false)

interface ResultItem {
  id: number
  title: string
  cover: string
  episodes: number
  isVip: number
  contentType?: number
  content?: string
}

const results = ref<ResultItem[]>([])
const hotKeywords = ref<string[]>([])

onLoad(async (query) => {
  if (query && query.keyword) {
    keyword.value = query.keyword
    doSearch()
  } else {
    loadDefaultContent()
  }
})

/** 加载默认内容：热门搜索词 */
async function loadDefaultContent() {
  try {
    const list = await getCategoryList(21)
    if (!list || !list.length) return
    hotKeywords.value = list.slice(0, 6).map((c) => c.name)
  } catch (e) {
    console.error('加载默认内容失败:', e)
  }
}

function clearKeyword() {
  keyword.value = ''
  results.value = []
  searched.value = false
}

async function doSearch() {
  const val = keyword.value.trim()
  if (!val) return
  loading.value = true
  searched.value = false
  try {
    const userInfo = uni.getStorageSync('wx_user_info') as any
    const userId = userInfo && userInfo.userId
    const data = await searchCourse(val, userId)
    if (data) {
      results.value = data.map((item: SearchResultItem) => ({
        id: item.id,
        title: item.name,
        cover: item.cover || '',
        episodes: item.totalEpisodes,
        isVip: item.isVip,
        contentType: item.contentType,
        content: item.content,
      }))
    } else {
      results.value = []
    }
  } catch (e) {
    console.error('搜索失败:', e)
    results.value = []
  } finally {
    loading.value = false
    searched.value = true
  }
}

function onHotKeywordTap(kw: string) {
  keyword.value = kw
  doSearch()
}

function onItemTap(item: ResultItem) {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const isVip =
    userInfo && userInfo.vip === true && Number(userInfo.vipType) > 0
  if (item.isVip === 1 && !isVip) {
    uni.showToast({ title: '该内容为 VIP 专享', icon: 'none' })
    return
  }
  if (item.contentType === 2) {
    uni.setStorageSync('article_content', {
      id: item.id,
      title: item.title,
      content: item.content || '',
      tabId: 0,
    })
    uni.navigateTo({ url: `/pages/article/index?typeId=${item.id}` })
    return
  }
  uni.setStorageSync('video_course_cover', item.cover || '')
  uni.navigateTo({ url: `/pages/video/index?typeId=${item.id}` })
}

/** 搜索结果占位渐变色 */
const placeholderColors = [
  'linear-gradient(135deg, #FF9A9E, #FAD0C4)',
  'linear-gradient(135deg, #A18CD1, #FBC2EB)',
  'linear-gradient(135deg, #FAD0C4, #FFD1FF)',
  'linear-gradient(135deg, #84FAB0, #8FD3F4)',
  'linear-gradient(135deg, #FFC3A0, #FFAFBD)',
  'linear-gradient(135deg, #667EEA, #764BA2)',
  'linear-gradient(135deg, #F6D365, #FDA085)',
  'linear-gradient(135deg, #89F7FE, #66A6FF)',
  'linear-gradient(135deg, #FDDB92, #D1FDFF)',
  'linear-gradient(135deg, #A1C4FD, #C2E9FB)',
]

function getPlaceholderBg(index: number): string {
  return placeholderColors[index % placeholderColors.length]
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="less" scoped>
.search-page {
  width: 100%;
  height: 100%;
  background: #f7f7fa;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 导航栏
.nav-bar {
  flex-shrink: 0;
  background: #fff;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 90rpx;
  padding: 0 24rpx;
}

.nav-back {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.5;
  }
}

.back-arrow {
  width: 10px;
  height: 10px;
  border-left: 2.2px solid #333;
  border-bottom: 2.2px solid #333;
  transform: rotate(45deg);
  margin-left: 3px;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #222;
}

.nav-placeholder {
  width: 32px;
}

// 搜索栏
.search-bar-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 12px;
  background: #fff;
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  border-radius: 20px;
  background: #f5f5f5;
  gap: 8px;
}

.bar-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.icon-search {
  position: relative;
  width: 16px;
  height: 16px;
}

.icon-lens {
  position: absolute;
  top: 1.5px;
  left: 1.5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.8px solid #bbb;
  box-sizing: border-box;
}

.icon-stick {
  position: absolute;
  top: 9.1px;
  left: 10px;
  width: 6px;
  height: 1.8px;
  background: #bbb;
  border-radius: 1px;
  transform: rotate(45deg);
  transform-origin: left center;
}

.bar-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  font-size: 14px;
  color: #333;
  background: transparent;
  border: none;
  outline: none;
}

.bar-placeholder {
  color: #bbb;
  font-size: 14px;
}

.bar-clear {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-x {
  position: absolute;
  width: 8px;
  height: 1.6px;
  background: #999;
  border-radius: 0.8px;

  &.clear-x1 {
    transform: rotate(45deg);
  }
  &.clear-x2 {
    transform: rotate(-45deg);
  }
}

.btn-search {
  flex-shrink: 0;
  padding: 0 4px;

  &:active {
    opacity: 0.6;
  }

  .btn-search-text {
    font-size: 15px;
    font-weight: 600;
    color: var(--theme-end);
  }
}

// 内容区域
.content-area {
  flex: 1;
  height: 0;
}

.default-content {
  padding: 0 16px 24px;
}

.section {
  margin-top: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

// 火焰图标
.hot-icon {
  position: relative;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.hot-flame {
  width: 10px;
  height: 14px;
  background: linear-gradient(0deg, #ff6b35, #ffb347);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 5px;
    height: 7px;
    background: linear-gradient(0deg, #ffd700, #ff6b35);
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  }
}

// 分类图标
.cat-icon {
  position: relative;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
}

.cat-dot {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--theme-end);
}

.cat-bar {
  width: 3px;
  border-radius: 1.5px;
  background: var(--theme-end);
}

.cat-bar1 {
  height: 8px;
}
.cat-bar2 {
  height: 12px;
}
.cat-bar3 {
  height: 6px;
}

// 热门标签
.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 14px;
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  &:active {
    background: #f0f0f0;
  }

  &.is-hot {
    background: #fff5f2;
  }
}

.hot-badge {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: #ff6b35;
  border-radius: 4px;
  padding: 1px 3px;
  line-height: 1;
}

.tag-text {
  font-size: 13px;
  color: #444;
  line-height: 1;
}

// 搜索结果 - 两列卡片网格
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px 16px 24px;
}

.card-item {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);

  &:active {
    transform: scale(0.97);
  }
}

.card-cover {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 62%;
  overflow: hidden;
}

.cover-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  box-sizing: border-box;

  .placeholder-text {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: bold;
    text-align: center;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }
}

.vip-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  border-radius: 6px;
  padding: 2px 6px;
  box-shadow: 0 1px 4px rgba(var(--theme-shadow-rgb), 0.4);
  display: flex;
  align-items: center;
  justify-content: center;

  .vip-text {
    font-size: 10px;
    color: #fff;
    font-weight: bold;
    letter-spacing: 0.5px;
    line-height: 1;
  }
}

.episode-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 6px;
  padding: 2px 6px;
  display: flex;
  align-items: center;
  justify-content: center;

  .episode-text {
    font-size: 10px;
    color: #fff;
    font-weight: bold;
    line-height: 1;
  }
}

.card-title {
  padding: 8px 6px;
  min-height: 40px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;

  .title-text {
    font-size: 13px;
    color: #333;
    font-weight: 500;
    max-width: 100%;
    line-height: 1.4;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-all;
  }
}

// 加载动画
.loading-wrap {
  width: 100%;
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  animation: fadeIn 0.3s ease;
}

.loading-ring {
  position: relative;
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  border: 5rpx solid transparent;
  border-top-color: var(--theme-start);
  border-right-color: var(--theme-end);
  animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  box-shadow: 0 0 16rpx rgba(var(--theme-shadow-rgb), 0.2);
}

.ring-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14rpx;
  height: 14rpx;
  margin-top: -7rpx;
  margin-left: -7rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  animation: pulse 1.2s ease-in-out infinite;
}

.loading-text {
  font-size: 26rpx;
  color: rgba(var(--theme-shadow-rgb), 0.5);
  letter-spacing: 1rpx;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.empty-wrap {
  width: 100%;
  min-height: 60vh;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  box-sizing: border-box;
}

.empty-qrcode {
  width: 200px;
  height: 200px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(var(--theme-shadow-rgb), 0.15);
}

.empty-text {
  font-size: 15px;
  color: #666;
  text-align: center;
  line-height: 1.8;
  max-width: 280px;
}
</style>
