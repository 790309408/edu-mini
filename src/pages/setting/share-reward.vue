<template>
  <view class="share-reward-page" :style="themeVars">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="onBack">
        <text class="back-text">返回</text>
      </view>
      <text class="nav-title">分享得永久使用资格</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 主体内容 -->
    <view class="page-body">
      <!-- 左侧：进度 + 分享 -->
      <view class="left-panel">
        <view class="progress-card">
          <text class="progress-card-title">🎁 邀请进度</text>
          <view class="count-row">
            <text class="count-current">{{ sharedCount }}</text>
            <text class="count-sep"> / {{ shareTarget }}人</text>
          </view>
          <view class="progress-bar-wrap">
            <view class="progress-bar-bg">
              <view
                class="progress-bar-fill"
                :style="{ width: sharePercent + '%' }"
              />
            </view>
            <text class="progress-percent">{{ sharePercent }}%</text>
          </view>
          <view class="status-row">
            <text class="status-text" :class="{ achieved: isAchieved }">
              {{
                isAchieved
                  ? '恭喜达成！永久会员已解锁'
                  : '再分享 ' +
                    (shareTarget - sharedCount) +
                    ' 位好友，即可解锁永久会员'
              }}
            </text>
            <view v-if="isAchieved" class="achieved-tag">
              <text class="achieved-tag-text">已达成</text>
            </view>
          </view>

          <!-- 分享提示 -->
          <view class="share-tips">
            <text class="tips-text"
              >分享至育儿群、妈妈闺蜜群、英语启蒙群、家长群、业主群</text
            >
            <text class="tips-hint">→ 点击率更高哦！</text>
          </view>
        </view>

        <!-- 分享按钮 -->
        <button class="share-btn" open-type="share">
          <text class="share-btn-icon">💬</text>
          <text class="share-btn-text">分享给好友或群聊</text>
        </button>
      </view>

      <!-- 右侧：活动卡片（单卡内堆叠） -->
      <view class="right-panel">
        <view class="activity-card">
          <!-- 活动一 -->
          <view class="badge-row">
            <view class="badge-tag"
              ><text class="badge-tag-text">活动一</text></view
            >
            <text class="activity-title inline">限时活动</text>
          </view>
          <view class="activity-highlight">
            <text class="highlight-text"
              >分享{{ shareTarget }}人，即得永久不限次数！</text
            >
            <text class="highlight-emphasis">限前100名！</text>
            <text class="highlight-sub"
              >（真宠粉福利，先到先到！错过无！）</text
            >
          </view>

          <!-- 分割线 -->
          <view class="card-divider" />

          <!-- 活动二 + 二维码并排 -->
          <view class="act2-row">
            <view class="act2-content">
              <view class="badge-row">
                <view class="badge-tag"
                  ><text class="badge-tag-text">活动二</text></view
                >
                <text class="activity-title inline">推广活动</text>
              </view>
              <view class="activity-highlight">
                <text class="highlight-text"
                  >参与分享打卡，成为宝宝星盒种草推荐官，免费领永久使用资格，还有超多收益奖励！</text
                >
                <text class="highlight-sub">成为推荐官领奖励🎁</text>
              </view>
            </view>
            <!-- 二维码（右对齐，大尺寸） -->
            <view class="qrcode-slot" v-if="freeQrcodeUrl">
              <view class="qrcode-frame">
                <image
                  class="qrcode-img"
                  :src="freeQrcodeUrl"
                  :show-menu-by-longpress="true"
                  mode="aspectFit"
                />
              </view>
              <text class="qrcode-tip">长按识别添加二维码</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部版本信息 -->
    <view class="version-bar">
      <text class="version-text">v{{ appVersion }}</text>
      <text class="version-dot">·</text>
      <text class="copyright-text">© 2026 宝宝星盒</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { guardedOnShow } from '@/utils/auth-guard'
import {
  getBindCount,
  getShareConfig,
  getQrcodeListByType,
  type ShareConfig,
} from '@/apis'
import { useTheme } from '@/utils/theme'

const { themeVars } = useTheme()

/** 版本号 */
const appVersion = ref('1.0.0')

/** 分享目标人数 */
const shareTarget = ref(10)
/** 已分享人数 */
const sharedCount = ref(0)

/** 分享进度百分比 */
const sharePercent = computed(() => {
  if (!shareTarget.value) return 0
  return Math.min(
    100,
    Math.round((sharedCount.value / shareTarget.value) * 100),
  )
})

/** 是否已达成目标 */
const isAchieved = computed(() => sharedCount.value >= shareTarget.value)

/** 分享配置 */
const shareConfig = ref<ShareConfig | null>(null)

/** 二维码（type=1 免费领取） */
const freeQrcodeUrl = ref('')

/** 获取绑定好友数量 */
async function fetchBindCount() {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId
  if (!userId) return
  try {
    const data = await getBindCount(userId)
    const threshold = Number(data && data.threshold) || 10
    const count = Number(data && data.count) || 0
    if (threshold > 0) shareTarget.value = threshold
    sharedCount.value = Math.min(count, shareTarget.value)
  } catch (e) {
    console.error('获取绑定好友数量失败:', e)
  }
}

/** 获取分享配置 */
async function fetchShareConfig() {
  try {
    const data = await getShareConfig()
    if (data) shareConfig.value = data
  } catch (e) {
    console.error('获取分享配置失败:', e)
  }
}

/** 获取二维码（type=1） */
async function fetchFreeQrcode() {
  try {
    const data = await getQrcodeListByType(2)
    if (!data || !data.length) return
    const images = data[0].images || []
    if (images.length) freeQrcodeUrl.value = images[0].imageUrl || ''
  } catch (e) {
    console.error('获取二维码失败:', e)
  }
}

/** 刷新所有数据 */
function refreshAll() {
  fetchBindCount()
  fetchShareConfig()
  fetchFreeQrcode()
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
    title: friend?.title || '宝宝爱听 — 免费儿童教育视频',
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
    title: timeline?.title || '宝宝爱听 — 免费儿童教育视频',
    query: userId ? `userId=${userId}` : '',
    imageUrl: timeline?.imageUrl || '',
  }
})
</script>

<style lang="less" scoped>
.share-reward-page {
  --theme-start: #f9b0d0;
  --theme-end: #e8608c;
  --theme-shadow-rgb: 232, 96, 140;
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  padding-left: env(safe-area-inset-left);
}

// ── 导航栏（与设置页统一）──
.nav-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 5.2vw;
  padding: 0 2vw;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
}

.nav-back {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0.5vw 1.8vw;
  border-radius: 1.6vw;
  background: rgba(255, 255, 255, 0.3);
}

.back-text {
  font-size: 1.6vw;
  color: #fff;
  font-weight: 600;
}

.nav-title {
  font-size: 2vw;
  font-weight: bold;
  color: #fff;
}

.nav-placeholder {
  width: 3.6vw;
  flex-shrink: 0;
}

// ── 主体内容 ──
.page-body {
  flex: 1;
  height: 0;
  display: flex;
  flex-direction: row;
  padding: 1.2vw 3vw;
  gap: 2.4vw;
  box-sizing: border-box;
  overflow: hidden;
}

// ── 左侧面板 ──
.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.8vw;
  justify-content: center;
}

.progress-card {
  background: #fff;
  border-radius: 2vw;
  padding: 2.2vw 2.4vw;
  box-shadow: 0 0.4vw 1.4vw rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1.2vw;
}

.progress-card-title {
  font-size: 1.8vw;
  font-weight: bold;
  color: #333;
}

.count-row {
  display: flex;
  align-items: baseline;
}

.count-current {
  font-size: 5.2vw;
  font-weight: bold;
  color: var(--theme-end);
  line-height: 1;
}

.count-sep {
  font-size: 2.2vw;
  color: #999;
  margin-left: 0.4vw;
}

.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 1vw;
}

.progress-bar-bg {
  flex: 1;
  height: 1.8vw;
  background: #f0f0f0;
  border-radius: 0.9vw;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--theme-start), var(--theme-end));
  border-radius: 0.9vw;
  transition: width 0.4s ease;
}

.progress-percent {
  font-size: 1.7vw;
  font-weight: bold;
  color: var(--theme-end);
  flex-shrink: 0;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 1vw;
}

.status-text {
  font-size: 1.8vw;
  font-weight: 600;
  color: var(--theme-end);

  &.achieved {
    color: #52c41a;
    font-weight: 700;
  }
}

.achieved-tag {
  flex-shrink: 0;
  background: #52c41a;
  border-radius: 1vw;
  padding: 0.3vw 1.2vw;
}

.achieved-tag-text {
  font-size: 1.2vw;
  color: #fff;
  font-weight: bold;
}

// 分享提示
.share-tips {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3vw;
  background: #fff8eb;
  border-radius: 1.2vw;
  padding: 1vw 1.4vw;
  margin-top: 0.4vw;
}

.tips-text {
  font-size: 1.3vw;
  color: #666;
  line-height: 1.4;
  text-align: center;
}

.tips-hint {
  font-size: 1.3vw;
  color: var(--theme-end);
  font-weight: 600;
}

// 分享按钮
.share-btn {
  width: 100%;
  height: 5.6vw;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8vw;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  border-radius: 2.8vw;
  border: none;
  padding: 0;
  margin: 0;
  line-height: normal;
  box-shadow: 0 0.5vw 2vw rgba(var(--theme-shadow-rgb), 0.35);

  &::after {
    border: none;
  }
  &:active {
    transform: scale(0.97);
  }
}

.share-btn-icon {
  font-size: 2.4vw;
}

.share-btn-text {
  font-size: 1.8vw;
  font-weight: bold;
  color: #fff;
}

// ── 右侧面板 ──
.right-panel {
  flex: 1.2;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.activity-card {
  background: #fff;
  border-radius: 2vw;
  padding: 2vw 2.4vw;
  box-shadow: 0 0.4vw 1.4vw rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1vw;
  width: 100%;
  box-sizing: border-box;
}

.badge-tag-text {
  font-size: 1.3vw;
  color: #fff;
  font-weight: bold;
}

// 活动二角标（内联行）
.badge-row {
  display: flex;
  align-items: center;
  gap: 0.8vw;
}

.badge-tag {
  background: #ff4d4f;
  border-radius: 0.8vw;
  padding: 0.2vw 0.9vw;
  flex-shrink: 0;
}

.activity-title {
  font-size: 1.8vw;
  font-weight: bold;
  color: #333;
  margin-top: 0.4vw;

  &.inline {
    margin-top: 0;
  }
}

.activity-highlight {
  background: rgba(var(--theme-shadow-rgb), 0.08);
  border: 1px solid rgba(var(--theme-shadow-rgb), 0.2);
  border-radius: 1.2vw;
  padding: 0.8vw 1.4vw;
}

.highlight-text {
  font-size: 1.5vw;
  font-weight: bold;
  color: var(--theme-end);
  line-height: 1.55;
}

.highlight-emphasis {
  display: inline;
  font-size: 1.7vw;
  font-weight: 900;
  color: #d43030;
  margin-left: 0.2vw;
}

.highlight-sub {
  display: block;
  font-size: 1.3vw;
  color: #e85d04;
  font-weight: 600;
  margin-top: 0.4vw;
  line-height: 1.4;
}

// 活动二与二维码并排
.act2-row {
  display: flex;
  align-items: center;
  gap: 1.8vw;
}

.act2-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1vw;
}

// 分割线
.card-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 0.2vw 0;
}

.qrcode-slot {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5vw;
}

.qrcode-frame {
  padding: 0.5vw;
  border: 0.3vw solid var(--theme-end);
  border-radius: 1.4vw;
  background: #fff;
  box-shadow: 0 0.3vw 1vw rgba(var(--theme-shadow-rgb), 0.2);
}

.qrcode-img {
  width: 18vw;
  height: 18vw;
  border-radius: 0.8vw;
  display: block;
}

.qrcode-tip {
  font-size: 1.2vw;
  color: #555;
  font-weight: 500;
  margin-top: 0.2vw;
}

.qrcode-tip-hint {
  font-size: 1.2vw;
  color: var(--theme-end);
  font-weight: 700;
}

// ── 底部版本信息 ──
.version-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5vw;
  padding: 0.4vw 0;
}

.version-text,
.version-dot,
.copyright-text {
  font-size: 1.2vw;
  color: #bbb;
}

.version-dot {
  color: #ddd;
}
</style>

<style lang="less">
page {
  height: 100%;
}
</style>
