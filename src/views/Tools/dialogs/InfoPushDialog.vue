<template>
    <Dialog :open="isInfoPushDialogVisible" @update:open="(open) => !open && emit('close')">
        <DialogContent class="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>{{ t('announcements.title') }}</DialogTitle>
                <DialogDescription>{{ t('announcements.description') }}</DialogDescription>
            </DialogHeader>
            <div class="flex flex-wrap items-center gap-1">
                <Button
                    v-for="category in categories"
                    :key="category"
                    size="sm"
                    :variant="activeCategory === category ? 'secondary' : 'ghost'"
                    :aria-pressed="activeCategory === category"
                    @click="activeCategory = category">
                    {{ t(`announcements.categories.${category}`) }}
                </Button>
                <Button
                    class="ml-auto"
                    variant="outline"
                    size="icon-sm"
                    :disabled="isLoading"
                    :aria-label="t('announcements.refresh')"
                    @click="loadInfoPush">
                    <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
                </Button>
            </div>
            <p v-if="isLoading" role="status" class="text-sm text-muted-foreground">{{ t('announcements.loading') }}</p>
            <p v-else-if="loadFailed" role="alert" class="text-sm text-destructive">
                {{ t('announcements.load_failed') }}
            </p>
            <p v-else-if="!filteredItems.length" class="text-sm text-muted-foreground">
                {{ t('announcements.empty') }}
            </p>
            <div v-else ref="listRef" class="max-h-[60vh] space-y-3 overflow-y-auto">
                <details
                    v-for="item in filteredItems"
                    :key="item.id"
                    :data-id="item.id"
                    :open="expandedId === item.id"
                    class="border-b pb-3 last:border-0">
                    <summary class="cursor-pointer text-sm font-medium break-words">{{ item.name }}</summary>
                    <div class="mt-2 space-y-3 text-sm">
                        <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <time v-if="item.date" :datetime="item.date">{{
                                formatDateFilter(item.date, 'long')
                            }}</time>
                            <span v-if="item.endDate"
                                >{{ t('announcements.ends') }}: {{ formatDateFilter(item.endDate, 'long') }}</span
                            >
                        </div>
                        <img
                            v-if="item.imageUrl"
                            :src="item.imageUrl"
                            :alt="item.name"
                            loading="lazy"
                            class="max-h-64 w-full rounded object-contain" />
                        <p v-if="item.description" class="whitespace-pre-line break-words">{{ item.description }}</p>
                        <template v-for="(block, index) in item.blocks" :key="index">
                            <img
                                v-if="block.type === 'image'"
                                :src="block.value"
                                :alt="item.name"
                                loading="lazy"
                                class="max-h-96 w-full rounded object-contain" />
                            <Button
                                v-else-if="block.type === 'video'"
                                variant="outline"
                                size="sm"
                                @click="openExternalLink(block.value)"
                                >{{ t('announcements.open_video') }}</Button
                            >
                            <p v-else class="whitespace-pre-line break-words">{{ block.value }}</p>
                        </template>
                        <div v-if="item.links.length" class="flex flex-wrap gap-2">
                            <Button
                                v-for="link in item.links"
                                :key="`${link.command}:${link.target}`"
                                variant="outline"
                                size="sm"
                                :disabled="
                                    link.command === 'OpenHelpArticle' &&
                                    !items.some((entry) => entry.id === link.target)
                                "
                                @click="runLink(link)">
                                {{
                                    link.name ||
                                    (link.command === 'OpenHelpArticle'
                                        ? t('announcements.open_article')
                                        : t('announcements.open_link'))
                                }}
                            </Button>
                        </div>
                    </div>
                </details>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
    import { RefreshCw } from 'lucide-vue-next';
    import { useI18n } from 'vue-i18n';
    import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { formatDateFilter, openExternalLink } from '../../../shared/utils';
    import miscRequest from '../../../api/misc';
    import { useUserStore } from '../../../stores/user';
    import { watchState } from '../../../services/watchState';
    import { normalizeInfoPush } from './infoPushPresentation';

    const props = defineProps({ isInfoPushDialogVisible: { type: Boolean, default: false } });
    const emit = defineEmits(['close']);
    const { t } = useI18n();
    const userStore = useUserStore();
    const items = ref([]);
    const isLoading = ref(false);
    const loadFailed = ref(false);
    const activeCategory = ref('all');
    const expandedId = ref('');
    const listRef = ref(null);
    let generation = 0;
    const categories = computed(() => ['all', ...new Set(items.value.map((item) => item.category))]);
    const filteredItems = computed(() =>
        activeCategory.value === 'all'
            ? items.value
            : items.value.filter((item) => item.category === activeCategory.value)
    );

    async function loadInfoPush() {
        if (isLoading.value || !props.isInfoPushDialogVisible || !watchState.isLoggedIn || !userStore.currentUser.id)
            return;
        const requestGeneration = ++generation;
        isLoading.value = true;
        loadFailed.value = false;
        try {
            const { json } = await miscRequest.getInfoPush({
                require: 'user-all',
                include: ['help-article', 'quick-menu-banner', 'loading-screen-banners']
            });
            if (requestGeneration !== generation) return;
            if (!Array.isArray(json)) throw new Error('Invalid announcement response');
            items.value = normalizeInfoPush(json);
            activeCategory.value = 'all';
            expandedId.value = '';
        } catch {
            if (requestGeneration === generation) loadFailed.value = true;
        } finally {
            if (requestGeneration === generation) isLoading.value = false;
        }
    }

    watch(
        () => [props.isInfoPushDialogVisible, watchState.isLoggedIn, userStore.currentUser.id],
        () => {
            generation++;
            items.value = [];
            activeCategory.value = 'all';
            expandedId.value = '';
            isLoading.value = false;
            loadFailed.value = false;
            if (props.isInfoPushDialogVisible) loadInfoPush();
        },
        { immediate: true, flush: 'sync' }
    );
    onBeforeUnmount(() => {
        generation++;
    });

    async function runLink(link) {
        if (link.command === 'OpenURL') {
            openExternalLink(link.target);
        } else if (link.command === 'OpenHelpArticle' && items.value.some((item) => item.id === link.target)) {
            activeCategory.value = 'all';
            expandedId.value = link.target;
            await nextTick();
            [...(listRef.value?.querySelectorAll('details') ?? [])]
                .find((element) => element.dataset.id === link.target)
                ?.scrollIntoView({ block: 'nearest' });
        }
    }
</script>
