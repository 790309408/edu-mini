<template>
  <view class="personal-center-page" :style="themeVars">
    <!-- 通用导航栏 -->
    <NavBar title="个人中心" @back="onBack" />

    <!-- 内容区域 -->
    <scroll-view scroll-y class="personal-content" :show-scrollbar="false">
      <view class="personal-body">
        <!-- 用户卡片（顶部） -->
        <view class="user-info-card" @tap="onOpenProfileEdit">
          <image class="user-avatar" :src="userAvatar" />
          <view class="user-text">
            <text class="user-nickname">{{ userNickname }}</text>
            <text class="user-id">ID: {{ userId }}</text>
          </view>
          <text class="edit-hint">编辑</text>
          <view class="arrow-icon"></view>
        </view>

        <!-- 会员权益面板 -->
        <!-- <view class="vip-panel">
          <view class="vip-header">
            <text class="vip-icon">👑</text>
            <view class="vip-info">
              <text class="vip-title">VIP会员</text>
              <text class="vip-account">账号：{{ userAccount }}</text>
            </view>
            <view class="vip-badge">
              <text class="badge-text">有效期</text>
            </view>
          </view>

          <view class="vip-benefits">
            <view class="benefit-item">
              <text class="benefit-icon">🎬</text>
              <text class="benefit-text">免费观看4000+视频</text>
            </view>
            <view class="benefit-item">
              <text class="benefit-icon">📥</text>
              <text class="benefit-text">离线下载全部内容</text>
            </view>
            <view class="benefit-item">
              <text class="benefit-icon">🚫</text>
              <text class="benefit-text">无广告体验</text>
            </view>
            <view class="benefit-item">
              <text class="benefit-icon">⏰</text>
              <text class="benefit-text">优先看最新更新</text>
            </view>
          </view>

          <view class="vip-action">
            <button class="renew-btn" @tap="onRenewVip">
              <text class="renew-btn-text">续费会员</text>
            </button>
          </view>
        </view> -->

        <!-- 个人信息卡片 -->
        <view class="info-section">
          <!-- 我的邀请 -->
          <view class="card-item invite-card" @tap="onGoToInvite">
            <view class="card-left">
              <text class="card-icon">🤝</text>
              <text class="card-title">我的邀请</text>
            </view>
            <view class="card-right">
              <text class="invite-count">{{ inviteCount }}</text>
              <view class="arrow-icon"></view>
            </view>
          </view>

          <!-- 联系我们 -->
          <view class="card-item contact-card" @tap="onGoToContact">
            <view class="card-left">
              <text class="card-icon">💬</text>
              <text class="card-title">联系我们</text>
            </view>
            <view class="card-right">
              <text class="card-desc">给我们留言</text>
              <view class="arrow-icon"></view>
            </view>
          </view>

          <!-- 我的留言 -->
          <view class="card-item about-card" @tap="onGoToMyMessages">
            <view class="card-left">
              <text class="card-icon">✍️</text>
              <text class="card-title">我的留言</text>
            </view>
            <view class="card-right">
              <view class="arrow-icon"></view>
            </view>
          </view>

          <!-- 切换主题 -->
          <view class="card-item theme-card" @tap="onOpenThemeSheet">
            <view class="card-left">
              <text class="card-icon">🎨</text>
              <text class="card-title">主题设置</text>
            </view>
            <view class="card-right">
              <text class="card-desc">{{ currentThemeLabel }}</text>
              <view class="arrow-icon"></view>
            </view>
          </view>

          <!-- 免责声明 -->
          <view class="card-item disclaimer-card" @tap="onGoToDisclaimer">
            <view class="card-left">
              <text class="card-icon">📜</text>
              <text class="card-title">免责声明</text>
            </view>
            <view class="card-right">
              <view class="arrow-icon"></view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 主题选择弹框 -->
    <view
      v-if="showThemeSheet"
      class="theme-sheet-mask"
      @tap="onCloseThemeSheet"
    >
      <view class="theme-sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title">选择主题色</text>
          <text class="sheet-close" @tap="onCloseThemeSheet">✕</text>
        </view>

        <view class="sheet-body">
          <view
            v-for="t in themeOptions"
            :key="t.key"
            class="theme-option"
            :class="{ selected: tempTheme === t.key }"
            @tap="onSelectTheme(t.key)"
          >
            <view
              class="theme-preview"
              :style="{
                background:
                  'linear-gradient(135deg, ' +
                  t.gradientStart +
                  ', ' +
                  t.gradientEnd +
                  ')',
              }"
            >
              <view v-if="tempTheme === t.key" class="theme-check">✓</view>
            </view>
            <text class="theme-label">{{ t.label }}</text>
          </view>
        </view>

        <view class="sheet-footer">
          <button class="sheet-cancel-btn" @tap="onCloseThemeSheet">
            取消
          </button>
          <button class="sheet-confirm-btn" @tap="onConfirmTheme">确认</button>
        </view>
      </view>
    </view>

    <!-- 编辑资料弹框 -->
    <view
      v-if="showProfileSheet"
      class="theme-sheet-mask"
      @tap="onCloseProfileEdit"
    >
      <view class="profile-sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title">编辑个人资料</text>
          <text class="sheet-close" @tap="onCloseProfileEdit">✕</text>
        </view>

        <view class="profile-sheet-body">
          <!-- 头像 -->
          <view class="profile-field">
            <text class="profile-label">头像</text>
            <button
              class="avatar-btn"
              open-type="chooseAvatar"
              @chooseavatar="onChooseAvatar"
            >
              <image class="profile-avatar-preview" :src="editAvatar" />
              <text class="avatar-change-hint">点击更换</text>
            </button>
          </view>
          <!-- 昵称 -->
          <view class="profile-field">
            <text class="profile-label">昵称</text>
            <input
              class="profile-nickname-input"
              type="nickname"
              v-model="editNickname"
              placeholder="请输入昵称"
              @blur="onNicknameBlur"
            />
          </view>
        </view>

        <view class="sheet-footer">
          <button class="sheet-cancel-btn" @tap="onCloseProfileEdit">
            取消
          </button>
          <button
            class="sheet-confirm-btn"
            :disabled="savingProfile"
            @tap="onSaveProfile"
          >
            {{ savingProfile ? '保存中...' : '保存' }}
          </button>
        </view>
      </view>
    </view>

    <!-- 留言弹框 -->
    <view
      v-if="showMessageSheet"
      class="theme-sheet-mask"
      @tap="onCloseMessageSheet"
    >
      <view class="message-sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title">给我们留言</text>
          <text class="sheet-close" @tap="onCloseMessageSheet">✕</text>
        </view>

        <view class="message-sheet-body">
          <textarea
            class="message-textarea"
            v-model="messageContent"
            placeholder="请输入您的留言内容（最多500字）"
            :maxlength="500"
            :auto-height="false"
          />
          <text class="message-counter">{{ messageContent.length }}/500</text>
        </view>

        <view class="sheet-footer">
          <button class="sheet-cancel-btn" @tap="onCloseMessageSheet">
            取消
          </button>
          <button
            class="sheet-confirm-btn"
            :disabled="submittingMessage"
            @tap="onSubmitMessage"
          >
            {{ submittingMessage ? '提交中...' : '提交' }}
          </button>
        </view>
      </view>
    </view>

    <!-- 消息提示 -->
    <view v-if="showMessage" class="message-toast">
      <text class="message-text">{{ messageText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  type ThemeKey,
  THEMES,
  getSavedTheme,
  switchTheme,
  useTheme,
} from '@/utils/theme'
import NavBar from '@/components/nav-bar.vue'
import { saveUserProfile, getBindCount, submitMessage } from '@/apis'
import type { LoginResult } from '@/apis'

const { themeVars } = useTheme()

const USER_INFO_KEY = 'wx_user_info'
const DEFAULT_AVATAR = '/static/default-avatar.svg'
const DEFAULT_NICKNAME = '微信用户'

// 用户信息
const userNickname = ref(DEFAULT_NICKNAME)
const userAccount = ref('')
const userId = ref<number | string>('')
const userAvatar = ref(DEFAULT_AVATAR)
const inviteCount = ref(0)

/** 从缓存加载用户信息 */
function loadUserInfo() {
  const info = uni.getStorageSync(USER_INFO_KEY) as LoginResult | undefined
  if (!info) return
  userId.value = info.userId || ''
  userNickname.value = info.nickName || DEFAULT_NICKNAME
  userAvatar.value = info.avatarUrl || DEFAULT_AVATAR
}

/** 获取已邀请好友数量 */
async function fetchInviteCount() {
  const id = userId.value
  if (!id) return
  try {
    const data = await getBindCount(id)
    inviteCount.value = Number(data && data.count) || 0
  } catch (e) {
    console.error('获取邀请数量失败:', e)
  }
}

onMounted(() => {
  loadUserInfo()
  fetchInviteCount()
})

// ====== 编辑资料弹框 ======
const showProfileSheet = ref(false)
const editAvatar = ref('')
const editNickname = ref('')
const savingProfile = ref(false)

const onOpenProfileEdit = () => {
  editAvatar.value = userAvatar.value
  editNickname.value =
    userNickname.value === DEFAULT_NICKNAME ? '' : userNickname.value
  showProfileSheet.value = true
}

const onCloseProfileEdit = () => {
  showProfileSheet.value = false
}

/** chooseAvatar 回调 */
const onChooseAvatar = (e: any) => {
  const tempPath = e.detail.avatarUrl || ''
  if (!tempPath) return
  console.log('onChooseAvatar:', e)
  // wxfile:// 开头的临时路径需转存为持久化路径才能在 image 组件中正常显示
  if (tempPath.startsWith('wxfile://') || tempPath.startsWith('http://tmp')) {
    uni.saveFile({
      tempFilePath: tempPath,
      success: (res) => {
        editAvatar.value = res.savedFilePath
      },
      fail: () => {
        // 转存失败时回退使用原始路径
        editAvatar.value = tempPath
      },
    })
  } else {
    editAvatar.value = tempPath
  }
}

/** nickname input blur 时拿到微信推荐昵称 */
const onNicknameBlur = (e: any) => {
  if (e.detail.value) {
    editNickname.value = e.detail.value
  }
}

/** 保存资料 */
const onSaveProfile = async () => {
  const nick = editNickname.value.trim()
  const avatar = editAvatar.value

  if (!nick && (!avatar || avatar === DEFAULT_AVATAR)) {
    uni.showToast({ title: '请至少填写昵称或更换头像', icon: 'none' })
    return
  }

  savingProfile.value = true
  try {
    const params: {
      userId: number | string
      nickName?: string
      avatarUrl?: string
    } = { userId: userId.value }
    if (nick) params.nickName = nick
    if (avatar && avatar !== DEFAULT_AVATAR) params.avatarUrl = avatar

    await saveUserProfile(params)

    // 更新缓存
    const cached = (uni.getStorageSync(USER_INFO_KEY) || {}) as LoginResult
    if (nick) cached.nickName = nick
    if (avatar && avatar !== DEFAULT_AVATAR) cached.avatarUrl = avatar
    uni.setStorageSync(USER_INFO_KEY, cached)

    // 更新页面显示
    if (nick) userNickname.value = nick
    if (avatar && avatar !== DEFAULT_AVATAR) userAvatar.value = avatar

    showProfileSheet.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (err: any) {
    uni.showToast({
      title: err?.message || err?.msg || '保存失败',
      icon: 'none',
    })
  } finally {
    savingProfile.value = false
  }
}

// 主题设置
const currentThemeKey = ref<ThemeKey>(getSavedTheme())
const currentThemeLabel = computed(
  () => THEMES[currentThemeKey.value]?.label || '公主粉',
)

// 主题弹框
const showThemeSheet = ref(false)
const tempTheme = ref<ThemeKey>(currentThemeKey.value)
const themeOptions = Object.values(THEMES)

const onOpenThemeSheet = () => {
  tempTheme.value = currentThemeKey.value
  showThemeSheet.value = true
}

const onCloseThemeSheet = () => {
  showThemeSheet.value = false
}

const onSelectTheme = (key: ThemeKey) => {
  tempTheme.value = key
}

const onConfirmTheme = () => {
  currentThemeKey.value = tempTheme.value
  switchTheme(tempTheme.value)
  showThemeSheet.value = false

  messageText.value = '已切换到' + THEMES[tempTheme.value].label
  showMessage.value = true
  setTimeout(() => {
    showMessage.value = false
  }, 1000)
}

// 消息提示
const showMessage = ref(false)
const messageText = ref('')

// 返回上一页
const onBack = () => {
  uni.navigateBack({ delta: 1 })
}

// VIP续费
const onRenewVip = () => {
  messageText.value = '跳转到续费页面'
  showMessage.value = true
  setTimeout(() => {
    showMessage.value = false
  }, 1000)
}

// 我的邀请
const onGoToInvite = () => {
  uni.navigateTo({ url: '/pages/setting/invite-list' })
}

// 联系我们
const showMessageSheet = ref(false)
const messageContent = ref('')
const submittingMessage = ref(false)

const onGoToContact = () => {
  messageContent.value = ''
  showMessageSheet.value = true
}

const onCloseMessageSheet = () => {
  showMessageSheet.value = false
}

const onSubmitMessage = async () => {
  const content = messageContent.value.trim()
  if (!content) {
    uni.showToast({ title: '请输入留言内容', icon: 'none' })
    return
  }
  submittingMessage.value = true
  try {
    await submitMessage(content)
    showMessageSheet.value = false
    messageContent.value = ''
    uni.showToast({ title: '留言成功', icon: 'success' })
  } catch (err: any) {
    uni.showToast({
      title: err?.message || err?.msg || '留言失败',
      icon: 'none',
    })
  } finally {
    submittingMessage.value = false
  }
}

// 我的留言
const onGoToMyMessages = () => {
  uni.navigateTo({ url: '/pages/setting/my-messages' })
}

// 免责声明
const onGoToDisclaimer = () => {
  uni.navigateTo({ url: '/pages/setting/disclaimer' })
}

// 监听全局主题变化（其他页面触发时同步）
uni.$on('themeChanged', (key: ThemeKey) => {
  if (key !== currentThemeKey.value) {
    currentThemeKey.value = key
  }
})
</script>

<style scoped lang="less">
.personal-center-page {
  --theme-start: #f9b0d0;
  --theme-end: #e8608c;
  --theme-shadow-rgb: 232, 96, 140;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #fff8fb 0%, #f5f5f5 100%);
  overflow: hidden;
}

/* 内容区域 */
.personal-content {
  flex: 1;
  overflow-y: auto;
}

.personal-body {
  padding: 4vw;
}

/* 用户信息卡片（顶部） */
.user-info-card {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 3vw;
  padding: 4vw;
  margin-bottom: 4vw;
  box-shadow: 0 0.4vw 1.2vw rgba(0, 0, 0, 0.08);
  cursor: pointer;

  &:active {
    background-color: #f9f9f9;
  }

  .user-avatar {
    width: 16vw;
    height: 16vw;
    border-radius: 50%;
    margin-right: 3vw;
    background-color: #f0f0f0;
    flex-shrink: 0;
  }

  .user-text {
    display: flex;
    flex-direction: column;
    flex: 1;

    .user-nickname {
      font-size: 4vw;
      font-weight: 600;
      color: #333;
      margin-bottom: 1vw;
    }

    .user-id {
      font-size: 2.8vw;
      color: #999;
    }
  }

  .edit-hint {
    font-size: 3vw;
    color: #bbb;
    flex-shrink: 0;
    margin-right: 2vw;
  }

  .arrow-icon {
    width: 2vw;
    height: 2vw;
    border-top: 0.4vw solid #ccc;
    border-right: 0.4vw solid #ccc;
    transform: rotate(45deg);
    flex-shrink: 0;
  }
}

/* VIP权益面板 */
.vip-panel {
  background: linear-gradient(
    135deg,
    var(--theme-start) 0%,
    var(--theme-end) 100%
  );
  border-radius: 3vw;
  padding: 5vw;
  margin-bottom: 5vw;
  color: #fff;

  .vip-header {
    display: flex;
    align-items: center;
    margin-bottom: 4vw;

    .vip-icon {
      font-size: 8vw;
      margin-right: 3vw;
    }

    .vip-info {
      display: flex;
      flex-direction: column;
      flex: 1;

      .vip-title {
        font-size: 4.4vw;
        font-weight: 600;
        margin-bottom: 1vw;
      }

      .vip-account {
        font-size: 3vw;
        opacity: 0.9;
      }
    }

    .vip-badge {
      background-color: rgba(255, 255, 255, 0.3);
      padding: 1.5vw 3vw;
      border-radius: 5vw;

      .badge-text {
        font-size: 3vw;
        font-weight: 600;
      }
    }
  }

  .vip-benefits {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3vw;
    margin-bottom: 4vw;

    .benefit-item {
      display: flex;
      align-items: center;
      font-size: 2.8vw;
      background-color: rgba(255, 255, 255, 0.1);
      padding: 2.5vw;
      border-radius: 2vw;

      .benefit-icon {
        font-size: 4vw;
        margin-right: 1.5vw;
      }

      .benefit-text {
        flex: 1;
        line-height: 1.4;
      }
    }
  }

  .vip-action {
    display: flex;

    .renew-btn {
      flex: 1;
      background-color: #fff;
      border: none;
      border-radius: 2vw;
      padding: 3vw;
      font-size: 4vw;
      font-weight: 600;
      color: var(--theme-end);
      cursor: pointer;

      .renew-btn-text {
        color: var(--theme-end);
      }
    }
  }
}

/* 信息卡片区域 */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 3vw;
  margin-bottom: 5vw;

  .card-item {
    background-color: #fff;
    border-radius: 3vw;
    padding: 4vw;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.3s ease;
    cursor: pointer;
    box-shadow: 0 0.4vw 1.2vw rgba(0, 0, 0, 0.08);

    &:active {
      background-color: #f9f9f9;
      transform: scale(0.98);
    }

    .card-left {
      display: flex;
      align-items: center;
      flex: 1;

      .card-icon {
        font-size: 6vw;
        margin-right: 3vw;
      }

      .card-title {
        font-size: 4vw;
        font-weight: 500;
        color: #333;
      }
    }

    .card-right {
      display: flex;
      align-items: center;
      gap: 2vw;

      .card-desc {
        font-size: 3vw;
        color: #999;
      }

      .arrow-icon {
        width: 2vw;
        height: 2vw;
        border-top: 0.4vw solid #ccc;
        border-right: 0.4vw solid #ccc;
        transform: rotate(45deg);
        flex-shrink: 0;
      }
    }
  }

  /* 邀请卡片 */
  .invite-card {
    .invite-count {
      font-size: 5vw;
      font-weight: 600;
      color: var(--theme-end);
      margin-right: 1vw;
    }
  }

  /* 主题卡片 */
  .theme-card {
    .card-desc {
      font-size: 3vw;
      color: #999;
    }
  }
}

/* 主题选择弹框 */
.theme-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  animation: fadeInMask 0.3s ease;
}

.theme-sheet {
  width: 100%;
  background-color: #fff;
  border-radius: 4vw 4vw 0 0;
  padding: 5vw 4vw;
  padding-bottom: calc(5vw + env(safe-area-inset-bottom));
  animation: slideUp 0.3s ease;

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6vw;

    .sheet-title {
      font-size: 4.4vw;
      font-weight: 600;
      color: #333;
    }

    .sheet-close {
      font-size: 5vw;
      color: #999;
      padding: 1vw 2vw;
    }
  }

  .sheet-body {
    display: flex;
    justify-content: space-around;
    gap: 4vw;
    margin-bottom: 6vw;

    .theme-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2.5vw;
      flex: 1;
      padding: 3vw 0;
      border-radius: 3vw;
      border: 0.4vw solid transparent;
      transition: all 0.25s ease;

      &.selected {
        border-color: var(--theme-end);
        background-color: rgba(var(--theme-shadow-rgb), 0.06);
      }

      .theme-preview {
        width: 18vw;
        height: 18vw;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0.5vw 2vw rgba(0, 0, 0, 0.15);
        transition: transform 0.25s ease;

        .theme-check {
          width: 7vw;
          height: 7vw;
          background-color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4vw;
          color: #333;
          font-weight: bold;
        }
      }

      &.selected .theme-preview {
        transform: scale(1.08);
      }

      .theme-label {
        font-size: 3.2vw;
        color: #666;
        font-weight: 500;
      }

      &.selected .theme-label {
        color: var(--theme-end);
        font-weight: 600;
      }
    }
  }

  .sheet-footer {
    display: flex;
    gap: 3vw;

    .sheet-cancel-btn,
    .sheet-confirm-btn {
      flex: 1;
      border-radius: 6vw;
      padding: 3vw 0;
      font-size: 3.6vw;
      font-weight: 500;
      line-height: 1.2;

      &::after {
        display: none;
      }
    }

    .sheet-cancel-btn {
      background-color: #fff;
      color: #666;
      border: 0.3vw solid #e0e0e0;

      &:active {
        background-color: #f5f5f5;
      }
    }

    .sheet-confirm-btn {
      background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
      color: #fff;
      border: none;
      box-shadow: 0 0.8vw 2vw rgba(var(--theme-shadow-rgb), 0.3);

      &[disabled] {
        opacity: 0.6;
      }
    }
  }
}

/* 编辑资料弹框 */
.profile-sheet {
  width: 100%;
  background-color: #fff;
  border-radius: 4vw 4vw 0 0;
  padding: 5vw 4vw;
  padding-bottom: calc(5vw + env(safe-area-inset-bottom));
  animation: slideUp 0.3s ease;

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6vw;

    .sheet-title {
      font-size: 4.4vw;
      font-weight: 600;
      color: #333;
    }

    .sheet-close {
      font-size: 5vw;
      color: #999;
      padding: 1vw 2vw;
    }
  }

  .sheet-footer {
    display: flex;
    gap: 3vw;

    .sheet-cancel-btn,
    .sheet-confirm-btn {
      flex: 1;
      border-radius: 6vw;
      padding: 3vw 0;
      font-size: 3.6vw;
      font-weight: 500;
      line-height: 1.2;

      &::after {
        display: none;
      }
    }

    .sheet-cancel-btn {
      background-color: #fff;
      color: #666;
      border: 0.3vw solid #e0e0e0;

      &:active {
        background-color: #f5f5f5;
      }
    }

    .sheet-confirm-btn {
      background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
      color: #fff;
      border: none;
      box-shadow: 0 0.8vw 2vw rgba(var(--theme-shadow-rgb), 0.3);

      &[disabled] {
        opacity: 0.6;
      }
    }
  }
}

.profile-sheet-body {
  margin-bottom: 6vw;

  .profile-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4vw 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  }

  .profile-label {
    font-size: 3.6vw;
    color: #333;
    font-weight: 500;
    flex-shrink: 0;
    margin-right: 4vw;
  }

  .avatar-btn {
    display: flex;
    align-items: center;
    gap: 2vw;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    line-height: 1;
    &::after {
      display: none;
    }
  }

  .profile-avatar-preview {
    width: 14vw;
    height: 14vw;
    border-radius: 50%;
    background-color: #f0f0f0;
  }

  .avatar-change-hint {
    font-size: 3vw;
    color: #999;
  }

  .profile-nickname-input {
    flex: 1;
    text-align: right;
    font-size: 3.6vw;
    color: #333;
    padding: 2vw 0;
  }
}

@keyframes fadeInMask {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* 消息提示 */
.message-toast {
  position: fixed;
  bottom: 5vw;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 3vw 6vw;
  border-radius: 5vw;
  font-size: 3.2vw;
  z-index: 999;
  animation: fadeIn 0.3s ease;

  .message-text {
    color: #fff;
  }
}

/* 留言弹框 */
.message-sheet {
  width: 100%;
  background-color: #fff;
  border-radius: 4vw 4vw 0 0;
  padding: 5vw 4vw;
  padding-bottom: calc(5vw + env(safe-area-inset-bottom));
  animation: slideUp 0.3s ease;

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4vw;

    .sheet-title {
      font-size: 4.4vw;
      font-weight: 600;
      color: #333;
    }

    .sheet-close {
      font-size: 5vw;
      color: #999;
      padding: 1vw 2vw;
    }
  }

  .sheet-footer {
    display: flex;
    gap: 3vw;

    .sheet-cancel-btn,
    .sheet-confirm-btn {
      flex: 1;
      border-radius: 6vw;
      padding: 3vw 0;
      font-size: 3.6vw;
      font-weight: 500;
      line-height: 1.2;

      &::after {
        display: none;
      }
    }

    .sheet-cancel-btn {
      background-color: #fff;
      color: #666;
      border: 0.3vw solid #e0e0e0;

      &:active {
        background-color: #f5f5f5;
      }
    }

    .sheet-confirm-btn {
      background: linear-gradient(135deg, var(--theme-start), var(--theme-end));
      color: #fff;
      border: none;
      box-shadow: 0 0.8vw 2vw rgba(var(--theme-shadow-rgb), 0.3);

      &[disabled] {
        opacity: 0.6;
      }
    }
  }
}

.message-sheet-body {
  margin-bottom: 4vw;

  .message-textarea {
    width: 100%;
    height: 30vw;
    background-color: #f5f5f5;
    border-radius: 2vw;
    padding: 3vw;
    font-size: 3.2vw;
    color: #333;
    box-sizing: border-box;
    line-height: 1.6;
  }

  .message-counter {
    display: block;
    text-align: right;
    font-size: 2.6vw;
    color: #bbb;
    margin-top: 1.5vw;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
