<template>
    <div class="search-view x-container">
        <header class="search-view__page-header bv-surface">
            <div>
                <span class="bv-eyebrow">{{ t('nav_tooltip.social') }}</span>
                <h1>{{ t('nav_tooltip.search') }}</h1>
            </div>
            <div class="search-view__context" aria-live="polite">
                <span>{{ activeSearchLabel }}</span>
                <strong class="search-view__result-count font-mono">{{ activeResultCount }}</strong>
            </div>
        </header>
        <Tabs v-model="activeSearchTab" :unmount-on-hide="false" aria-label="Search tabs" class="search-view__tabs">
            <div class="search-view__toolbar bv-surface-raised">
                <TabsList class="search-view__tab-list">
                    <TabsTrigger class="bv-focus-ring" value="user">{{ t('view.search.user.header') }}</TabsTrigger>
                    <TabsTrigger class="bv-focus-ring" value="world">{{ t('view.search.world.header') }}</TabsTrigger>
                    <TabsTrigger class="bv-focus-ring" value="avatar">{{ t('view.search.avatar.header') }}</TabsTrigger>
                    <TabsTrigger class="bv-focus-ring" value="group">{{ t('view.search.group.header') }}</TabsTrigger>
                </TabsList>
                <div class="search-view__query">
                    <InputGroupField
                        :model-value="searchText"
                        :placeholder="searchPlaceholder"
                        class="bv-focus-ring"
                        clearable
                        @input="updateSearchText"
                        @keyup.enter="search" />
                    <TooltipWrapper side="bottom" :content="t('view.search.clear_results_tooltip')">
                        <Button
                            class="rounded-full ml-2 bv-focus-ring"
                            size="icon"
                            variant="ghost"
                            :ariaLabel="t('view.search.clear_results_tooltip')"
                            @click="handleClearSearch">
                            <Trash2 />
                        </Button>
                    </TooltipWrapper>
                </div>
            </div>
            <TabsContent value="user" class="search-view__panel">
                <div class="search-view__panel-body">
                    <div class="search-view__filters">
                        <label class="inline-flex items-center gap-2 ml-2">
                            <Checkbox v-model="searchUserByBio" />
                            <span>{{ t('view.search.user.search_by_bio') }}</span>
                        </label>
                        <label class="inline-flex items-center gap-2 ml-2">
                            <Checkbox v-model="searchUserSortByLastLoggedIn" />
                            <span>{{ t('view.search.user.sort_by_last_logged_in') }}</span>
                        </label>
                    </div>
                    <div class="search-view__results bv-surface">
                        <div v-if="isSearchUserLoading" class="search-view__loading" role="status" aria-live="polite">
                            <Spinner class="text-2xl" />
                            <span>{{ t('nav_tooltip.search') }}</span>
                        </div>
                        <template v-else-if="searchUserResults.length > 0">
                            <Item
                                v-for="user in searchUserResults"
                                :key="user.id"
                                class="search-view__result-row bv-surface-raised bv-focus-ring"
                                role="button"
                                tabindex="0"
                                @click="showUserDialog(user.id)"
                                @keydown.enter="showUserDialog(user.id)"
                                @keydown.space.prevent="showUserDialog(user.id)">
                                <ItemMedia variant="image">
                                    <Avatar>
                                        <AvatarImage :src="userImage(user, true)" loading="lazy" />
                                        <AvatarFallback>
                                            <User class="size-5 text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                </ItemMedia>
                                <ItemContent class="min-w-0">
                                    <ItemTitle class="flex items-center gap-1.5 max-w-full">
                                        <span class="truncate">{{ user.displayName }}</span>
                                        <span
                                            v-if="randomUserColours"
                                            class="shrink-0 text-xs font-normal"
                                            :class="user.$trustClass">
                                            {{ user.$trustLevel }}
                                        </span>
                                        <span
                                            v-else
                                            class="shrink-0 text-xs font-normal"
                                            :style="{ color: user.$userColour }">
                                            {{ user.$trustLevel }}
                                        </span>
                                        <span
                                            v-for="item in user.$languages"
                                            :key="item.key"
                                            class="flags shrink-0"
                                            :class="languageClass(item.key)"
                                            :title="item.value" />
                                    </ItemTitle>
                                    <ItemDescription v-if="user.bio" class="line-clamp-1 text-xs!">
                                        {{ user.bio }}
                                    </ItemDescription>
                                </ItemContent>
                            </Item>
                        </template>
                        <DataTableEmpty v-else class="search-view__empty bv-empty-state" type="nodata" />
                    </div>
                </div>
                <SearchPagination
                    :show="paginationConfig.show"
                    :prev-disabled="paginationConfig.prevDisabled"
                    :next-disabled="paginationConfig.nextDisabled"
                    @prev="paginationConfig.onPrev"
                    @next="paginationConfig.onNext" />
            </TabsContent>
            <TabsContent value="world" class="search-view__panel">
                <div class="search-view__panel-body">
                    <div class="search-view__filters">
                        <label class="inline-flex items-center gap-2">
                            <Checkbox v-model="searchWorldLabs" />
                            <span>{{ t('view.search.world.community_lab') }}</span>
                        </label>
                        <Select
                            :model-value="searchWorldCategoryIndex"
                            @update:modelValue="handleSearchWorldCategorySelect">
                            <SelectTrigger class="bv-focus-ring" size="sm">
                                <SelectValue :placeholder="t('view.search.world.category')" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem
                                        v-for="row in cachedConfig.dynamicWorldRows"
                                        :key="row.index"
                                        :value="row.index">
                                        {{ row.name }}
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="search-view__results bv-surface">
                        <div v-if="isSearchWorldLoading" class="search-view__loading" role="status" aria-live="polite">
                            <Spinner class="text-2xl" />
                            <span>{{ t('nav_tooltip.search') }}</span>
                        </div>
                        <template v-else-if="searchWorldResults.length > 0">
                            <ItemGroup
                                class="grid gap-3"
                                style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
                                <Item
                                    v-for="world in searchWorldResults"
                                    :key="world.id"
                                    variant="outline"
                                    size="sm"
                                    class="search-view__result-card bv-surface-raised"
                                    as-child>
                                    <div
                                        class="search-view__result-card-action bv-focus-ring"
                                        role="button"
                                        tabindex="0"
                                        @click="showWorldDialog(world.id)"
                                        @keydown.enter="showWorldDialog(world.id)"
                                        @keydown.space.prevent="showWorldDialog(world.id)">
                                        <ItemHeader>
                                            <img
                                                :src="world.thumbnailImageUrl"
                                                :alt="world.name"
                                                loading="lazy"
                                                class="aspect-[4/3] w-full rounded-lg object-cover" />
                                        </ItemHeader>
                                        <ItemContent class="min-w-0">
                                            <TooltipWrapper side="top" :content="world.name">
                                                <ItemTitle class="truncate w-auto">{{ world.name }}</ItemTitle>
                                            </TooltipWrapper>
                                            <ItemDescription v-if="world.occupants" class="line-clamp-1 text-xs">
                                                {{ world.authorName }} ({{ world.occupants }})
                                            </ItemDescription>
                                            <ItemDescription v-else class="line-clamp-1 text-xs">
                                                {{ world.authorName }}
                                            </ItemDescription>
                                        </ItemContent>
                                    </div>
                                </Item>
                            </ItemGroup>
                        </template>
                        <DataTableEmpty v-else class="search-view__empty bv-empty-state" type="nodata" />
                    </div>
                </div>
                <SearchPagination
                    :show="paginationConfig.show"
                    :prev-disabled="paginationConfig.prevDisabled"
                    :next-disabled="paginationConfig.nextDisabled"
                    @prev="paginationConfig.onPrev"
                    @next="paginationConfig.onNext" />
            </TabsContent>
            <TabsContent value="avatar" class="search-view__panel">
                <div class="search-view__panel-body">
                    <div class="search-view__filters">
                        <Select
                            v-if="avatarRemoteDatabaseProviderList.length > 0"
                            :model-value="avatarRemoteDatabaseProvider"
                            @update:modelValue="setAvatarProvider">
                            <SelectTrigger class="bv-focus-ring" size="sm">
                                <SelectValue :placeholder="t('view.search.avatar.search_provider')" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem
                                        v-for="provider in avatarRemoteDatabaseProviderList.filter(Boolean)"
                                        :key="provider"
                                        :value="provider">
                                        {{ provider }}
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <span v-else class="text-sm text-muted-foreground">
                            {{ t('view.search.avatar.no_provider') }}
                        </span>
                        <Button
                            class="bv-focus-ring"
                            size="sm"
                            variant="outline"
                            :aria-label="t('view.search.avatar.search_provider')"
                            @click="isAvatarProviderDialogVisible = true">
                            <Settings class="size-4" />
                        </Button>
                    </div>
                    <div class="search-view__results bv-surface">
                        <div v-if="isSearchAvatarLoading" class="search-view__loading" role="status" aria-live="polite">
                            <Spinner class="text-2xl" />
                            <span>{{ t('nav_tooltip.search') }}</span>
                        </div>
                        <template v-else-if="searchAvatarPage.length > 0">
                            <ItemGroup
                                class="grid gap-3"
                                style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
                                <Item
                                    v-for="avatar in searchAvatarPage"
                                    :key="avatar.id"
                                    variant="outline"
                                    size="sm"
                                    class="search-view__result-card bv-surface-raised"
                                    as-child>
                                    <div
                                        class="search-view__result-card-action bv-focus-ring"
                                        role="button"
                                        tabindex="0"
                                        @click="showAvatarDialog(avatar.id)"
                                        @keydown.enter="showAvatarDialog(avatar.id)"
                                        @keydown.space.prevent="showAvatarDialog(avatar.id)">
                                        <ItemHeader>
                                            <img
                                                v-if="avatar.thumbnailImageUrl"
                                                :src="avatar.thumbnailImageUrl"
                                                :alt="avatar.name"
                                                loading="lazy"
                                                class="aspect-[4/3] w-full rounded-lg object-cover" />
                                            <img
                                                v-else-if="avatar.imageUrl"
                                                :src="avatar.imageUrl"
                                                :alt="avatar.name"
                                                loading="lazy"
                                                class="aspect-[4/3] w-full rounded-lg object-cover" />
                                        </ItemHeader>
                                        <ItemContent class="min-w-0">
                                            <TooltipWrapper side="top" :content="avatar.name">
                                                <ItemTitle class="truncate w-auto">{{ avatar.name }}</ItemTitle>
                                            </TooltipWrapper>
                                            <ItemDescription class="line-clamp-1 text-xs">
                                                {{ avatar.authorName }}
                                            </ItemDescription>
                                        </ItemContent>
                                    </div>
                                </Item>
                            </ItemGroup>
                        </template>
                        <DataTableEmpty v-else class="search-view__empty bv-empty-state" type="nodata" />
                    </div>
                </div>
                <SearchPagination
                    :show="paginationConfig.show"
                    :prev-disabled="paginationConfig.prevDisabled"
                    :next-disabled="paginationConfig.nextDisabled"
                    @prev="paginationConfig.onPrev"
                    @next="paginationConfig.onNext" />
            </TabsContent>
            <TabsContent value="group" class="search-view__panel">
                <div class="search-view__results bv-surface">
                    <div v-if="isSearchGroupLoading" class="search-view__loading" role="status" aria-live="polite">
                        <Spinner class="text-2xl" />
                        <span>{{ t('nav_tooltip.search') }}</span>
                    </div>
                    <template v-else-if="searchGroupResults.length > 0">
                        <Item
                            v-for="group in searchGroupResults"
                            :key="group.id"
                            class="search-view__result-row bv-surface-raised bv-focus-ring"
                            role="button"
                            tabindex="0"
                            @click="showGroupDialog(group.id)"
                            @keydown.enter="showGroupDialog(group.id)"
                            @keydown.space.prevent="showGroupDialog(group.id)">
                            <ItemMedia variant="image">
                                <Avatar class="rounded-sm">
                                    <AvatarImage :src="getSmallThumbnailUrl(group.iconUrl)" loading="lazy" />
                                    <AvatarFallback>
                                        <Users class="size-5 text-muted-foreground" />
                                    </AvatarFallback>
                                </Avatar>
                            </ItemMedia>
                            <ItemContent class="min-w-0">
                                <ItemTitle class="truncate max-w-full">
                                    {{ group.name }}
                                    <span class="font-normal">({{ group.memberCount }})</span>
                                    <span class="text-muted-foreground font-mono text-xs font-normal">
                                        {{ group.shortCode }}.{{ group.discriminator }}
                                    </span>
                                </ItemTitle>
                                <ItemDescription class="truncate text-xs!">
                                    {{ group.description }}
                                </ItemDescription>
                            </ItemContent>
                        </Item>
                    </template>
                    <DataTableEmpty v-else class="search-view__empty bv-empty-state" type="nodata" />
                </div>
                <SearchPagination
                    :show="paginationConfig.show"
                    :prev-disabled="paginationConfig.prevDisabled"
                    :next-disabled="paginationConfig.nextDisabled"
                    @prev="paginationConfig.onPrev"
                    @next="paginationConfig.onNext" />
            </TabsContent>
        </Tabs>
        <AvatarProviderDialog v-model:isAvatarProviderDialogVisible="isAvatarProviderDialogVisible" />
    </div>
</template>

<script setup>
    import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Settings, Trash2, User, Users } from 'lucide-vue-next';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { DataTableEmpty } from '@/components/ui/data-table';
    import { Spinner } from '@/components/ui/spinner';
    import AvatarProviderDialog from '../Settings/dialogs/AvatarProviderDialog.vue';
    import SearchPagination from './components/SearchPagination.vue';
    import {
        Item,
        ItemContent,
        ItemDescription,
        ItemGroup,
        ItemHeader,
        ItemMedia,
        ItemTitle
    } from '@/components/ui/item';

    import { computed, onUnmounted, ref } from 'vue';
    import { useMagicKeys, whenever } from '@vueuse/core';
    import { toast } from 'vue-sonner';
    import { Button } from '@/components/ui/button';
    import { Checkbox } from '@/components/ui/checkbox';
    import { InputGroupField } from '@/components/ui/input-group';

    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useAppearanceSettingsStore, useAuthStore, useAvatarProviderStore, useSearchStore } from '../../stores';
    import { convertFileUrlToImageUrl, languageClass } from '../../shared/utils';
    import { useUserDisplay } from '../../composables/useUserDisplay';
    import { showAvatarDialog } from '../../coordinators/avatarCoordinator';
    import { showGroupDialog } from '../../coordinators/groupCoordinator';
    import { showUserDialog } from '../../coordinators/userCoordinator';
    import { showWorldDialog } from '../../coordinators/worldCoordinator';
    import { useSearchAvatar } from './composables/useSearchAvatar';
    import { useSearchWorld } from './composables/useSearchWorld';
    import { useSearchUser } from './composables/useSearchUser';
    import { useSearchGroup } from './composables/useSearchGroup';

    const { randomUserColours } = storeToRefs(useAppearanceSettingsStore());
    const { avatarRemoteDatabaseProviderList, avatarRemoteDatabaseProvider, isAvatarProviderDialogVisible } =
        storeToRefs(useAvatarProviderStore());
    const { setAvatarProvider } = useAvatarProviderStore();

    const { searchText, searchUserResults } = storeToRefs(useSearchStore());
    const { clearSearch } = useSearchStore();
    const { cachedConfig } = storeToRefs(useAuthStore());

    const { t } = useI18n();
    const { userImage } = useUserDisplay();

    const activeSearchTab = ref('user');

    // Keyboard shortcuts: Alt+Left (prev page) / Alt+Right (next page)
    const keys = useMagicKeys();
    const stopPrevWatch = whenever(keys['Alt+ArrowLeft'], () => {
        if (!paginationConfig.value.prevDisabled) {
            paginationConfig.value.onPrev();
        }
    });
    const stopNextWatch = whenever(keys['Alt+ArrowRight'], () => {
        if (!paginationConfig.value.nextDisabled) {
            paginationConfig.value.onNext();
        }
    });
    onUnmounted(() => {
        stopPrevWatch();
        stopNextWatch();
    });

    const searchPlaceholder = computed(() => {
        if (activeSearchTab.value === 'avatar') {
            return t('view.search.avatar.search_placeholder_avatar');
        }
        return t('view.search.search_placeholder');
    });

    const {
        searchUserParams,
        searchUserByBio,
        searchUserSortByLastLoggedIn,
        isSearchUserLoading,
        searchUser,
        handleMoreSearchUser,
        clearUserSearch
    } = useSearchUser();

    const {
        searchAvatarPageNum,
        searchAvatarResults,
        searchAvatarPage,
        isSearchAvatarLoading,
        searchAvatar,
        moreSearchAvatar,
        clearAvatarSearch
    } = useSearchAvatar();

    const {
        searchWorldLabs,
        searchWorldParams,
        searchWorldCategoryIndex,
        searchWorldResults,
        isSearchWorldLoading,
        searchWorld,
        moreSearchWorld,
        handleSearchWorldCategorySelect,
        clearWorldSearch
    } = useSearchWorld();

    const {
        searchGroupParams,
        searchGroupResults,
        isSearchGroupLoading,
        searchGroup,
        moreSearchGroup,
        clearGroupSearch
    } = useSearchGroup();

    const activeSearchLabel = computed(() => {
        const labels = {
            user: 'view.search.user.header',
            world: 'view.search.world.header',
            avatar: 'view.search.avatar.header',
            group: 'view.search.group.header'
        };
        return t(labels[activeSearchTab.value]);
    });

    const activeResultCount = computed(() => {
        switch (activeSearchTab.value) {
            case 'user':
                return searchUserResults.value.length;
            case 'world':
                return searchWorldResults.value.length;
            case 'avatar':
                return searchAvatarPage.value.length;
            case 'group':
                return searchGroupResults.value.length;
            default:
                return 0;
        }
    });

    const paginationConfig = computed(() => {
        switch (activeSearchTab.value) {
            case 'user':
                return {
                    show: searchUserResults.value.length > 0 && !isSearchUserLoading.value,
                    prevDisabled: !searchUserParams.value.offset,
                    nextDisabled: searchUserResults.value.length < 10,
                    onPrev: () => handleMoreSearchUser(-1),
                    onNext: () => handleMoreSearchUser(1)
                };
            case 'world':
                return {
                    show: searchWorldResults.value.length > 0 && !isSearchWorldLoading.value,
                    prevDisabled: !searchWorldParams.value.offset,
                    nextDisabled: searchWorldResults.value.length < 10,
                    onPrev: () => moreSearchWorld(-1),
                    onNext: () => moreSearchWorld(1)
                };
            case 'avatar':
                return {
                    show: searchAvatarPage.value.length > 0 && !isSearchAvatarLoading.value,
                    prevDisabled: !searchAvatarPageNum.value,
                    nextDisabled:
                        searchAvatarResults.value.length < 10 ||
                        (searchAvatarPageNum.value + 1) * 10 >= searchAvatarResults.value.length,
                    onPrev: () => moreSearchAvatar(-1),
                    onNext: () => moreSearchAvatar(1)
                };
            case 'group':
                return {
                    show: searchGroupResults.value.length > 0 && !isSearchGroupLoading.value,
                    prevDisabled: !searchGroupParams.value.offset,
                    nextDisabled: searchGroupResults.value.length < 10,
                    onPrev: () => moreSearchGroup(-1),
                    onNext: () => moreSearchGroup(1)
                };
            default:
                return { show: false, prevDisabled: true, nextDisabled: true, onPrev: () => {}, onNext: () => {} };
        }
    });

    function getSmallThumbnailUrl(url) {
        return convertFileUrlToImageUrl(url);
    }

    /**
     *
     */
    function handleClearSearch() {
        clearUserSearch();
        clearWorldSearch();
        clearAvatarSearch();
        clearGroupSearch();
        clearSearch();
    }

    /**
     *
     * @param text
     */
    function updateSearchText(text) {
        searchText.value = text;
    }

    /**
     *
     */
    function search() {
        if (activeSearchTab.value === 'avatar' && (!searchText.value || searchText.value.length < 3)) {
            toast.warning(t('view.search.avatar.min_chars_warning'));
            return;
        }
        switch (activeSearchTab.value) {
            case 'user':
                searchUser();
                break;
            case 'world':
                searchWorld({});
                break;
            case 'avatar':
                searchAvatar();
                break;
            case 'group':
                searchGroup();
                break;
        }
    }
</script>

<style scoped>
    .search-view {
        display: flex;
        min-height: 0;
        flex-direction: column;
        gap: 12px;
        overflow: hidden;
    }

    .search-view__page-header {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 14px 18px;
        border-radius: 14px;
    }

    .search-view__page-header h1 {
        margin: 2px 0 0;
        color: var(--bv-text-strong);
        font-size: 20px;
        font-weight: 750;
        line-height: 1.15;
    }

    .search-view__context {
        display: inline-flex;
        flex: none;
        align-items: center;
        gap: 8px;
        min-height: 32px;
        padding: 0 11px;
        border: 1px solid color-mix(in srgb, var(--bv-accent) 35%, var(--bv-border));
        border-radius: 8px;
        color: var(--bv-text-muted);
        background: color-mix(in srgb, var(--bv-accent) 8%, var(--bv-bg-control));
        font-size: 11px;
    }

    .search-view__result-count {
        min-width: 20px;
        color: var(--bv-text-strong);
        text-align: right;
    }

    .search-view__tabs {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: 10px;
    }

    .search-view__toolbar {
        display: flex;
        flex: none;
        align-items: center;
        gap: 18px;
        padding: 10px 12px;
        border-radius: 12px;
    }

    .search-view__tab-list {
        flex: none;
    }

    .search-view__query {
        display: flex;
        min-width: 220px;
        flex: 1;
        align-items: center;
    }

    .search-view__query > :first-child {
        flex: 1;
    }

    .search-view__panel {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
    }

    .search-view__panel-body {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: 8px;
    }

    .search-view__filters {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 10px;
        min-height: 34px;
        color: var(--bv-text-muted);
        font-size: 12px;
    }

    .search-view__results {
        min-height: 0;
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        border-radius: 12px;
    }

    .search-view__loading {
        display: flex;
        min-height: 180px;
        height: 100%;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 10px;
        color: var(--bv-text-muted);
        font-size: 11px;
    }

    .search-view__empty {
        min-height: 180px;
    }

    .search-view__result-row {
        margin-bottom: 6px;
        padding: 9px 11px;
        border: 1px solid var(--bv-border);
        border-radius: 9px;
        cursor: pointer;
        transition:
            border-color 140ms ease,
            background-color 140ms ease;
    }

    .search-view__result-row:hover {
        border-color: color-mix(in srgb, var(--bv-accent) 32%, var(--bv-border));
        background: var(--bv-bg-hover);
    }

    .search-view__result-card {
        overflow: hidden;
        padding: 0;
        border: 1px solid var(--bv-border);
        border-radius: 12px;
        cursor: pointer;
        transition:
            transform 150ms ease,
            border-color 150ms ease,
            box-shadow 150ms ease;
    }

    .search-view__result-card:hover {
        transform: translateY(-2px);
        border-color: color-mix(in srgb, var(--bv-accent) 38%, var(--bv-border));
        box-shadow: 0 10px 24px rgb(0 0 0 / 20%);
    }

    .search-view__result-card-action {
        height: 100%;
        overflow: hidden;
        padding: 10px;
        border-radius: inherit;
        outline: none;
    }

    @media (max-width: 860px) {
        .search-view__toolbar {
            align-items: stretch;
            flex-direction: column;
            gap: 10px;
        }

        .search-view__tab-list {
            width: 100%;
            overflow-x: auto;
        }

        .search-view__query {
            width: 100%;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .search-view__result-row,
        .search-view__result-card {
            transition-duration: 0.01ms;
        }

        .search-view__result-card:hover {
            transform: none;
        }
    }
</style>
