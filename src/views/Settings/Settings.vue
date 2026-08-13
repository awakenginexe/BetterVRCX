<template>
    <div class="settings-page x-container">
        <header class="settings-page__header">
            <div>
                <h1>{{ t('view.settings.header') }}</h1>
                <span class="settings-page__active-label">{{ activeTabDefinition.label }}</span>
            </div>
        </header>

        <div class="settings-page__layout">
            <aside class="settings-page__rail bv-surface">
                <nav class="settings-page__nav" :aria-label="t('view.settings.header')">
                    <section v-for="section in settingsSections" :key="section.key" class="settings-page__nav-section">
                        <h2>{{ section.label }}</h2>
                        <button
                            v-for="tab in section.tabs"
                            :key="tab.key"
                            type="button"
                            class="settings-page__nav-item bv-focus-ring"
                            :class="{ 'settings-page__nav-item--active': activeTab === tab.key }"
                            :data-settings-tab="tab.key"
                            :aria-current="activeTab === tab.key ? 'page' : undefined"
                            @click="activeTab = tab.key">
                            <i :class="tab.icon" aria-hidden="true" />
                            <span>{{ tab.label }}</span>
                        </button>
                    </section>
                </nav>
            </aside>

            <main class="settings-page__content">
                <section
                    v-for="tab in settingsTabs"
                    v-show="activeTab === tab.key"
                    :key="tab.key"
                    :data-settings-panel="tab.key"
                    class="settings-page__panel"
                    :aria-label="tab.label">
                    <component :is="tab.component" />
                </section>
            </main>
        </div>
    </div>
</template>

<script setup>
    import { computed, onBeforeMount, ref } from 'vue';
    import { useI18n } from 'vue-i18n';

    import AdvancedTab from './components/Tabs/AdvancedTab.vue';
    import InterfaceTab from './components/Tabs/InterfaceTab.vue';
    import IntegrationsTab from './components/Tabs/IntegrationsTab.vue';
    import MediaTab from './components/Tabs/MediaTab.vue';
    import NotificationsTab from './components/Tabs/NotificationsTab.vue';
    import SocialTab from './components/Tabs/SocialTab.vue';
    import SystemTab from './components/Tabs/SystemTab.vue';
    import VrTab from './components/Tabs/VrTab.vue';

    const { t } = useI18n();
    const activeTab = ref('system');
    const settingsTabs = computed(() => [
        {
            key: 'system',
            label: t('view.settings.category.system'),
            icon: 'ri-computer-line',
            component: SystemTab
        },
        {
            key: 'interface',
            label: t('view.settings.category.interface'),
            icon: 'ri-layout-2-line',
            component: InterfaceTab
        },
        {
            key: 'social',
            label: t('view.settings.category.social'),
            icon: 'ri-user-heart-line',
            component: SocialTab
        },
        {
            key: 'notifications',
            label: t('view.settings.category.notifications'),
            icon: 'ri-notification-3-line',
            component: NotificationsTab
        },
        { key: 'vr', label: t('view.settings.category.vr'), icon: 'ri-vip-diamond-line', component: VrTab },
        { key: 'media', label: t('view.settings.category.media'), icon: 'ri-image-line', component: MediaTab },
        {
            key: 'integrations',
            label: t('view.settings.category.integrations'),
            icon: 'ri-plug-line',
            component: IntegrationsTab
        },
        {
            key: 'advanced',
            label: t('view.settings.category.advanced'),
            icon: 'ri-tools-line',
            component: AdvancedTab
        }
    ]);
    const settingsSections = computed(() => {
        const sectionDefinitions = [
            {
                key: 'general',
                label: t('view.settings.category.general'),
                tabKeys: ['system', 'interface', 'social']
            },
            {
                key: 'experience',
                label: t('view.settings.category.notifications'),
                tabKeys: ['notifications', 'vr', 'media']
            },
            {
                key: 'operations',
                label: t('view.settings.category.advanced'),
                tabKeys: ['integrations', 'advanced']
            }
        ];

        return sectionDefinitions.map((section) => ({
            ...section,
            tabs: section.tabKeys.map((key) => settingsTabs.value.find((tab) => tab.key === key))
        }));
    });
    const activeTabDefinition = computed(
        () => settingsTabs.value.find((tab) => tab.key === activeTab.value) ?? settingsTabs.value[0]
    );

    onBeforeMount(() => {
        const menuItem = document.querySelector('li[role="menuitem"].is-active');

        if (menuItem) {
            menuItem.classList.remove('is-active');
        }
    });
</script>

<style scoped>
    .settings-page {
        display: flex;
        min-height: 0;
        flex-direction: column;
        gap: 14px;
        overflow: hidden;
        padding: 16px 18px 18px;
    }

    .settings-page__header {
        flex: 0 0 auto;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--bv-border);
    }

    .settings-page__header h1 {
        margin: 0;
        color: var(--bv-text-strong);
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0;
    }

    .settings-page__active-label {
        display: block;
        margin-top: 2px;
        color: var(--bv-text-muted);
        font-size: 12px;
    }

    .settings-page__layout {
        display: grid;
        min-height: 0;
        flex: 1;
        grid-template-columns: 214px minmax(0, 1fr);
        gap: 14px;
        overflow: hidden;
    }

    .settings-page__rail {
        min-height: 0;
        overflow-y: auto;
        padding: 8px;
    }

    .settings-page__nav {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .settings-page__nav-section {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .settings-page__nav-section + .settings-page__nav-section {
        padding-top: 10px;
        border-top: 1px solid var(--bv-border);
    }

    .settings-page__nav-section h2 {
        margin: 0 8px 4px;
        color: var(--bv-text-quiet);
        font-size: 10px;
        font-weight: 650;
    }

    .settings-page__nav-item {
        display: flex;
        min-height: 36px;
        cursor: pointer;
        align-items: center;
        gap: 9px;
        padding: 6px 9px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--bv-text-muted);
        font: inherit;
        font-size: 12px;
        text-align: left;
        transition:
            background-color 160ms ease,
            color 160ms ease;
    }

    .settings-page__nav-item i {
        width: 18px;
        color: var(--bv-text-quiet);
        font-size: 16px;
        text-align: center;
    }

    .settings-page__nav-item:hover {
        background: var(--bv-bg-hover);
        color: var(--bv-text-strong);
    }

    .settings-page__nav-item--active {
        background: color-mix(in srgb, var(--bv-accent) 13%, var(--bv-bg-control));
        color: var(--bv-text-strong);
        font-weight: 650;
    }

    .settings-page__nav-item--active i {
        color: var(--bv-accent-primary);
    }

    .settings-page__content,
    .settings-page__panel {
        min-height: 0;
    }

    .settings-page__content {
        overflow-y: auto;
        padding: 2px 8px 18px 2px;
    }

    .settings-page__panel {
        width: min(100%, 920px);
        margin: 0 auto;
    }

    @media (max-width: 780px) {
        .settings-page__layout {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .settings-page__rail {
            flex: 0 0 auto;
            overflow-x: auto;
            overflow-y: hidden;
        }

        .settings-page__nav {
            width: max-content;
            flex-direction: row;
            gap: 8px;
        }

        .settings-page__nav-section {
            flex-direction: row;
        }

        .settings-page__nav-section + .settings-page__nav-section {
            padding: 0 0 0 8px;
            border-top: 0;
            border-left: 1px solid var(--bv-border);
        }

        .settings-page__nav-section h2 {
            display: none;
        }

        .settings-page__content {
            flex: 1;
        }
    }

    @media (max-width: 520px) {
        .settings-page {
            padding: 12px;
        }

        .settings-page__nav-item span {
            display: none;
        }

        .settings-page__nav-item {
            justify-content: center;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .settings-page__nav-item {
            transition: none;
        }
    }
</style>
