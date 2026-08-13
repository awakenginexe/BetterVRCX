<script setup>
    import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
    import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Globe, Image, Users } from 'lucide-vue-next';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useQuickSearchStore } from '../stores/quickSearch';
    import { useUserDisplay } from '../composables/useUserDisplay';

    import QuickSearchSync from './QuickSearchSync.vue';

    const { userImage } = useUserDisplay();
    const quickSearchStore = useQuickSearchStore();
    const {
        isOpen,
        query,
        friendResults,
        ownAvatarResults,
        favoriteAvatarResults,
        ownWorldResults,
        favoriteWorldResults,
        ownGroupResults,
        joinedGroupResults,
        hasResults
    } = storeToRefs(quickSearchStore);
    const { selectResult } = quickSearchStore;
    const { t } = useI18n();

    /**
     * @param item
     */
    function handleSelect(item) {
        selectResult(item);
    }
</script>

<template>
    <Dialog v-model:open="isOpen">
        <DialogContent
            class="bv-dialog-shell bv-quick-search-dialog overflow-hidden p-0 sm:max-w-2xl"
            data-surface="quick-search"
            :show-close-button="false">
            <DialogHeader class="bv-quick-search-header" data-slot="quick-search-header">
                <div class="min-w-0">
                    <div class="bv-eyebrow">{{ t('side_panel.search_categories') }}</div>
                    <DialogTitle class="bv-quick-search-title">{{ t('side_panel.search_placeholder') }}</DialogTitle>
                    <DialogDescription class="bv-quick-search-description">
                        {{ t('side_panel.search_scope_all') }}
                    </DialogDescription>
                </div>
                <span class="bv-badge shrink-0" aria-hidden="true">Esc</span>
            </DialogHeader>
            <Command class="bv-quick-search-command">
                <!-- Sync filterState.search → store.query -->
                <QuickSearchSync />
                <CommandInput
                    class="bv-quick-search-input"
                    :aria-label="t('side_panel.search_placeholder')"
                    :placeholder="t('side_panel.search_placeholder')" />
                <CommandList class="bv-quick-search-list max-h-[min(400px,50vh)] overflow-y-auto overflow-x-hidden">
                    <template v-if="!query || query.length < 2">
                        <CommandGroup class="bv-quick-search-group" :heading="t('side_panel.search_categories')">
                            <CommandItem :value="'hint-friends'" disabled class="gap-3 opacity-70">
                                <Users class="size-4" />
                                <span class="flex-1">{{ t('side_panel.search_friends') }}</span>
                                <span class="text-xs text-muted-foreground">{{
                                    t('side_panel.search_scope_all')
                                }}</span>
                            </CommandItem>
                            <CommandItem :value="'hint-avatars'" disabled class="gap-3 opacity-70">
                                <Image class="size-4" />
                                <span class="flex-1">{{ t('side_panel.search_avatars') }}</span>
                                <span class="text-xs text-muted-foreground">{{
                                    t('side_panel.search_scope_avatars')
                                }}</span>
                            </CommandItem>
                            <CommandItem :value="'hint-worlds'" disabled class="gap-3 opacity-70">
                                <Globe class="size-4" />
                                <span class="flex-1">{{ t('side_panel.search_worlds') }}</span>
                                <span class="text-xs text-muted-foreground">{{
                                    t('side_panel.search_scope_worlds')
                                }}</span>
                            </CommandItem>
                            <CommandItem :value="'hint-groups'" disabled class="gap-3 opacity-70">
                                <Users class="size-4" />
                                <span class="flex-1">{{ t('side_panel.search_groups') }}</span>
                                <span class="text-xs text-muted-foreground">{{
                                    t('side_panel.search_scope_joined')
                                }}</span>
                            </CommandItem>
                        </CommandGroup>
                    </template>

                    <template v-else>
                        <div
                            v-if="!hasResults"
                            class="bv-empty-state bv-quick-search-empty mx-3 my-3 min-h-32 py-6 text-center text-sm"
                            data-empty-state="quick-search"
                            role="status"
                            aria-live="polite">
                            {{ t('side_panel.search_no_results') }}
                        </div>

                        <CommandGroup
                            v-if="friendResults.length > 0"
                            class="bv-quick-search-group"
                            :heading="t('side_panel.friends')">
                            <CommandItem
                                v-for="item in friendResults"
                                :key="item.id"
                                :value="[item.name, item.memo, item.note, item.id].filter(Boolean).join(' ')"
                                class="bv-quick-search-item bv-focus-ring gap-3"
                                @select="handleSelect(item)">
                                <img
                                    v-if="item.ref"
                                    :src="userImage(item.ref)"
                                    class="size-6 rounded-full object-cover"
                                    loading="lazy" />
                                <Users v-else class="size-4" />
                                <div class="flex flex-col min-w-0">
                                    <span class="truncate" :style="{ color: item.ref?.$userColour }">
                                        {{ item.name }}
                                    </span>
                                    <span
                                        v-if="item.matchedField !== 'name' && item.memo"
                                        class="truncate text-xs text-muted-foreground">
                                        Memo: {{ item.memo }}
                                    </span>
                                    <span
                                        v-if="item.matchedField !== 'name' && item.note"
                                        class="truncate text-xs text-muted-foreground">
                                        Note: {{ item.note }}
                                    </span>
                                </div>
                            </CommandItem>
                        </CommandGroup>

                        <CommandGroup
                            v-if="ownAvatarResults.length > 0"
                            class="bv-quick-search-group"
                            :heading="t('side_panel.search_own_avatars')">
                            <CommandItem
                                v-for="item in ownAvatarResults"
                                :key="item.id"
                                :value="item.name + ' own ' + item.id"
                                class="bv-quick-search-item bv-focus-ring gap-3"
                                @select="handleSelect(item)">
                                <img
                                    v-if="item.imageUrl"
                                    :src="item.imageUrl"
                                    class="size-6 rounded object-cover"
                                    loading="lazy" />
                                <Image v-else class="size-4" />
                                <span class="truncate">{{ item.name }}</span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandGroup
                            v-if="favoriteAvatarResults.length > 0"
                            class="bv-quick-search-group"
                            :heading="t('side_panel.search_fav_avatars')">
                            <CommandItem
                                v-for="item in favoriteAvatarResults"
                                :key="item.id"
                                :value="item.name + ' fav ' + item.id"
                                class="bv-quick-search-item bv-focus-ring gap-3"
                                @select="handleSelect(item)">
                                <img
                                    v-if="item.imageUrl"
                                    :src="item.imageUrl"
                                    class="size-6 rounded object-cover"
                                    loading="lazy" />
                                <Image v-else class="size-4" />
                                <span class="truncate">{{ item.name }}</span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandGroup
                            v-if="ownWorldResults.length > 0"
                            class="bv-quick-search-group"
                            :heading="t('side_panel.search_own_worlds')">
                            <CommandItem
                                v-for="item in ownWorldResults"
                                :key="item.id"
                                :value="item.name + ' own ' + item.id"
                                class="bv-quick-search-item bv-focus-ring gap-3"
                                @select="handleSelect(item)">
                                <img
                                    v-if="item.imageUrl"
                                    :src="item.imageUrl"
                                    class="size-6 rounded object-cover"
                                    loading="lazy" />
                                <Globe v-else class="size-4" />
                                <span class="truncate">{{ item.name }}</span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandGroup
                            v-if="favoriteWorldResults.length > 0"
                            class="bv-quick-search-group"
                            :heading="t('side_panel.search_fav_worlds')">
                            <CommandItem
                                v-for="item in favoriteWorldResults"
                                :key="item.id"
                                :value="item.name + ' fav ' + item.id"
                                class="bv-quick-search-item bv-focus-ring gap-3"
                                @select="handleSelect(item)">
                                <img
                                    v-if="item.imageUrl"
                                    :src="item.imageUrl"
                                    class="size-6 rounded object-cover"
                                    loading="lazy" />
                                <Globe v-else class="size-4" />
                                <span class="truncate">{{ item.name }}</span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandGroup
                            v-if="ownGroupResults.length > 0"
                            class="bv-quick-search-group"
                            :heading="t('side_panel.search_own_groups')">
                            <CommandItem
                                v-for="item in ownGroupResults"
                                :key="item.id"
                                :value="item.name + ' own ' + item.id"
                                class="bv-quick-search-item bv-focus-ring gap-3"
                                @select="handleSelect(item)">
                                <img
                                    v-if="item.imageUrl"
                                    :src="item.imageUrl"
                                    class="size-6 rounded object-cover"
                                    loading="lazy" />
                                <Users v-else class="size-4" />
                                <span class="truncate">{{ item.name }}</span>
                            </CommandItem>
                        </CommandGroup>

                        <CommandGroup
                            v-if="joinedGroupResults.length > 0"
                            class="bv-quick-search-group"
                            :heading="t('side_panel.search_joined_groups')">
                            <CommandItem
                                v-for="item in joinedGroupResults"
                                :key="item.id"
                                :value="item.name + ' joined ' + item.id"
                                class="bv-quick-search-item bv-focus-ring gap-3"
                                @select="handleSelect(item)">
                                <img
                                    v-if="item.imageUrl"
                                    :src="item.imageUrl"
                                    class="size-6 rounded object-cover"
                                    loading="lazy" />
                                <Users v-else class="size-4" />
                                <span class="truncate">{{ item.name }}</span>
                            </CommandItem>
                        </CommandGroup>
                    </template>
                </CommandList>
            </Command>
        </DialogContent>
    </Dialog>
</template>

<style scoped>
    .bv-quick-search-dialog {
        overflow: hidden;
        color: var(--bv-text-strong);
    }

    .bv-quick-search-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        padding: 18px 20px 14px;
        border-bottom: 1px solid var(--bv-border);
        background: var(--bv-bg-surface);
    }

    .bv-quick-search-title {
        margin-top: 4px;
        color: var(--bv-text-strong);
        font-size: 18px;
        font-weight: 700;
        line-height: 1.25;
    }

    .bv-quick-search-description {
        margin-top: 4px;
        color: var(--bv-text-quiet);
        font-size: 11px;
    }

    .bv-quick-search-command {
        background: var(--bv-bg-control);
    }

    :deep([data-slot='command-input-wrapper']) {
        height: 3.25rem;
        gap: 0.625rem;
        border-bottom-color: var(--bv-border);
        background: var(--bv-bg-control);
    }

    :deep([data-slot='command-input-wrapper'] > .lucide-search) {
        color: var(--bv-accent-primary);
    }

    :deep([data-slot='command-input']) {
        height: 3rem;
        color: var(--bv-text-strong);
        font-size: 15px;
    }

    :deep([data-slot='command-item']) {
        min-height: 42px;
        border-inline-start: 2px solid transparent;
        color: var(--bv-text-strong);
        font-size: 13px;
        transition:
            background-color 160ms ease,
            border-color 160ms ease;
    }

    :deep([data-slot='command-item'][data-highlighted]) {
        border-inline-start-color: var(--bv-accent);
        background: var(--bv-bg-hover);
    }

    :deep([data-slot='command-group-heading']) {
        padding: 12px 12px 6px;
        color: var(--bv-accent-primary);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .bv-quick-search-empty {
        min-height: 128px;
        background: var(--bv-bg-surface);
        color: var(--bv-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
        :deep([data-slot='command-item']) {
            transition-duration: 0.01ms;
        }
    }
</style>
