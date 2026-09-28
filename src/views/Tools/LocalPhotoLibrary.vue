<template>
    <div class="x-container flex h-full min-h-0 flex-col gap-3 overflow-auto p-4" data-testid="photo-library">
        <header class="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="ghost" @click="router.push({ name: 'tools' })">
                <ArrowLeft class="size-4" /> {{ t('nav_tooltip.tools') }}
            </Button>
            <div class="min-w-0 flex-1">
                <h1 class="text-xl font-semibold">{{ t('view.tools.photo_library.title') }}</h1>
                <p class="text-xs text-muted-foreground">{{ t('view.tools.photo_library.read_only') }}</p>
            </div>
            <Button size="sm" variant="outline" :disabled="loading" @click="loadPage(true, true)">
                <RefreshCw class="size-4" /> {{ t('view.tools.photo_library.refresh') }}
            </Button>
        </header>

        <form class="bv-surface flex flex-wrap items-end gap-2 rounded-lg p-3" @submit.prevent="loadPage(true)">
            <label class="min-w-52 flex-1 text-xs text-muted-foreground">
                {{ t('view.tools.photo_library.search') }}
                <InputGroupSearch
                    v-model="search"
                    class="mt-1"
                    :placeholder="t('view.tools.photo_library.search_hint')" />
            </label>
            <label class="text-xs text-muted-foreground">
                {{ t('view.tools.photo_library.from') }}
                <input
                    v-model="from"
                    type="date"
                    class="mt-1 block rounded border bg-background px-2 py-1.5 text-sm text-foreground"
                    @change="loadPage(true)" />
            </label>
            <label class="text-xs text-muted-foreground">
                {{ t('view.tools.photo_library.to') }}
                <input
                    v-model="to"
                    type="date"
                    class="mt-1 block rounded border bg-background px-2 py-1.5 text-sm text-foreground"
                    @change="loadPage(true)" />
            </label>
            <Button type="submit" size="sm" variant="outline">{{ t('nav_tooltip.search') }}</Button>
        </form>

        <div v-if="error" class="bv-surface rounded-lg p-4 text-destructive" role="alert">
            {{ t('view.tools.photo_library.error') }}: {{ error }}
        </div>
        <div v-if="loading && !items.length" class="bv-surface rounded-lg p-8 text-center" role="status">
            {{ t('view.tools.photo_library.loading') }}
        </div>
        <div v-else-if="!items.length && !hasMore && !error" class="bv-empty-state p-8" data-testid="photo-empty">
            {{ t('view.tools.photo_library.empty') }}
        </div>

        <div v-if="items.length" class="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
            <button
                v-for="photo in items"
                :key="photo.filePath"
                type="button"
                class="bv-surface overflow-hidden rounded-lg border text-left hover:border-primary focus-visible:outline focus-visible:outline-primary"
                data-testid="photo-card"
                @click="openDetail(photo)">
                <div class="aspect-square overflow-hidden">
                    <PhotoThumbnail :path="photo.filePath" :alt="photo.fileName" />
                </div>
                <div class="space-y-1 p-2">
                    <div class="truncate text-sm font-medium" :title="photo.fileName">{{ photo.fileName }}</div>
                    <div class="truncate text-xs text-muted-foreground">
                        {{ photo.world?.name || t('view.tools.photo_library.unknown_world') }}
                    </div>
                    <div class="text-xs text-muted-foreground">{{ formatTime(photo) }}</div>
                    <div v-if="photo.status !== 'metadata'" class="text-xs text-amber-500">
                        {{ statusText(photo.status) }}
                    </div>
                </div>
            </button>
        </div>
        <div v-if="hasMore || previousCursors.length" class="flex justify-center gap-2 pb-4">
            <Button v-if="previousCursors.length" size="sm" variant="outline" :disabled="loading" @click="previousPage">
                {{ t('view.tools.photo_library.previous') }}
            </Button>
            <Button v-if="hasMore" size="sm" variant="outline" :disabled="loading" @click="loadPage(false)">
                {{ loading ? t('view.tools.photo_library.loading') : t('view.tools.photo_library.load_more') }}
            </Button>
        </div>

        <div
            v-if="selected"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            :aria-label="t('view.tools.photo_library.detail')"
            @click.self="closeDetail">
            <div
                class="bv-surface flex max-h-[90vh] w-full max-w-5xl flex-col overflow-auto rounded-xl p-4 md:flex-row md:gap-4">
                <div class="flex min-h-56 flex-1 items-center justify-center bg-black/80">
                    <img
                        :src="selected.filePath"
                        :alt="selected.fileName"
                        class="max-h-[78vh] max-w-full object-contain" />
                </div>
                <aside class="w-full shrink-0 space-y-3 p-2 text-sm md:w-72">
                    <div class="flex items-start justify-between gap-2">
                        <h2 class="break-all font-semibold">{{ selected.fileName }}</h2>
                        <Button
                            size="sm"
                            variant="ghost"
                            :aria-label="t('view.tools.photo_library.close')"
                            @click="closeDetail"
                            >×</Button
                        >
                    </div>
                    <p class="break-all text-xs text-muted-foreground">{{ selected.filePath }}</p>
                    <div>
                        <strong>{{ t('view.tools.photo_library.time') }}</strong
                        ><br />{{ formatTime(selected) }}<br />
                        <span class="text-xs text-muted-foreground">{{ timeSourceText(selected.timeSource) }}</span>
                    </div>
                    <div>
                        <strong>{{ t('view.tools.photo_library.world') }}</strong
                        ><br />
                        <button
                            v-if="selected.world?.id"
                            class="text-primary hover:underline"
                            @click="showWorldDialog(selected.world.id)">
                            {{ selected.world.name || selected.world.id }}
                        </button>
                        <span v-else>{{ selected.world?.name || t('view.tools.photo_library.unknown_world') }}</span>
                        <p v-if="selected.world?.instanceId" class="break-all text-xs text-muted-foreground">
                            {{ selected.world.instanceId }}
                        </p>
                    </div>
                    <div>
                        <strong>{{ t('view.tools.photo_library.recorded_players') }}</strong>
                        <p v-if="!selected.players?.length" class="text-muted-foreground">
                            {{ t('view.tools.photo_library.unknown') }}
                        </p>
                        <div v-for="player in selected.players" :key="player.id || player.displayName">
                            <button
                                v-if="player.id"
                                class="text-primary hover:underline"
                                @click="showUserDialog(player.id)">
                                {{ player.displayName || player.id }}
                            </button>
                            <span v-else>{{ player.displayName }}</span>
                        </div>
                    </div>
                    <div v-if="history?.players?.length">
                        <strong>{{ t('view.tools.photo_library.history_players') }}</strong>
                        <div v-for="player in history.players" :key="player.userId || player.displayName">
                            <button
                                v-if="player.userId"
                                class="text-primary hover:underline"
                                @click="showUserDialog(player.userId)">
                                {{ player.displayName }}
                            </button>
                            <span v-else>{{ player.displayName }}</span>
                        </div>
                    </div>
                    <p v-if="selected.status !== 'metadata'" class="text-amber-500">
                        {{ statusText(selected.status) }}
                    </p>
                    <p class="text-xs text-muted-foreground">{{ t('view.tools.photo_library.player_note') }}</p>
                    <Button size="sm" variant="outline" @click="openPhotoFolder">
                        <FolderOpen class="size-4" /> {{ t('dialog.screenshot_metadata.open_folder') }}
                    </Button>
                </aside>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { onMounted, onUnmounted, ref, watch } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { useRouter } from 'vue-router';
    import { ArrowLeft, FolderOpen, RefreshCw } from 'lucide-vue-next';
    import { Button } from '@/components/ui/button';
    import { InputGroupSearch } from '@/components/ui/input-group';
    import { showUserDialog } from '@/coordinators/userCoordinator';
    import { showWorldDialog } from '@/coordinators/worldCoordinator';
    import { database } from '@/services/database';
    import { useUserStore } from '@/stores';
    import PhotoThumbnail from './PhotoThumbnail.vue';

    const { t } = useI18n();
    const router = useRouter();
    const userStore = useUserStore();
    const search = ref('');
    const from = ref('');
    const to = ref('');
    const items = ref([]);
    const hasMore = ref(true);
    const startCursor = ref({ nextTime: '0', nextPath: '' });
    const nextCursor = ref({ nextTime: '0', nextPath: '' });
    const previousCursors = ref([]);
    const activeFilters = ref({ search: '', from: '', to: '' });
    const loading = ref(false);
    const error = ref('');
    const selected = ref(null);
    const history = ref(null);
    let requestId = 0;
    let detailId = 0;

    function dateBoundary(value, end = false) {
        if (!value) return '';
        const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`);
        return Number.isNaN(date.getTime()) ? '' : date.toISOString();
    }

    async function loadPage(reset = false, refresh = false, previous = null) {
        if (loading.value && !reset) return;
        const id = ++requestId;
        const requestCursor = reset ? { nextTime: '0', nextPath: '' } : previous || nextCursor.value;
        if (reset) {
            items.value = [];
            hasMore.value = true;
            startCursor.value = requestCursor;
            nextCursor.value = requestCursor;
            previousCursors.value = [];
            activeFilters.value = {
                search: search.value.trim(),
                from: dateBoundary(from.value),
                to: dateBoundary(to.value, true)
            };
            closeDetail();
        }
        loading.value = true;
        error.value = '';
        try {
            const filters = activeFilters.value;
            const json = await AppApi.GetLocalPhotoPage(
                filters.search,
                filters.from,
                filters.to,
                requestCursor.nextTime,
                requestCursor.nextPath,
                30,
                refresh
            );
            if (id !== requestId) return;
            const page = JSON.parse(json);
            if (!reset && !previous) previousCursors.value = [...previousCursors.value, startCursor.value];
            if (!reset) closeDetail();
            items.value = page.items;
            startCursor.value = requestCursor;
            nextCursor.value = { nextTime: page.nextTime, nextPath: page.nextPath };
            hasMore.value = Boolean(page.hasMore);
        } catch (cause) {
            if (id === requestId) error.value = cause?.message || String(cause);
        } finally {
            if (id === requestId) loading.value = false;
        }
    }

    async function previousPage() {
        if (loading.value || !previousCursors.value.length) return;
        const previous = previousCursors.value.at(-1);
        previousCursors.value = previousCursors.value.slice(0, -1);
        await loadPage(false, false, previous);
    }

    function formatTime(photo) {
        const value = photo.timestamp || photo.fileModifiedUtc;
        if (!value) return t('view.tools.photo_library.unknown');
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? t('view.tools.photo_library.unknown') : date.toLocaleString();
    }

    function statusText(status) {
        return t(`view.tools.photo_library.status_${status}`);
    }
    function timeSourceText(source) {
        return t(`view.tools.photo_library.time_${source}`);
    }

    async function openDetail(photo) {
        selected.value = photo;
        history.value = null;
        const id = ++detailId;
        if (
            !photo.historyTimeUtc ||
            !photo.world?.id ||
            !photo.world?.instanceId ||
            !photo.author?.id ||
            photo.author.id !== userStore.currentUser?.id
        )
            return;
        try {
            const result = await database.getPhotoHistoryContext(
                photo.world.id,
                photo.world.instanceId,
                photo.historyTimeUtc
            );
            if (id === detailId) history.value = result;
        } catch {
            if (id === detailId) history.value = null;
        }
    }

    function closeDetail() {
        detailId++;
        selected.value = null;
        history.value = null;
    }

    function openPhotoFolder() {
        if (selected.value?.filePath) AppApi.OpenFolderAndSelectItem(selected.value.filePath);
    }

    watch(
        () => userStore.currentUser?.id,
        () => {
            detailId++;
            history.value = null;
        }
    );

    onMounted(() => loadPage(true));
    onUnmounted(() => {
        requestId++;
        closeDetail();
    });
</script>
