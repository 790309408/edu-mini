<template>
  <view class="setting-page" :style="themeVars">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="onBack">
        <text class="back-text">返回</text>
      </view>
      <view class="nav-tabs">
        <view class="nav-tab-item" @tap="onOpenContact">
          <text class="nav-tab-text">🎁 联系我们</text>
        </view>
        <view class="nav-tab-item" @tap="onGoPersonal">
          <text class="nav-tab-text">个人中心</text>
        </view>
        <view
          class="nav-tab-item"
          :class="{ active: showAbout }"
          @tap="showAbout = !showAbout"
        >
          <text class="nav-tab-text">关于</text>
        </view>
      </view>
      <view class="nav-version">
        <text class="version-text">v{{ appVersion }}</text>
      </view>
    </view>

    <!-- 关于 -->
    <view v-if="showAbout" class="about-overlay" @tap="showAbout = false">
      <view class="about-body" @tap.stop>
        <text class="about-title">宝宝星盒</text>
        <text class="about-desc"
          >小程序永久公益免费，为避免资源浪费，请输入兑换码合理使用。</text
        >
        <view class="about-divider" />
        <text class="about-statement">【再次声明】</text>
        <text class="about-desc"
          >本小程序内容均整理自公开网络，如Bilibili等，如有疑问，联系我们沟通处理。</text
        >
        <text class="about-contact">合作/授权：396439919@qq.com</text>
        <view class="about-divider" />
        <text class="about-version">版本 v{{ appVersion }}</text>
        <text class="about-copyright">© 2026 宝宝星盒</text>
      </view>
    </view>

    <!-- 主内容区 -->
    <view v-else class="main-content">
      <!-- 左侧：功能码区域 -->
      <view class="left-panel">
        <!-- 会员状态 -->
        <view v-if="isVip" class="vip-status">
          <view class="vip-badge-main">
            <text class="vip-icon">👑</text>
            <text class="vip-type-text">{{ vipTypeLabel }}</text>
          </view>
          <text v-if="vipExpire" class="vip-expire"
            >有效期至 {{ vipExpire }}</text
          >
        </view>

        <!-- 剩余试看次数（非会员显示） -->
        <view v-else class="remain-section">
          <text class="remain-label">剩余试看次数：</text>
          <text class="remain-count">{{ remainCount }}</text>
          <text class="remain-label"> 次</text>
        </view>

        <!-- 功能码输入 -->
        <view class="code-input-row">
          <view class="code-input-wrapper">
            <input
              class="code-input"
              v-model="inputCode"
              placeholder="请输入功能码"
              placeholder-class="input-placeholder"
              maxlength="32"
            />
          </view>
          <view class="confirm-btn" @tap="onRedeem">
            <text class="confirm-btn-text">确定</text>
          </view>
        </view>

        <!-- 免费领取按钮 -->
        <view class="free-cta" @tap="onOpenFreeDialog">
          <text class="free-cta-text">点这里 免费领取功能码</text>
        </view>

        <!-- 分享好友按钮 -->
        <view class="share-btn" @tap="onGoShareReward">
          <text class="share-btn-icon">💬</text>
          <text class="share-btn-text">分享好友 获取永久资格</text>
        </view>
      </view>

      <!-- 右侧：使用说明 -->
      <view class="right-panel">
        <text class="help-title">小程序 永久免费使用</text>
        <text class="help-title">小程序 永久免费使用</text>
        <view class="help-divider" />
        <text class="help-warn">为防止资源被滥用</text>
        <text class="help-warn">系统设置5次体验次数</text>
        <text class="help-arrow">👉点击左侧按钮👈</text>
        <view class="help-divider" />
        <text class="help-step">添加微信领取激活码后</text>
        <text class="help-step">即可免费使用</text>
        <text class="help-emphasis">不收费、不收费、不收费</text>
      </view>
    </view>

    <!-- 底部 -->
    <view v-if="!showAbout" class="footer">
      <text class="footer-id">{{ userId }}</text>
      <text class="footer-dot"> · </text>
      <text class="footer-disclaimer" @tap="onGoDisclaimer">免责声明</text>
    </view>

    <!-- 联系我们弹框 -->
    <VipDialog
      :visible="showContactDialog"
      :qrcode-url="contactQrcodeUrl"
      title="联系我们"
      subtitle="添加老师微信，领取专属福利"
      confirm-text="长按识别添加老师"
      @update:visible="showContactDialog = $event"
      @close="showContactDialog = false"
    />

    <!-- 免费领取弹框 -->
    <FreeDialog
      :visible="showFreeDialog"
      :qrcode-url="qrcodeUrl"
      :remain-count="remainCount"
      :text-content="qrcodeTip"
      :name="qrcodeName"
      @update:visible="showFreeDialog = $event"
      @close="showFreeDialog = false"
      @confirm="onRedeemConfirm"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import { useTheme } from '@/utils/theme'
import FreeDialog from '@/components/free-dialog.vue'
import VipDialog from '@/components/vip-dialog.vue'
import {
  redeemCode as redeemCodeApi,
  getQrcodeListByType,
  getShareConfig,
  type ShareConfig,
} from '@/apis'
import type { LoginResult } from '@/apis'

const { themeVars } = useTheme()

const USER_INFO_KEY = 'wx_user_info'

const showAbout = ref(false)
const appVersion = ref('1.0.0')
const remainCount = ref(5)
const userId = ref<string>('')
const inputCode = ref('')

// 会员状态
const isVip = ref(false)
const vipType = ref(0)
const vipExpire = ref('')

const VIP_TYPE_MAP: Record<number, string> = {
  1: '月度会员',
  2: '永久会员',
  3: '季度会员',
  4: '年度会员',
}

const vipTypeLabel = computed(() => VIP_TYPE_MAP[vipType.value] || '会员')

// 免费领取弹框
const showFreeDialog = ref(false)
const qrcodeUrl = ref('')
const qrcodeTip = ref('')
const qrcodeName = ref('')

// 联系我们弹框
const showContactDialog = ref(false)
const contactQrcodeUrl = ref('')
const contactQrcodeName = ref('联系我们')

// 分享配置
const shareConfig = ref<ShareConfig | null>(null)

/** 加载用户信息 */
function loadUserInfo() {
  const info = uni.getStorageSync(USER_INFO_KEY) as LoginResult | undefined
  if (info) {
    userId.value = String(info.userId || '')
    remainCount.value = info.freeViewRemain != null ? info.freeViewRemain : 5
    isVip.value = info.vip === true && Number(info.vipType) > 0
    vipType.value = Number(info.vipType) || 0
    vipExpire.value = info.vipExpire || ''
  }
}

/** 加载免费二维码信息 */
async function loadFreeQrcode() {
  try {
    const list = await getQrcodeListByType(1)
    if (list && list.length > 0) {
      const item = list[0]
      qrcodeName.value = item.name || '免费领取'
      qrcodeTip.value = item.textContent || ''
      if (item.images && item.images.length > 0) {
        qrcodeUrl.value = item.images[0].imageUrl
      }
    }
  } catch (e) {
    console.error('获取二维码失败:', e)
  }
}

/** 加载联系我们二维码（type=2） */
async function loadContactQrcode() {
  try {
    const list = await getQrcodeListByType(2)
    if (list && list.length > 0) {
      const item = list[0]
      contactQrcodeName.value = item.name || '联系我们'
      if (item.images && item.images.length > 0) {
        contactQrcodeUrl.value = item.images[0].imageUrl
      }
    }
  } catch (e) {
    console.error('获取联系我们二维码失败:', e)
  }
}

/** 加载分享配置 */
async function loadShareConfig() {
  try {
    const data = await getShareConfig()
    if (data) shareConfig.value = data
  } catch (e) {
    console.error('获取分享配置失败:', e)
  }
}

onMounted(() => {
  loadUserInfo()
  loadFreeQrcode()
  loadContactQrcode()
  loadShareConfig()
})

/** 返回 */
function onBack() {
  uni.navigateBack()
}

/** 跳转个人中心 */
function onGoPersonal() {
  uni.navigateTo({ url: '/pages/setting/personal-center' })
}

/** 跳转免责声明 */
function onGoDisclaimer() {
  uni.navigateTo({ url: '/pages/setting/disclaimer' })
}

/** 打开免费领取弹框 */
function onOpenFreeDialog() {
  showFreeDialog.value = true
}

/** 打开联系我们弹框 */
function onOpenContact() {
  showContactDialog.value = true
}

/** 跳转分享福利页 */
function onGoShareReward() {
  uni.navigateTo({ url: '/pages/setting/share-reward' })
}

/** 兑换码确认 */
async function onRedeemConfirm(code: string) {
  const id = userId.value
  if (!id) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  try {
    await redeemCodeApi(id, code)
    showFreeDialog.value = false
    inputCode.value = ''
    uni.showToast({ title: '兑换成功', icon: 'success' })
    // 刷新用户信息
    loadUserInfo()
  } catch (err: any) {
    uni.showToast({
      title: err?.message || err?.msg || '兑换失败',
      icon: 'none',
    })
  }
}

/** 直接兑换（左侧确定按钮） */
async function onRedeem() {
  const code = inputCode.value.trim()
  if (!code) {
    uni.showToast({ title: '请输入功能码', icon: 'none' })
    return
  }
  await onRedeemConfirm(code)
}

/** 分享给好友 */
onShareAppMessage(() => {
  const id = userId.value
  const friend = shareConfig.value?.friend
  return {
    title: friend?.title || '宝宝星盒 - 免费儿童教育资源',
    desc: friend?.desc || '',
    path: id ? `/pages/index/index?inviterId=${id}` : '/pages/index/index',
    imageUrl: friend?.imageUrl || '',
  }
})
</script>

<style lang="less" scoped>
.setting-page {
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
}

// 导航栏
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

.nav-tabs {
  display: flex;
  align-items: center;
  gap: 0.8vw;
}

.nav-tab-item {
  padding: 0.5vw 1.8vw;
  border-radius: 1.6vw;
  background: rgba(255, 255, 255, 0.2);

  &.active {
    background: rgba(255, 255, 255, 0.45);
  }
}

.nav-tab-text {
  font-size: 1.6vw;
  font-weight: 600;
  color: #fff;
}

.nav-version {
  flex-shrink: 0;
  padding: 0.3vw 1vw;
  border-radius: 1.2vw;
  background: rgba(255, 255, 255, 0.18);
}

.version-text {
  font-size: 1.2vw;
  color: rgba(255, 255, 255, 0.9);
}

// 关于弹层
.about-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.about-body {
  width: 50vw;
  background: #fff;
  border-radius: 3vw;
  padding: 4vw 3vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2vw;
  box-shadow: 0 1vw 4vw rgba(0, 0, 0, 0.1);
}

.about-title {
  font-size: 2.6vw;
  font-weight: bold;
  color: var(--theme-end);
}

.about-desc {
  font-size: 1.6vw;
  color: #666;
  line-height: 1.6;
  text-align: center;
}

.about-statement {
  font-size: 1.6vw;
  font-weight: bold;
  color: #333;
}

.about-contact {
  font-size: 1.5vw;
  color: var(--theme-end);
}

.about-divider {
  width: 30%;
  height: 1px;
  background: #e0e0e0;
  margin: 0.6vw 0;
}

.about-version {
  font-size: 1.4vw;
  color: #999;
}

.about-copyright {
  font-size: 1.3vw;
  color: #bbb;
}

// 主内容区
.main-content {
  flex: 1;
  height: 0;
  display: flex;
  flex-direction: row;
  padding: 2.5vw 3.5vw;
  gap: 2.5vw;
  box-sizing: border-box;
}

// 左侧面板
.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2vw;
}

.remain-section {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 0.5vw;
}

.remain-label {
  font-size: 2.2vw;
  font-weight: 600;
  color: #333;
}

.remain-count {
  font-size: 3.2vw;
  font-weight: 800;
  color: var(--theme-end);
  margin: 0 0.3vw;
}

// 会员状态
.vip-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6vw;
  margin-bottom: 0.5vw;
}

.vip-badge-main {
  display: flex;
  align-items: center;
  gap: 0.6vw;
  background: linear-gradient(135deg, #ffd700, #ffb347);
  padding: 0.6vw 2.4vw;
  border-radius: 2vw;
  box-shadow: 0 0.4vw 1.2vw rgba(255, 183, 77, 0.35);
}

.vip-icon {
  font-size: 2.4vw;
}

.vip-type-text {
  font-size: 2.2vw;
  font-weight: 800;
  color: #5c3d00;
  letter-spacing: 0.1vw;
}

.vip-expire {
  font-size: 1.3vw;
  color: #999;
}

.code-input-row {
  display: flex;
  align-items: center;
  width: 72%;
  gap: 1vw;
}

.code-input-wrapper {
  flex: 1;
  height: 4.2vw;
  background: #fff;
  border-radius: 2.1vw;
  overflow: hidden;
  box-shadow: 0 0.2vw 1vw rgba(0, 0, 0, 0.08);
}

.code-input {
  width: 100%;
  height: 4.2vw;
  padding: 0 1.8vw;
  font-size: 1.6vw;
  color: #333;
  box-sizing: border-box;
}

.input-placeholder {
  color: #bbb;
  font-size: 1.5vw;
}

.confirm-btn {
  height: 4.2vw;
  padding: 0 2.2vw;
  border-radius: 2.1vw;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0.4vw 1.2vw rgba(var(--theme-shadow-rgb), 0.3);
}

.confirm-btn-text {
  font-size: 1.6vw;
  font-weight: bold;
  color: #fff;
}

.free-cta {
  width: 72%;
  height: 5.2vw;
  border-radius: 2.6vw;
  background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0.6vw 2vw rgba(var(--theme-shadow-rgb), 0.35);
}

.free-cta-text {
  font-size: 2.2vw;
  font-weight: bold;
  color: #fff;
  letter-spacing: 0.1vw;
}

.share-btn {
  width: 72%;
  height: 5.2vw;
  border-radius: 2.6vw;
  background: linear-gradient(135deg, #a78bfa, #7c5ce0);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6vw;
  box-shadow: 0 0.6vw 2vw rgba(124, 92, 224, 0.35);
}

.share-btn-icon {
  font-size: 2.2vw;
}

.share-btn-text {
  font-size: 2vw;
  font-weight: 700;
  color: #fff;
}

// 右侧面板
.right-panel {
  width: 26vw;
  background: #fff8eb;
  border-radius: 2vw;
  padding: 2.8vw 2vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6vw;
  box-shadow: 0 0.4vw 1.6vw rgba(0, 0, 0, 0.06);
  align-self: center;
}

.help-title {
  font-size: 2vw;
  font-weight: 800;
  color: #d43030;
  line-height: 1.4;
}

.help-divider {
  width: 50%;
  height: 1px;
  background: #e8d8c0;
  margin: 0.6vw 0;
}

.help-warn {
  font-size: 1.5vw;
  color: #b8860b;
  font-weight: 600;
  line-height: 1.5;
}

.help-arrow {
  font-size: 1.6vw;
  color: #b8860b;
  font-weight: 700;
  margin: 0.4vw 0;
}

.help-step {
  font-size: 1.5vw;
  color: #333;
  font-weight: 500;
  line-height: 1.5;
}

.help-emphasis {
  font-size: 1.6vw;
  color: #333;
  font-weight: 800;
  margin-top: 0.4vw;
}

// 底部
.footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1vw 0;
  padding-bottom: calc(1vw + env(safe-area-inset-bottom));
  gap: 0.4vw;
}

.footer-id {
  font-size: 1.2vw;
  color: #aaa;
}

.footer-dot {
  font-size: 1.2vw;
  color: #ccc;
}

.footer-disclaimer {
  font-size: 1.2vw;
  color: var(--theme-end);
  font-weight: 500;
}
</style>

<style lang="less">
page {
  height: 100%;
}
</style>
