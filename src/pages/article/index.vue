<template>
  <view class="page" :style="themeVars">
    <!-- 通用导航栏 -->
    <NavBar :title="title" @back="onBack" />

    <!-- 富文本内容区 -->
    <scroll-view scroll-y class="content-scroll" :show-scrollbar="true">
      <view class="article-wrap">
        <view v-if="!blocks.length" class="empty-tip">
          <text class="empty-text">暂无图文内容</text>
        </view>
        <template v-else>
          <template v-for="(block, idx) in blocks" :key="idx">
            <rich-text
              v-if="block.type === 'html'"
              class="article-content"
              :nodes="block.value"
              :space="'nbsp'"
            />
            <image
              v-else
              class="article-image"
              :src="block.value"
              mode="widthFix"
              @tap="onPreviewImage(block.value)"
            />
          </template>
        </template>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { guardedOnLoad } from '@/utils/auth-guard'
import { useTheme } from '@/utils/theme'
import { getShareConfig, getCategoryList, type ShareConfig } from '@/apis'
import NavBar from '@/components/nav-bar.vue'

const { themeVars } = useTheme()

interface ContentBlock {
  type: 'html' | 'image'
  value: string
}

const title = ref('')
const blocks = ref<ContentBlock[]>([])
const imageList = ref<string[]>([])
const tabId = ref(0)
const articleId = ref(0)

// 段落等基础排版（图片单独渲染，无需在此处理）
function normalizeHtml(html: string): string {
  if (!html) return ''
  let result = html

  // 1. 覆盖可能存在的 align 属性，避免居中/右对齐
  result = result.replace(/\salign\s*=\s*(["'])[^"']*\1/gi, '')

  // 2. 清除 inline style 里的 text-align，强制左对齐
  result = result.replace(/style\s*=\s*"([^"]*)"/gi, (_m, css: string) => {
    const cleaned = css
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !/^text-align\s*:/i.test(s))
      .join(';')
    return `style="${cleaned}"`
  })

  // 3. 给 <p> 注入默认排版（与左对齐）
  result = result.replace(/<p(\s[^>]*)?>/gi, (m) =>
    /style\s*=/.test(m)
      ? m.replace(
          /style\s*=\s*"([^"]*)"/i,
          (_x, css: string) =>
            `style="text-align:left;${css}${css && !css.trim().endsWith(';') ? ';' : ''}"`,
        )
      : '<p style="margin:0 0 3vw;line-height:1.8;text-align:left;">',
  )

  return result
}

// 将 HTML 按 <img> 拆分为顺序块：文本块仍交给 rich-text，图片块独立渲染以支持点击预览
function parseContent(html: string) {
  const result: ContentBlock[] = []
  const imgs: string[] = []
  if (!html) {
    blocks.value = result
    imageList.value = imgs
    return
  }

  const regex = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      const htmlPart = html.slice(lastIndex, match.index)
      if (htmlPart.trim()) {
        result.push({ type: 'html', value: normalizeHtml(htmlPart) })
      }
    }
    imgs.push(match[1])
    result.push({ type: 'image', value: match[1] })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < html.length) {
    const tail = html.slice(lastIndex)
    if (tail.trim()) {
      result.push({ type: 'html', value: normalizeHtml(tail) })
    }
  }

  blocks.value = result
  imageList.value = imgs
}

// 点击图片：预览一次只展示当前这一张，避免混入其它图片
function onPreviewImage(src: string) {
  if (!src) return
  uni.previewImage({
    urls: [src],
    current: src,
  })
}

guardedOnLoad(async (query) => {
  // 兼容小程序码 scene 传参（如 {"scene":"tabId=1&articleId=5"}）
  if (query?.scene) {
    const sceneStr = decodeURIComponent(query.scene as string)
    sceneStr.split('&').forEach((pair) => {
      const [key, val] = pair.split('=')
      if (key && val && !(key in (query as any))) {
        ;(query as any)[key] = val
      }
    })
  }
  // 读取 URL 参数（分享链接携带 tabId + articleId）
  const urlTabId = query && query.tabId ? Number(query.tabId) : 0
  const urlArticleId =
    query && query.articleId
      ? Number(query.articleId)
      : query && query.typeId
        ? Number(query.typeId)
        : 0
  tabId.value = urlTabId
  articleId.value = urlArticleId

  // 从 storage 取出当前课程的图文内容（首页跳转前已写入）
  const cache = uni.getStorageSync('article_content') as
    | { id: number; title: string; content: string; tabId?: number }
    | ''
  if (cache && typeof cache === 'object' && cache.content) {
    title.value = cache.title || ''
    tabId.value = cache.tabId || urlTabId
    parseContent(cache.content || '')
  } else if (urlTabId && urlArticleId) {
    // storage 无数据（分享链接进入）：从 API 回退加载
    try {
      const data = await getCategoryList(urlTabId)
      const found = data && data.find((item) => item.id === urlArticleId)
      if (found) {
        title.value = found.name || ''
        parseContent(found.content || '')
      } else {
        uni.reLaunch({ url: '/pages/index/index' })
        return
      }
    } catch (_e) {
      uni.reLaunch({ url: '/pages/index/index' })
      return
    }
  }
  // 获取分享配置
  fetchShareConfig()
})

function onBack() {
  const pages = getCurrentPages()
  if (pages.length <= 1) {
    uni.reLaunch({ url: '/pages/index/index' })
  } else {
    uni.navigateBack({ delta: 1 })
  }
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

/** 分享给好友 */
onShareAppMessage(() => {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId ? userInfo.userId : ''
  const friend = shareConfig.value?.friend
  const parts = [
    tabId.value ? `tabId=${tabId.value}` : '',
    articleId.value ? `articleId=${articleId.value}` : '',
    userId ? `userId=${userId}` : '',
  ].filter(Boolean)
  return {
    title: friend?.title || title.value || '宝宝爱听 — 免费儿童教育视频',
    desc: friend?.desc || '',
    path: parts.length
      ? `/pages/index/index?${parts.join('&')}`
      : '/pages/index/index',
    imageUrl: friend?.imageUrl || '',
  }
})

/** 分享到朋友圈 */
onShareTimeline(() => {
  const userInfo = uni.getStorageSync('wx_user_info') as any
  const userId = userInfo && userInfo.userId ? userInfo.userId : ''
  const timeline = shareConfig.value?.timeline
  const parts = [
    tabId.value ? `tabId=${tabId.value}` : '',
    articleId.value ? `articleId=${articleId.value}` : '',
    userId ? `userId=${userId}` : '',
  ].filter(Boolean)
  return {
    title: timeline?.title || title.value || '宝宝爱听 — 免费儿童教育视频',
    query: parts.join('&'),
    imageUrl: timeline?.imageUrl || '',
  }
})
</script>

<style lang="less" scoped>
.page {
  width: 100%;
  height: 100%;
  background-color: #fff8fb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  // 从横屏进入竖屏页面时的入场过渡，缓解转屏生硬感
  animation: page-fade-in 0.45s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  transform-origin: center center;
  will-change: transform, opacity;
}

@keyframes page-fade-in {
  0% {
    opacity: 0;
    transform: scale(0.94) translateY(2vw);
  }
  60% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

// 竖屏顶部区域入场动画（应用于组件）
:deep(.nav-status-bar),
:deep(.nav-bar) {
  animation: header-slide-in 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

@keyframes header-slide-in {
  0% {
    opacity: 0;
    transform: translateY(-30%);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

// 内容区轻微延迟上滑
.content-scroll {
  animation: content-rise-in 0.55s 0.05s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

@keyframes content-rise-in {
  0% {
    opacity: 0;
    transform: translateY(3vw);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

// 富文本内容区域：flex: 1 填满导航栏下方的剩余空间
.content-scroll {
  flex: 1;
  height: 0;
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.article-wrap {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 5vw 5vw 8vw;
  box-sizing: border-box;
}

.article-content {
  display: block;
  width: 100%;
  font-size: 4vw;
  line-height: 1.8;
  color: #333;
  text-align: left;
  // 中英文混排填满一行再换行，不随意断行
  word-break: keep-all;
  overflow-wrap: break-word;
  white-space: normal;
}

.article-image {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 3vw auto;
  border-radius: 2vw;
  background-color: #fdf2f7;

  &:active {
    opacity: 0.85;
  }
}

.empty-tip {
  width: 100%;
  min-height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;

  .empty-text {
    font-size: 3.6vw;
    color: rgba(0, 0, 0, 0.4);
  }
}
</style>

<style lang="less">
page {
  height: 100%;
}

/* uni.previewImage 大图预览：让图片宽度占满屏幕 */
.uni-system-preview-image,
.uni-system-preview-image > div,
.uni-system-preview-image .uni-system-preview-image-content,
.uni-system-preview-image img,
.uni-system-preview-image image,
.uni-system-preview-image uni-image,
.uni-system-preview-image .uni-image,
.uni-system-preview-image .uni-image__img,
.uni-system-preview-image .uni-preview-image,
.uni-system-preview-image .uni-preview-image img,
.uni-system-preview-image swiper,
.uni-system-preview-image swiper-item {
  width: 100vw !important;
  max-width: 100vw !important;
}

.uni-system-preview-image img,
.uni-system-preview-image image,
.uni-system-preview-image .uni-image__img {
  height: auto !important;
  object-fit: contain !important;
}
</style>
