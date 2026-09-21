<template>
  <div class="home-page">
    <header class="home-header">
      <RouterLink class="brand" to="/" :aria-label="$t('home.pageTitle')">
        <ArtLogo :size="34" />
        <span>{{ AppConfig.systemInfo.name }}</span>
      </RouterLink>

      <div class="header-actions">
        <ArtIconButton
          :icon="isDark ? 'ri:sun-fill' : 'ri:moon-line'"
          :aria-label="$t('setting.theme.title')"
          @click="themeAnimation"
        />
        <template v-if="isLogin">
          <ElButton type="primary" @click="navigateTo('/dashboard/console')">
            {{ $t('home.hero.primaryAction') }}
          </ElButton>
        </template>
        <template v-else>
          <ElButton
            class="header-auth-button"
            text
            @click="navigateTo('/auth/login?redirect=/dashboard/console')"
          >
            {{ $t('home.hero.loginAction') }}
          </ElButton>
          <ElButton class="header-auth-button" type="primary" @click="navigateTo('/auth/register')">
            {{ $t('home.hero.registerAction') }}
          </ElButton>
        </template>
      </div>
    </header>

    <main>
      <section class="hero-section">
        <div class="hero-copy">
          <p class="section-eyebrow">{{ $t('home.hero.eyebrow') }}</p>
          <h1>{{ $t('home.hero.title') }}</h1>
          <p class="hero-description">{{ $t('home.hero.description') }}</p>
          <div class="hero-actions">
            <ElButton type="primary" size="large" @click="navigateTo(primaryActionPath)">
              {{ isLogin ? $t('home.hero.primaryAction') : $t('home.hero.registerAction') }}
              <ArtSvgIcon icon="ri:arrow-right-line" />
            </ElButton>
            <ElButton size="large" @click="navigateTo('/model-square')">
              {{ $t('home.hero.secondaryAction') }}
            </ElButton>
          </div>
        </div>

        <div class="gateway-panel" aria-hidden="true">
          <div class="gateway-panel__header">
            <div class="gateway-panel__title">
              <span class="status-dot"></span>
              <span>{{ $t('home.hero.terminalLabel') }}</span>
            </div>
            <span class="gateway-panel__status">{{ $t('home.hero.terminalStatus') }}</span>
          </div>
          <div class="gateway-route">
            <div class="route-node route-node--request">
              <ArtSvgIcon icon="ri:code-s-slash-line" />
              <div class="route-node__copy">
                <span>{{ $t('home.hero.terminalRequest') }}</span>
                <small>{{ $t('home.hero.terminalProviders') }}</small>
              </div>
            </div>
            <div class="route-line">
              <span></span>
            </div>
            <div class="route-node route-node--gateway">
              <ArtLogo :size="42" />
              <strong>{{ AppConfig.systemInfo.name }}</strong>
            </div>
            <div class="route-line route-line--outbound">
              <span></span>
            </div>
            <div class="route-node route-node--response">
              <ArtSvgIcon icon="ri:route-line" />
              <span>{{ $t('home.hero.terminalResponse') }}</span>
            </div>
          </div>
          <p class="gateway-panel__footnote">{{ $t('home.hero.terminalFootnote') }}</p>
        </div>
      </section>

      <section class="stats-section" aria-label="stats">
        <div v-for="stat in stats" :key="stat.label" class="stat-item">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      </section>

      <section id="features" class="content-section">
        <div class="section-heading">
          <p class="section-eyebrow">{{ $t('home.features.eyebrow') }}</p>
          <h2>{{ $t('home.features.title') }}</h2>
          <p>{{ $t('home.features.description') }}</p>
        </div>
        <div class="feature-grid">
          <article v-for="feature in features" :key="feature.title" class="feature-card">
            <div class="feature-icon">
              <ArtSvgIcon :icon="feature.icon" />
            </div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </article>
        </div>
      </section>

      <section id="workflow" class="content-section workflow-section">
        <div class="section-heading">
          <p class="section-eyebrow">{{ $t('home.workflow.eyebrow') }}</p>
          <h2>{{ $t('home.workflow.title') }}</h2>
        </div>
        <div class="workflow-grid">
          <article v-for="step in workflow" :key="step.number" class="workflow-step">
            <div class="step-icon">
              <ArtSvgIcon :icon="step.icon" />
              <span>{{ step.number }}</span>
            </div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </article>
        </div>
      </section>

      <section class="cta-section">
        <div>
          <h2>{{ $t('home.cta.title') }}</h2>
          <p>{{ $t('home.cta.description') }}</p>
        </div>
        <ElButton type="primary" size="large" @click="navigateTo(primaryActionPath)">
          {{ $t('home.cta.action') }}
          <ArtSvgIcon icon="ri:arrow-right-line" />
        </ElButton>
      </section>
    </main>

    <footer class="home-footer">
      <div class="brand brand--footer">
        <ArtLogo :size="28" />
        <span>{{ AppConfig.systemInfo.name }}</span>
      </div>
      <p>{{ $t('home.footer') }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import AppConfig from '@/config'
  import { useSettingStore } from '@/store/modules/setting'
  import { useUserStore } from '@/store/modules/user'
  import { themeAnimation } from '@/utils/ui/animation'

  defineOptions({ name: 'PublicHome' })

  const router = useRouter()
  const { t } = useI18n()
  const settingStore = useSettingStore()
  const userStore = useUserStore()
  const { isDark } = storeToRefs(settingStore)
  const { isLogin } = storeToRefs(userStore)

  /**
   * 计算当前主操作应跳转的页面
   * @returns 登录后进入控制台，未登录时进入注册页
   */
  const primaryActionPath = computed(() =>
    isLogin.value ? '/dashboard/console' : '/auth/register'
  )

  /**
   * 生成主页展示的平台指标
   * @returns 已本地化的平台指标列表
   */
  const stats = computed(() => [
    { value: '50+', label: t('home.stats.providers') },
    { value: '50+', label: t('home.stats.routes') },
    { value: '100%', label: t('home.stats.billing') },
    { value: '24/7', label: t('home.stats.visibility') }
  ])

  /**
   * 生成主页展示的平台能力
   * @returns 已本地化的平台能力列表
   */
  const features = computed(() => [
    {
      icon: 'ri:stack-line',
      title: t('home.features.unified.title'),
      description: t('home.features.unified.description')
    },
    {
      icon: 'ri:key-2-line',
      title: t('home.features.secure.title'),
      description: t('home.features.secure.description')
    },
    {
      icon: 'ri:line-chart-line',
      title: t('home.features.observable.title'),
      description: t('home.features.observable.description')
    },
    {
      icon: 'ri:money-dollar-circle-line',
      title: t('home.features.flexible.title'),
      description: t('home.features.flexible.description')
    }
  ])

  /**
   * 生成主页展示的接入步骤
   * @returns 已本地化的接入步骤列表
   */
  const workflow = computed(() => [
    {
      number: '1',
      icon: 'ri:key-2-line',
      title: t('home.workflow.create.title'),
      description: t('home.workflow.create.description')
    },
    {
      number: '2',
      icon: 'ri:plug-line',
      title: t('home.workflow.connect.title'),
      description: t('home.workflow.connect.description')
    },
    {
      number: '3',
      icon: 'ri:bar-chart-box-line',
      title: t('home.workflow.monitor.title'),
      description: t('home.workflow.monitor.description')
    }
  ])

  /**
   * 跳转到指定页面
   * @param path 目标路由路径
   * @returns 无返回值
   */
  const navigateTo = (path: string): void => {
    router.push(path)
  }
</script>

<style lang="scss" scoped>
  @use './style';
</style>
