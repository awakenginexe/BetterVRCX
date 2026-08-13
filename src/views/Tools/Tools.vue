<template>
    <div id="chart" class="tools-page x-container">
        <header class="tools-page__header">
            <div class="min-w-0">
                <h1>{{ t('view.tools.header') }}</h1>
            </div>
            <div class="tools-page__search">
                <InputGroupSearch
                    v-model="toolSearch"
                    data-testid="tools-search"
                    size="sm"
                    :placeholder="t('view.search.search_placeholder')" />
                <span data-testid="tools-result-count" class="tools-page__count">
                    {{ visibleToolCount }} / {{ totalToolCount }}
                </span>
            </div>
        </header>

        <main class="tools-page__catalog">
            <section
                v-for="category in filteredCategories"
                :key="category.key"
                class="tools-category"
                :data-category="category.key">
                <div
                    class="tools-category__toggle cursor-pointer"
                    role="button"
                    tabindex="0"
                    :aria-expanded="isSearching || !categoryCollapsed[category.key]"
                    @click="toggleCategory(category.key)"
                    @keydown.enter.prevent="toggleCategory(category.key)"
                    @keydown.space.prevent="toggleCategory(category.key)">
                    <span class="tools-category__heading">
                        <i
                            class="ri-arrow-down-s-line tools-category__chevron"
                            :class="{ '-rotate-90': !isSearching && categoryCollapsed[category.key] }" />
                        <span>{{ t(category.labelKey) }}</span>
                    </span>
                    <span class="tools-category__count">{{ category.tools.length }}</span>
                </div>

                <div v-show="isSearching || !categoryCollapsed[category.key]" class="tools-category__grid">
                    <ToolItem
                        v-for="tool in category.tools"
                        :key="tool.key"
                        :icon="tool.navIcon"
                        :title="t(tool.titleKey)"
                        :description="t(tool.descriptionKey)"
                        :pinned="pinnedToolKeys.has(tool.key)"
                        :data-tool-key="tool.key"
                        @activate="triggerTool(tool)"
                        @click="triggerTool(tool)">
                        <template #actions>
                            <TooltipWrapper
                                v-if="tool.navEligible && pinnedToolKeys.has(tool.key)"
                                side="top"
                                :content="t('nav_menu.custom_nav.unpin_from_nav')">
                                <Button
                                    size="icon-xs"
                                    variant="secondary"
                                    class="tool-item__pin"
                                    :title="t('nav_menu.custom_nav.unpin_from_nav')"
                                    :ariaLabel="t('nav_menu.custom_nav.unpin_from_nav')"
                                    @click.stop="unpinToolFromNav(tool.key)">
                                    <span class="relative inline-flex size-4">
                                        <i
                                            class="ri-side-bar-line inline-flex size-4 items-center justify-center text-base" />
                                        <span class="tools-page__pin-state">
                                            <i
                                                class="ri-subtract-line inline-flex size-2 items-center justify-center text-[10px]" />
                                        </span>
                                    </span>
                                </Button>
                            </TooltipWrapper>

                            <TooltipWrapper
                                v-else-if="tool.navEligible"
                                side="top"
                                :content="t('nav_menu.custom_nav.pin_to_nav')">
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    class="tool-item__pin"
                                    :title="t('nav_menu.custom_nav.pin_to_nav')"
                                    :ariaLabel="t('nav_menu.custom_nav.pin_to_nav')"
                                    @click.stop="pinToolToNav(tool.key)">
                                    <span class="relative inline-flex size-4">
                                        <i
                                            class="ri-side-bar-line inline-flex size-4 items-center justify-center text-base" />
                                        <span class="tools-page__pin-state">
                                            <i
                                                class="ri-add-line inline-flex size-2 items-center justify-center text-[10px]" />
                                        </span>
                                    </span>
                                </Button>
                            </TooltipWrapper>
                        </template>
                    </ToolItem>
                </div>
            </section>

            <div v-if="!filteredCategories.length" class="bv-empty-state tools-page__empty">
                <i class="ri-search-eye-line text-2xl" aria-hidden="true" />
                <span>{{ t('common.no_matching_records') }}</span>
            </div>
        </main>
    </div>
</template>

<script setup>
    import { computed, onMounted, ref } from 'vue';
    import { useI18n } from 'vue-i18n';

    import { Button } from '@/components/ui/button';
    import { InputGroupSearch } from '@/components/ui/input-group';
    import { TooltipWrapper } from '@/components/ui/tooltip';
    import ToolItem from './components/ToolItem.vue';
    import { useToolActions } from '../../composables/useToolActions';
    import { useToolNavPinning } from '../../composables/useToolNavPinning';
    import { getToolsByCategory, toolCategories } from '../../shared/constants';
    import configRepository from '../../services/config.js';

    const { t } = useI18n();
    const { triggerTool } = useToolActions();
    const { pinToolToNav, pinnedToolKeys, refreshPinnedState, unpinToolFromNav } = useToolNavPinning();
    const toolsCategoryCollapsedConfigKey = 'VRCX_toolsCategoryCollapsed';

    const categories = toolCategories.map((category) => ({
        ...category,
        tools: getToolsByCategory(category.key)
    }));
    const totalToolCount = categories.reduce((count, category) => count + category.tools.length, 0);
    const toolSearch = ref('');
    const normalizedSearch = computed(() => toolSearch.value.trim().toLocaleLowerCase());
    const isSearching = computed(() => normalizedSearch.value.length > 0);
    const filteredCategories = computed(() => {
        if (!isSearching.value) {
            return categories;
        }

        return categories
            .map((category) => ({
                ...category,
                tools: category.tools.filter((tool) => {
                    const searchableText = [t(tool.titleKey), t(tool.descriptionKey), t(category.labelKey)]
                        .join(' ')
                        .toLocaleLowerCase();
                    return searchableText.includes(normalizedSearch.value);
                })
            }))
            .filter((category) => category.tools.length > 0);
    });
    const visibleToolCount = computed(() =>
        filteredCategories.value.reduce((count, category) => count + category.tools.length, 0)
    );

    const categoryCollapsed = ref({
        group: false,
        image: false,
        shortcuts: false,
        system: false,
        user: false,
        other: false
    });

    const toggleCategory = (category) => {
        categoryCollapsed.value[category] = !categoryCollapsed.value[category];
        configRepository.setString(toolsCategoryCollapsedConfigKey, JSON.stringify(categoryCollapsed.value));
    };

    onMounted(async () => {
        await refreshPinnedState();
        const storedValue = await configRepository.getString(toolsCategoryCollapsedConfigKey, '{}');
        try {
            const parsed = JSON.parse(storedValue);
            categoryCollapsed.value = {
                ...categoryCollapsed.value,
                ...parsed
            };
        } catch {
            // ignore invalid stored value and keep defaults
        }
    });
</script>

<style scoped>
    .tools-page {
        display: flex;
        min-height: 0;
        flex-direction: column;
        gap: 18px;
        overflow: hidden;
        padding: 18px 20px 20px;
    }

    .tools-page__header {
        display: flex;
        flex: 0 0 auto;
        align-items: end;
        justify-content: space-between;
        gap: 20px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--bv-border-default);
    }

    .tools-page__header h1 {
        margin: 0;
        color: var(--bv-text-strong);
        font-size: var(--bv-text-xl);
        font-weight: var(--bv-weight-bold);
        letter-spacing: 0;
    }

    .tools-page__search {
        display: flex;
        width: min(360px, 100%);
        align-items: center;
        gap: 10px;
    }

    .tools-page__count,
    .tools-category__count {
        color: var(--bv-text-quiet);
        font-size: var(--bv-text-xs);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    .tools-page__catalog {
        min-height: 0;
        overflow-y: auto;
        padding-right: 4px;
    }

    .tools-category + .tools-category {
        margin-top: 20px;
    }

    .tools-category__toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 34px;
        margin-bottom: 8px;
        padding: 4px 6px;
        border-radius: var(--bv-radius-md);
        color: var(--bv-text-strong);
        transition: background-color var(--bv-motion-duration-fast) var(--bv-motion-ease-standard);
    }

    .tools-category__toggle:hover,
    .tools-category__toggle:focus-visible {
        background-color: var(--bv-bg-hover);
        outline: none;
    }

    .tools-category__heading {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: var(--bv-text-sm);
        font-weight: var(--bv-weight-semibold);
    }

    .tools-category__chevron {
        color: var(--bv-text-muted);
        transition: transform var(--bv-motion-duration-fast) var(--bv-motion-ease-standard);
    }

    .tools-category__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
        gap: 8px;
    }

    .tools-page__pin-state {
        position: absolute;
        top: -4px;
        right: -4px;
        display: grid;
        width: 10px;
        height: 10px;
        place-items: center;
        border-radius: var(--bv-radius-full);
        background: var(--bv-bg-control);
    }

    .tools-page__empty {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    @media (max-width: 720px) {
        .tools-page {
            padding: 14px;
        }

        .tools-page__header {
            align-items: stretch;
            flex-direction: column;
        }

        .tools-page__search {
            width: 100%;
        }

        .tools-category__grid {
            grid-template-columns: 1fr;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .tools-category__toggle,
        .tools-category__chevron {
            transition: none;
        }
    }
</style>
