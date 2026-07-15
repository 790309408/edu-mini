<template>
  <view class="page" :style="themeVars">
    <!-- 顶部标签栏 -->
    <view class="tab-bar">
      <!-- 固定导航 tab -->
      <view class="nav-tabs">
        <view
          v-for="(tab, i) in navTabs"
          :key="'nav-' + i"
          class="tab-item"
          @tap="onTabChange(tab.index)"
        >
          <text class="tab-text">{{ tab.name }}</text>
        </view>
      </view>
      <!-- 可滚动内容 tab -->
      <scroll-view
        scroll-x
        class="tab-scroll"
        :show-scrollbar="false"
        :scroll-into-view="scrollIntoTabId"
        scroll-with-animation
      >
        <view class="tab-list">
          <view
            v-for="(tab, i) in contentTabs"
            :key="'content-' + i"
            :id="'ctab-' + i"
            class="tab-item"
            :class="{ active: currentTab === tab.index }"
            @tap="onTabChange(tab.index)"
          >
            <text class="tab-text">{{ tab.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 内容区域：左右滑动切换 tab -->
    <swiper
      class="content-swiper"
      :current="swiperIndex"
      @change="onSwiperChange"
      :duration="250"
    >
      <swiper-item v-for="(tabKey, idx) in contentTabKeys" :key="tabKey">
        <scroll-view scroll-y class="content-area">
          <!-- 首次加载过渡动画 -->
          <view v-if="loadingTabs[tabKey]" class="loading-wrap">
            <view class="loading-ring">
              <view class="ring-dot"></view>
            </view>
            <text class="loading-text">正在加载精彩内容...</text>
          </view>
          <view v-else class="card-grid">
            <view
              v-for="(item, cardIdx) in tabDataMap[tabKey]"
              :key="item.id"
              class="card-item"
              @tap="onCardTap(item)"
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
        </scroll-view>
      </swiper-item>
    </swiper>

    <!-- 分享弹框（底层） -->
    <share-dialog
      :visible="showShareDialog"
      :share-target="shareTarget"
      @close="showShareDialog = false"
      @confirm="onShareDialogConfirm"
    />

    <!-- 免费领取弹框（顶层） -->
    <free-dialog
      v-model:visible="showFreeDialog"
      :name="freeName"
      :text-content="freeTextContent"
      :qrcode-url="freeQrcodeUrl"
      :remain-count="remainCount"
      :close-on-overlay="true"
      @close="onFreeDialogClose"
      @confirm="onRedeemConfirm"
    />

    <!-- 兑换成功弹框 -->
    <success-dialog
      v-model:visible="showSuccessDialog"
      title="兑换成功"
      content="恭喜您，兑换码已成功兑换，快去畅享精彩内容吧！"
    />

    <!-- 悬浮搜索按钮 -->
    <float-search-btn />

    <!-- VIP 引流弹框：点击 VIP 课程且非会员时弹出 -->
    <vip-dialog
      v-model:visible="showVipDialog"
      :title="vipName"
      :subtitle="vipTextContent"
      :qrcode-url="vipQrcodeUrl"
      :close-on-overlay="true"
      @confirm="onVipDialogConfirm"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { guardedOnLoad, guardedOnShow } from '@/utils/auth-guard'
import {
  getTabList,
  getCategoryList,
  getQrcodeListByType,
  getShareConfig,
  bindUser,
  redeemCode as apiRedeemCode,
  type TabItem,
  type CategoryItem,
  type QrcodeItem,
  type ShareConfig,
} from '@/apis'
import FreeDialog from '@/components/free-dialog.vue'
import ShareDialog from '@/components/share-dialog.vue'
import SuccessDialog from '@/components/success-dialog.vue'
import VipDialog from '@/components/vip-dialog.vue'
import FloatSearchBtn from '@/components/float-search-btn.vue'

import { getUserInfo } from '@/utils/auth'
import { useTheme } from '@/utils/theme'

const { themeVars } = useTheme()

interface Tab {
  name: string
  id?: number
  /** 特殊导航 tab（不参与 swiper / 数据加载） */
  isNav?: boolean
  /** 导航跳转地址 */
  navUrl?: string
  /** 固定在左侧不随滚动 */
  fixed?: boolean
}

interface CourseItem {
  id: number
  title: string
  cover: string
  episodes: number
  isVip?: number
  /** 内容类型：1=视频，2=图文 */
  contentType?: number
  /** 图文富文本内容 */
  content?: string
}

/** 底部菜单已移除 */

/** 页面可用高度（px） */
const windowHeight = ref(0)
/** tab 栏高度（px），通过 query 获取 */
const tabBarHeight = ref(0)
/** swiper 实际高度（px） */
const swiperHeight = computed(() => {
  if (!windowHeight.value || !tabBarHeight.value) return 0
  return windowHeight.value - tabBarHeight.value
})

function updateWindowHeight() {
  const info = uni.getWindowInfo()
  windowHeight.value = info.windowHeight
}

/** 获取 tab 栏实际渲染高度 */
function updateTabBarHeight() {
  const query = uni.createSelectorQuery()
  query
    .select('.tab-bar')
    .boundingClientRect((rect: any) => {
      if (rect) {
        tabBarHeight.value = rect.height
      }
    })
    .exec()
}

updateWindowHeight()

guardedOnShow(() => {
  // 每次页面显示时重新获取窗口高度，防止 vh 单位不稳定
  updateWindowHeight()
  updateTabBarHeight()
  fetchShareConfig()
})

const tabs = ref<Tab[]>([])

const currentTab = ref(0)

/** 从接口获取 tab 列表 */
async function fetchTabs() {
  try {
    const data = await getTabList()
    if (data && data.length) {
      // 所有 tab 均从接口动态获取，接口未返回则不显示
      tabs.value = data.map((item) => {
        // 固定导航型 tab：设置
        if (item.name === '设置') {
          return {
            name: item.name,
            isNav: true,
            fixed: true,
            navUrl: '/pages/setting/index',
          }
        }
        // 导航型 tab：分享福利
        if (item.name === '分享福利') {
          return {
            name: item.name,
            isNav: true,
            navUrl: '/pages/setting/share-reward',
          }
        }
        // 普通内容 tab
        return { name: item.name, id: item.id }
      })
      // 定位到第一个内容 tab
      const firstContentIdx = tabs.value.findIndex((t) => !t.isNav)
      if (firstContentIdx >= 0) {
        currentTab.value = firstContentIdx
        previousTab.value = firstContentIdx
        fetchCategoryList(firstContentIdx)
      }
    }
  } catch (e) {
    console.error('获取 Tab 列表失败:', e)
  }
}

/** 已加载过的 tab（首次加载才显示 loading，后续静默刷新） */
const loadedTabs = ref<Set<number>>(new Set())
/** 正在首次加载的 tab */
const loadingTabs = ref<Record<number, boolean>>({})

/** 获取指定 tab 下的分类列表 */
async function fetchCategoryList(tabIndex: number) {
  const tab = tabs.value[tabIndex]
  if (!tab || !tab.id) return
  // 首次加载显示过渡动画，后续切换静默更新数据
  const isFirstLoad = !loadedTabs.value.has(tabIndex)
  if (isFirstLoad) {
    loadingTabs.value[tabIndex] = true
  }
  try {
    const data = await getCategoryList(tab.id)
    if (data) {
      tabDataMap.value[tabIndex] = data.map((item) => ({
        id: item.id,
        title: item.name,
        cover: item.cover || '',
        episodes: item.totalEpisodes,
        isVip: item.isVip,
        contentType: item.contentType,
        content: item.content,
      }))
      loadedTabs.value.add(tabIndex)
    }
  } catch (e) {
    console.error('获取分类列表失败:', e)
  } finally {
    if (isFirstLoad) {
      loadingTabs.value[tabIndex] = false
    }
  }
}

/** 切换 tab 时自动加载分类数据 */
watch(currentTab, (newTab) => {
  fetchCategoryList(newTab)
})

/** 占位封面渐变色组 */
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
  'linear-gradient(135deg, #F093FB, #F5576C)',
  'linear-gradient(135deg, #4FACFE, #00F2FE)',
]

function getPlaceholderBg(index: number): string {
  return placeholderColors[index % placeholderColors.length]
}

/** 各 tab 对应的分类数据（从接口获取） */
const tabDataMap = ref<Record<number, CourseItem[]>>({})

/** 标签栏滚动到当前激活 tab，偏移到前一个以居中显示 */
const scrollIntoTabId = computed(() => {
  const contentIdx = contentTabs.value.findIndex(
    (t) => t.index === currentTab.value,
  )
  const target = Math.max(contentIdx - 1, 0)
  return 'ctab-' + target
})

/** 固定型 tab（固定在左侧） */
const navTabs = computed(() => {
  return tabs.value
    .map((tab, index) => ({ ...tab, index }))
    .filter((tab) => tab.fixed)
})

/** 可滚动 tab（包含内容 tab + 非固定导航 tab） */
const contentTabs = computed(() => {
  return tabs.value
    .map((tab, index) => ({ ...tab, index }))
    .filter((tab) => !tab.fixed)
})

/** 内容区 tab keys（排除导航型 tab） */
const contentTabKeys = computed(() => {
  return tabs.value.map((_, idx) => idx).filter((idx) => !tabs.value[idx].isNav)
})

/** swiper 当前索引（从0开始，对应 contentTabKeys 下标） */
const swiperIndex = computed(() => {
  return contentTabKeys.value.indexOf(currentTab.value)
})

function onSwiperChange(e: any) {
  const idx = e.detail.current
  currentTab.value = contentTabKeys.value[idx]
}

function onTabChange(index: number) {
  const tab = tabs.value[index]
  // 导航型 tab：跳转后恢复原选中态
  if (tab.isNav) {
    currentTab.value = previousTab.value
    uni.navigateTo({ url: tab.navUrl || '/pages/setting/index' })
    return
  }
  previousTab.value = index
  currentTab.value = index
}

/** 最近一次选中的内容 tab 索引（用于导航 tab 跳回） */
const previousTab = ref(2)

/** 免费领取弹框 */
const showFreeDialog = ref(false)
const remainCount = ref(0)
const freeName = ref('')
const freeTextContent = ref('')
const freeQrcodeUrl = ref('')
/** 关闭 free-dialog 后是否弹出 share-dialog */
const pendingShareDialog = ref(false)
/** share-dialog 兜底定时器（free-dialog 未弹出时直接弹出 share-dialog） */
let shareDialogFallbackTimer: ReturnType<typeof setTimeout> | null = null

/** 取消兜底定时器 */
function cancelShareFallbackTimer() {
  if (shareDialogFallbackTimer) {
    clearTimeout(shareDialogFallbackTimer)
    shareDialogFallbackTimer = null
  }
}

/** free-dialog 关闭后，延迟弹出 share-dialog */
function onFreeDialogClose() {
  cancelShareFallbackTimer()
  if (pendingShareDialog.value) {
    pendingShareDialog.value = false
    setTimeout(() => {
      showShareDialog.value = true
    }, 100)
  }
}

/** 分享弹框 */
const showShareDialog = ref(false)
const shareTarget = ref(10)

/** 兑换成功弹框 */
const showSuccessDialog = ref(false)

/** VIP 引流弹框 */
const showVipDialog = ref(false)
const vipName = ref('')
const vipTextContent = ref('')
const vipQrcodeUrl = ref('')

/** 获取 VIP 引流弹框数据（type=2） */
async function fetchVipQrcode() {
  try {
    const data = await getQrcodeListByType(2)
    if (!data || !data.length) return
    const item = data[0]
    const images = item.images || []
    vipName.value = item.name || ''
    vipTextContent.value = item.textContent || ''
    vipQrcodeUrl.value = images[0]?.imageUrl || ''
  } catch (e) {
    console.error('获取 VIP 引流二维码失败:', e)
  }
}

function onVipDialogConfirm() {
  // 引导用户长按识别二维码，按钮点击后直接关闭弹框
  showVipDialog.value = false
}

/** 判断当前用户是否为 VIP */
function isUserVip(): boolean {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  if (!userInfo) return false
  return userInfo.vip === true && Number(userInfo.vipType) > 0
}

/** 本地存储 key：记录当前应取的二维码下标，每次冷启动循环递增 */
const QRCODE_INDEX_KEY = 'free_qrcode_index'

/** 获取非会员免费领取二维码弹框数据，并处理 share-dialog 兜底 */
async function fetchFreeQrcode() {
  // 非会员：标记关闭 free-dialog 后弹出 share-dialog
  pendingShareDialog.value = true

  try {
    const data = await getQrcodeListByType(1)
    if (!data || !data.length) {
      triggerShareDialogFallback()
      return
    }
    const item = data[0]
    const images = item.images || []
    if (!images.length) {
      triggerShareDialogFallback()
      return
    }

    // 读取上次缓存的下标，超出范围自动取模
    let idx = Number(uni.getStorageSync(QRCODE_INDEX_KEY)) || 0
    if (idx < 0 || isNaN(idx)) idx = 0
    idx = idx % images.length

    freeName.value = item.name || ''
    freeTextContent.value = item.textContent || ''
    freeQrcodeUrl.value = images[idx].imageUrl || ''

    // 下次冷启动取下一个，循环使用
    const nextIdx = (idx + 1) % images.length
    uni.setStorageSync(QRCODE_INDEX_KEY, nextIdx)

    // 弹出 free-dialog，关闭后再弹 share-dialog
    cancelShareFallbackTimer()
    showFreeDialog.value = true
  } catch (e) {
    console.error('获取免费领取二维码失败:', e)
    triggerShareDialogFallback()
  }
}

/** 非永久会员（vipType 1-4）：直接弹出 share-dialog */
function showShareDialogForTempVip() {
  setTimeout(() => {
    showShareDialog.value = true
  }, 800)
}

/** 兜底：free-dialog 未能弹出时，直接弹出 share-dialog */
function triggerShareDialogFallback() {
  cancelShareFallbackTimer()
  shareDialogFallbackTimer = setTimeout(() => {
    if (!showFreeDialog.value && pendingShareDialog.value) {
      pendingShareDialog.value = false
      showShareDialog.value = true
    }
  }, 2000)
}

/** 处理分享进入时的用户绑定逻辑 */
async function handleShareBind(bindUserId: string | number) {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const currentUserId = userInfo && userInfo.userId
  if (!currentUserId) return
  // 自己分享给自己无需绑定
  if (String(currentUserId) === String(bindUserId)) return
  try {
    await bindUser(currentUserId, bindUserId)
  } catch (e) {
    console.error('绑定分享用户失败:', e)
  }
}

/** 处理从分享链接进入：自动定位到图文所在 tab 并跳转文章页 */
async function handleArticleShare(tabId: number, articleId: number) {
  // 等待 tab 列表加载完成
  await fetchTabs()
  // 找到对应的内容 tab
  const tabIndex = tabs.value.findIndex((t) => t.id === tabId && !t.isNav)
  if (tabIndex < 0) return
  // 切换到对应 tab 并加载分类数据
  currentTab.value = tabIndex
  previousTab.value = tabIndex
  const data = await getCategoryList(tabId)
  if (data) {
    tabDataMap.value[tabIndex] = data.map((item) => ({
      id: item.id,
      title: item.name,
      cover: item.cover || '',
      episodes: item.totalEpisodes,
      isVip: item.isVip,
      contentType: item.contentType,
      content: item.content,
    }))
    loadedTabs.value.add(tabIndex)
  }
  // 找到目标文章并写入 storage，然后跳转
  const article = (tabDataMap.value[tabIndex] || []).find(
    (item) => item.id === articleId,
  )
  if (article) {
    uni.setStorageSync('article_content', {
      id: article.id,
      title: article.title,
      content: article.content || '',
      tabId,
    })
    uni.navigateTo({ url: `/pages/article/index?typeId=${articleId}` })
  }
}

guardedOnLoad((query) => {
  // 从分享链接进入：图文文章直达
  if (query && query.articleId && query.tabId) {
    handleArticleShare(Number(query.tabId), Number(query.articleId))
  } else {
    fetchTabs()
  }
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const vipType = userInfo ? Number(userInfo.vipType) : 0
  const isVip = userInfo && userInfo.vip === true && vipType > 0

  if (userInfo && !isVip) {
    // 非会员：弹出免费领取弹框（free-dialog）+ 关闭后弹 share-dialog
    remainCount.value = Number(userInfo.freeViewRemain) || 0
    fetchFreeQrcode()
    fetchVipQrcode()
  } else if (userInfo && isVip && vipType !== 5) {
    // 非永久会员（vipType 1-4）：只弹 share-dialog
    remainCount.value = Number(userInfo.freeViewRemain) || 0
    fetchVipQrcode()
    showShareDialogForTempVip()
  }
  // 从分享链接进入：携带 userId 时调用绑定接口
  if (query && query.userId) {
    handleShareBind(query.userId)
  }
  // 获取分享目标人数
  fetchShareTarget()
})

/** 获取分享目标人数 */
async function fetchShareTarget() {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId
  if (!userId) return
  try {
    const { getBindCount } = await import('@/apis')
    const data = await getBindCount(userId)
    if (data && data.threshold) shareTarget.value = data.threshold
  } catch (e) {
    // ignore
  }
}

/** 分享弹框“去查看”跳转 */
function onShareDialogConfirm() {
  showShareDialog.value = false
  uni.navigateTo({ url: '/pages/setting/share-reward' })
}

async function onRedeemConfirm(code: string) {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId
  if (!userId) {
    uni.showToast({ title: '用户信息丢失，请重试', icon: 'none' })
    return
  }
  try {
    await apiRedeemCode(userId, code)
    showFreeDialog.value = false
    // 兑换成功后刷新登录接口，同步最新用户信息（vip / vipType / freeViewRemain 等）
    try {
      await getUserInfo()
    } catch (refreshErr) {
      console.error('兑换后刷新用户信息失败:', refreshErr)
    }
    showSuccessDialog.value = true
  } catch (e) {
    console.error('兑换失败:', e)
  }
}

function onCardTap(item: CourseItem) {
  console.log('点击课程:', item.title)
  // VIP 课程且当前用户不是 VIP，弹出引流弹框
  if (item.isVip === 1 && !isUserVip()) {
    showVipDialog.value = true
    return
  }
  // 图文类型：跳转图文页面（富文本通过 storage 传递，避免 URL 长度限制）
  if (item.contentType === 2) {
    const currentTabData = tabs.value[currentTab.value]
    uni.setStorageSync('article_content', {
      id: item.id,
      title: item.title,
      content: item.content || '',
      tabId: currentTabData?.id || 0,
    })
    uni.navigateTo({ url: `/pages/article/index?typeId=${item.id}` })
    return
  }
  // 默认视频类型
  uni.setStorageSync('video_course_cover', item.cover || '')
  uni.navigateTo({ url: `/pages/video/index?typeId=${item.id}` })
}

/** 分享配置（从接口获取） */
const shareConfig = ref<ShareConfig | null>(null)

/** 获取分享配置 */
async function fetchShareConfig() {
  try {
    const data = await getShareConfig()
    if (data) {
      shareConfig.value = data
    }
  } catch (e) {
    console.error('获取分享配置失败:', e)
  }
}

/** 分享给好友（微信分享回调） */
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

/** 联系客服 / 兑换入口已移至设置页 */
</script>

<style lang="less" scoped>
// rpx 在横屏小程序中基于竖屏宽度计算，会导致二次进入尺寸异常
// 改用 vw 单位：Xrpx → (X / 750 * 100)vw
@card-gap: 2.667vw;
@card-columns: 4;
@card-radius: 2.667vw;

.page {
  width: 100%;
  height: 100%;
  background-color: rgba(var(--theme-shadow-rgb), 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  padding-left: env(safe-area-inset-left);
}

// 顶部标签栏
.tab-bar {
  flex-shrink: 0;
  padding: 1.067vw 4vw 0.8vw;
  display: flex;
  align-items: center;
  gap: 1.867vw;
}

// 固定导航 tab
.nav-tabs {
  display: flex;
  align-items: center;
  gap: 1.867vw;
  flex-shrink: 0;
}

.tab-scroll {
  white-space: nowrap;
  flex: 1;
}

.tab-list {
  display: inline-flex;
  align-items: center;
  gap: 1.867vw;
  padding-right: 8vw;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 5vw;
  padding: 0 2.8vw;
  border-radius: 2.5vw;
  background-color: rgba(200, 170, 220, 0.4);
  flex-shrink: 0;
  transition: all 0.25s ease;

  .tab-text {
    font-size: 1.8vw;
    color: rgba(var(--theme-shadow-rgb), 0.7);
    letter-spacing: 0.133vw;
    white-space: nowrap;
  }

  &.active {
    background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
    box-shadow: 0 0.533vw 2.133vw rgba(var(--theme-shadow-rgb), 0.5);
    transform: translateY(-0.133vw);

    .tab-text {
      font-weight: 600;
      color: #fff;
      letter-spacing: 0.2vw;
    }
  }
}

// 内容区域 swiper
.content-swiper {
  flex: 1;
  width: 100%;
  overflow: hidden;
}

.content-area {
  height: 100%;
  box-sizing: border-box;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: @card-gap;
  padding: 0 4vw 5.333vw;
  box-sizing: border-box;
}

.loading-wrap {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.4vw;
  animation: fadeIn 0.3s ease;
}

.loading-ring {
  position: relative;
  width: 7vw;
  height: 7vw;
  border-radius: 50%;
  border: 0.55vw solid transparent;
  border-top-color: var(--theme-start);
  border-right-color: var(--theme-end);
  animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  box-shadow: 0 0 2vw rgba(var(--theme-shadow-rgb), 0.2);
}

.ring-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1.6vw;
  height: 1.6vw;
  margin-top: -0.8vw;
  margin-left: -0.8vw;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  animation: pulse 1.2s ease-in-out infinite;
}

.loading-text {
  font-size: 2vw;
  color: rgba(var(--theme-shadow-rgb), 0.6);
  letter-spacing: 0.15vw;
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

.card-item {
  min-width: 0;
  background-color: #fff;
  border-radius: @card-radius;
  overflow: hidden;
  box-sizing: border-box;
  box-shadow: 0 0.533vw 1.6vw rgba(0, 0, 0, 0.08);
}

.card-cover {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 62%;
  overflow: hidden;
  border-radius: @card-radius @card-radius 0 0;
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
  padding: 1.6vw;
  box-sizing: border-box;

  .placeholder-text {
    font-size: 2.4vw;
    color: rgba(255, 255, 255, 0.9);
    font-weight: bold;
    text-align: center;
    text-shadow: 0 0.267vw 0.533vw rgba(0, 0, 0, 0.15);
  }
}

.episode-badge {
  position: absolute;
  top: 1.067vw;
  right: 1.067vw;
  background-color: rgba(0, 0, 0, 0.55);
  border-radius: 1.2vw;
  padding: 0.4vw 1vw;
  display: flex;
  align-items: center;
  justify-content: center;

  .episode-text {
    font-size: 1.4vw;
    color: #fff;
    font-weight: bold;
    line-height: 1;
  }
}

.vip-badge {
  position: absolute;
  top: 1.067vw;
  left: 1.067vw;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  border-radius: 1.2vw;
  padding: 0.4vw 1vw;
  box-shadow: 0 0.267vw 0.8vw rgba(var(--theme-shadow-rgb), 0.45);
  display: flex;
  align-items: center;
  justify-content: center;

  .vip-text {
    font-size: 1.4vw;
    color: #fff;
    font-weight: bold;
    letter-spacing: 0.1vw;
    line-height: 1;
  }
}

.card-title {
  padding: 1.333vw;
  min-height: 7.7vw;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;

  .title-text {
    font-size: 1.8vw;
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
</style>

<style lang="less">
page {
  height: 100%;
}
</style>
