<template>
  <view v-if="visible" class="guard-overlay">
    <view class="guard-dialog">
      <!-- 标题 -->
      <view class="guard-header">
        <text class="guard-title">小眼睛累了吧？休息一会儿</text>
        <view class="guard-close" @tap="onClose">
          <text class="guard-close-icon">✕</text>
        </view>
      </view>

      <!-- 算术题 -->
      <view class="guard-question">
        <text class="question-text">{{ questionText }}</text>
        <view class="answer-box">
          <text class="answer-text">{{ inputAnswer || '' }}</text>
          <view class="answer-cursor" />
        </view>
      </view>

      <!-- 错误提示 -->
      <text v-if="showError" class="guard-error">回答错误，请重新计算</text>

      <!-- 数字键盘 -->
      <view class="guard-keyboard">
        <view
          v-for="key in keys"
          :key="key"
          class="key-item"
          :class="{
            'key-delete': key === 'del',
            'key-empty': key === '',
          }"
          @tap="onKeyTap(key)"
        >
          <text
            class="key-text"
            :class="{ 'key-text-delete': key === 'del' }"
            >{{ key === 'del' ? '⌫' : key }}</text
          >
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'success'): void
  (e: 'close'): void
}>()

// 算术题相关
const numA = ref(0)
const numB = ref(0)
const operator = ref('+')
const inputAnswer = ref('')
const showError = ref(false)

const OPERATORS = ['+', '-', '×', '÷']

/** 生成 100 以内的随机算术题 */
function generateQuestion() {
  const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)]
  operator.value = op
  if (op === '+') {
    numA.value = Math.floor(Math.random() * 90) + 5
    numB.value = Math.floor(Math.random() * (100 - numA.value)) + 1
  } else if (op === '-') {
    numA.value = Math.floor(Math.random() * 90) + 10
    numB.value = Math.floor(Math.random() * numA.value) + 1
  } else if (op === '×') {
    numA.value = Math.floor(Math.random() * 9) + 2
    numB.value = Math.floor(Math.random() * 9) + 2
  } else {
    // 除法：保证整除
    numB.value = Math.floor(Math.random() * 9) + 2
    const quotient = Math.floor(Math.random() * 9) + 2
    numA.value = numB.value * quotient
  }
  inputAnswer.value = ''
  showError.value = false
}

/** 计算正确答案 */
function getCorrectAnswer(): number {
  switch (operator.value) {
    case '+':
      return numA.value + numB.value
    case '-':
      return numA.value - numB.value
    case '×':
      return numA.value * numB.value
    case '÷':
      return numA.value / numB.value
    default:
      return 0
  }
}

const questionText = computed(
  () => `${numA.value} ${operator.value} ${numB.value} =`,
)

// 键盘按键布局
const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

/** 弹框显示时生成新题目 */
watch(
  () => props.visible,
  (val) => {
    if (val) {
      generateQuestion()
    }
  },
)

function onKeyTap(key: string) {
  if (key === '') return
  if (key === 'del') {
    inputAnswer.value = inputAnswer.value.slice(0, -1)
    showError.value = false
    return
  }
  // 数字键，最多3位
  if (inputAnswer.value.length >= 3) return
  inputAnswer.value += key
  showError.value = false
  // 输入位数达到正确答案位数时自动验证，答对直接关闭
  const correct = getCorrectAnswer()
  if (inputAnswer.value.length >= String(correct).length) {
    if (parseInt(inputAnswer.value, 10) === correct) {
      emit('success')
    } else {
      showError.value = true
      inputAnswer.value = ''
    }
  }
}

function onClose() {
  emit('close')
}
</script>

<style lang="less" scoped>
.guard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.guard-dialog {
  width: 38vw;
  background: #fff;
  border-radius: 2.4vw;
  padding: 2.8vw 2.4vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 1vw 4vw rgba(var(--theme-shadow-rgb), 0.25);
}

.guard-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 2.2vw;
}

.guard-title {
  font-size: 2vw;
  font-weight: 700;
  color: var(--theme-end);
}

.guard-close {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3.6vw;
  height: 3.6vw;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f5f5;

  &:active {
    background: #eee;
  }
}

.guard-close-icon {
  font-size: 1.8vw;
  color: #999;
}

.guard-question {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.6vw;
  margin-bottom: 2vw;
}

.question-text {
  font-size: 3.4vw;
  font-weight: 700;
  color: #333;
}

.answer-box {
  width: 8vw;
  height: 5.2vw;
  border: 0.25vw solid var(--theme-end);
  border-radius: 1vw;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: rgba(var(--theme-shadow-rgb), 0.04);
}

.answer-text {
  font-size: 3vw;
  font-weight: 700;
  color: #333;
}

.answer-cursor {
  position: absolute;
  bottom: 0.7vw;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 0.25vw;
  background: var(--theme-end);
}

.guard-error {
  font-size: 1.6vw;
  color: #e53935;
  margin-bottom: 1vw;
}

.guard-keyboard {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.4vw;
  justify-items: center;
}

.key-item {
  width: 5.2vw;
  height: 5.2vw;
  background: linear-gradient(145deg, var(--theme-start), var(--theme-end));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0.4vw 1vw rgba(var(--theme-shadow-rgb), 0.3);

  &:active {
    opacity: 0.75;
    transform: scale(0.92);
  }
}

.key-empty {
  background: transparent;
  box-shadow: none;
  pointer-events: none;
}

.key-delete {
  background: #eef0f3;
  box-shadow: none;
}

.key-text {
  font-size: 2.6vw;
  font-weight: 700;
  color: #fff;
}

.key-text-delete {
  font-size: 2.6vw;
  color: #666;
}
</style>
