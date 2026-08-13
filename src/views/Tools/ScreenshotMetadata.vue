<template>
    <div class="screenshot-metadata-page x-container">
        <header class="screenshot-metadata__header">
            <Button variant="ghost" size="sm" class="screenshot-metadata__back" @click="goBack">
                <ArrowLeft />
                {{ t('nav_tooltip.tools') }}
            </Button>
            <h1>{{ t('dialog.screenshot_metadata.header') }}</h1>
        </header>

        <div class="screenshot-metadata__toolbar bv-surface">
            <Button size="sm" variant="outline" @click="getAndDisplayScreenshotFromFile">
                <FolderSearch />
                {{ t('dialog.screenshot_metadata.browse') }}
            </Button>
            <Button size="sm" variant="outline" @click="getAndDisplayLastScreenshot">
                <ImageIcon />
                {{ t('dialog.screenshot_metadata.last_screenshot') }}
            </Button>
            <Button
                v-if="screenshotMetadataDialog.metadata.filePath"
                size="sm"
                variant="outline"
                @click="openImageFolder(screenshotMetadataDialog.metadata.filePath)">
                <FolderOpen />
                {{ t('dialog.screenshot_metadata.open_folder') }}
            </Button>
            <div class="flex-1" />
            <InputGroupSearch
                v-model="screenshotMetadataDialog.search"
                class="screenshot-metadata__search"
                :placeholder="t('dialog.screenshot_metadata.search_placeholder')"
                @input="screenshotMetadataSearch" />
            <Select :model-value="screenshotMetadataDialog.searchType" @update:modelValue="handleSearchTypeChange">
                <SelectTrigger size="sm" style="width: 150px">
                    <SelectValue :placeholder="t('dialog.screenshot_metadata.search_type_placeholder')" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectItem v-for="type in screenshotMetadataDialog.searchTypes" :key="type" :value="type">
                            {{ t(screenshotMetadataSearchTypeLabels[type] ?? type) }}
                        </SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
            <span v-if="searchViewMode === 'table' && searchResultsData.length" class="whitespace-pre-wrap text-xs">{{
                t('dialog.screenshot_metadata.result_count', { count: searchResultsData.length })
            }}</span>
            <span v-else-if="screenshotMetadataDialog.searchIndex !== null" class="whitespace-pre-wrap text-xs">{{
                screenshotMetadataDialog.searchIndex + 1 + '/' + screenshotMetadataDialog.searchResults.length
            }}</span>
        </div>

        <!-- Search Results Table View -->
        <div v-if="searchViewMode === 'table'" class="screenshot-metadata__results bv-surface">
            <table class="w-full border-collapse text-[13px]">
                <thead class="screenshot-metadata__table-head">
                    <tr>
                        <th
                            class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground text-left px-3 py-2 border-b whitespace-nowrap select-none cursor-pointer hover:text-foreground"
                            @click="toggleSearchSort('dateTime')">
                            {{ t('dialog.screenshot_metadata.col_date') }}
                            <span v-if="searchSort.key === 'dateTime'" class="ml-1 text-[10px]">{{
                                searchSort.asc ? '↑' : '↓'
                            }}</span>
                        </th>
                        <th
                            class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground text-left px-3 py-2 border-b whitespace-nowrap select-none cursor-pointer hover:text-foreground"
                            @click="toggleSearchSort('world')">
                            {{ t('dialog.screenshot_metadata.col_world') }}
                            <span v-if="searchSort.key === 'world'" class="ml-1 text-[10px]">{{
                                searchSort.asc ? '↑' : '↓'
                            }}</span>
                        </th>
                        <th
                            v-if="searchHasMatchColumn"
                            class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground text-left px-3 py-2 border-b whitespace-nowrap select-none cursor-pointer hover:text-foreground"
                            @click="toggleSearchSort('match')">
                            {{ t('dialog.screenshot_metadata.col_match') }}
                            <span v-if="searchSort.key === 'match'" class="ml-1 text-[10px]">{{
                                searchSort.asc ? '↑' : '↓'
                            }}</span>
                        </th>
                        <th
                            class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground text-left px-3 py-2 border-b whitespace-nowrap select-none cursor-pointer hover:text-foreground"
                            @click="toggleSearchSort('author')">
                            {{ t('dialog.screenshot_metadata.col_author') }}
                            <span v-if="searchSort.key === 'author'" class="ml-1 text-[10px]">{{
                                searchSort.asc ? '↑' : '↓'
                            }}</span>
                        </th>
                        <th
                            class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground text-left px-3 py-2 border-b whitespace-nowrap select-none cursor-pointer hover:text-foreground w-20"
                            @click="toggleSearchSort('players')">
                            {{ t('dialog.screenshot_metadata.col_players') }}
                            <span v-if="searchSort.key === 'players'" class="ml-1 text-[10px]">{{
                                searchSort.asc ? '↑' : '↓'
                            }}</span>
                        </th>
                        <th
                            class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground text-left px-3 py-2 border-b whitespace-nowrap select-none w-[100px]">
                            {{ t('dialog.screenshot_metadata.col_resolution') }}
                        </th>
                        <th class="w-8 border-b"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="(row, idx) in sortedSearchResults"
                        :key="row.filePath"
                        data-testid="screenshot-result"
                        class="screenshot-metadata__result-row group/row"
                        :class="
                            row.filePath === selectedSearchFilePath ? 'bg-accent border-l-[3px] border-l-primary' : ''
                        "
                        @click="selectSearchResult(idx)">
                        <td
                            class="text-sm px-3 py-2 border-b whitespace-nowrap overflow-hidden text-ellipsis"
                            :class="row.filePath === selectedSearchFilePath ? 'pl-[9px]' : ''">
                            {{ row.dateFormatted }}
                        </td>
                        <td class="text-sm px-3 py-2 border-b whitespace-nowrap overflow-hidden text-ellipsis">
                            {{ row.world || '—' }}
                        </td>
                        <td
                            v-if="searchHasMatchColumn"
                            class="text-sm px-3 py-2 border-b whitespace-nowrap overflow-hidden text-ellipsis text-primary">
                            {{ row.match || '—' }}
                        </td>
                        <td
                            class="text-sm px-3 py-2 border-b whitespace-nowrap overflow-hidden text-ellipsis text-muted-foreground">
                            {{ row.author || '—' }}
                        </td>
                        <td class="text-sm px-3 py-2 border-b whitespace-nowrap overflow-hidden text-ellipsis">
                            <span class="inline-flex items-center gap-1">
                                <Users class="size-3 text-muted-foreground" />
                                {{ row.playerCount }}
                            </span>
                        </td>
                        <td
                            class="text-xs text-muted-foreground px-3 py-2 border-b whitespace-nowrap overflow-hidden text-ellipsis">
                            {{ row.resolution }}
                        </td>
                        <td class="py-2 pr-2 border-b">
                            <ChevronRight
                                class="size-4 text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-opacity duration-150" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Detail View -->
        <div v-else class="screenshot-metadata__workspace">
            <section
                class="screenshot-metadata__preview bv-surface"
                @dragover.prevent
                @dragenter.prevent
                @drop="handleDrop">
                <div class="screenshot-metadata__stage">
                    <template v-if="screenshotMetadataDialog.metadata.filePath">
                        <img
                            class="screenshot-metadata__image"
                            :src="screenshotMetadataDialog.metadata.filePath"
                            :alt="screenshotMetadataDialog.metadata.fileName || t('dialog.screenshot_metadata.header')"
                            @click="showFullscreenImageDialog(screenshotMetadataDialog.metadata.filePath)" />
                        <Button
                            variant="ghost"
                            size="icon"
                            class="screenshot-metadata__stage-nav screenshot-metadata__stage-nav--previous"
                            @click="navigatePrev">
                            <ChevronLeft />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="screenshot-metadata__stage-nav screenshot-metadata__stage-nav--next"
                            @click="navigateNext">
                            <ChevronRight />
                        </Button>
                    </template>
                    <div v-else class="screenshot-metadata__drop-state">
                        <ImageIcon class="size-7" />
                        <span>{{ t('dialog.screenshot_metadata.drag') }}</span>
                    </div>
                </div>
                <div class="screenshot-metadata__navigation">
                    <ButtonGroup>
                        <Button variant="outline" size="sm" @click="navigatePrev">
                            <ArrowLeft />
                            <Kbd class="ml-1">{{ isMac ? '⌥' : 'Alt' }}</Kbd>
                            <Kbd>←</Kbd>
                        </Button>
                        <Button variant="outline" size="sm" @click="navigateNext">
                            <Kbd class="ml-1">{{ isMac ? '⌥' : 'Alt' }}</Kbd>
                            <Kbd>→</Kbd>
                            <ArrowRight />
                        </Button>
                    </ButtonGroup>
                </div>
            </section>

            <aside class="screenshot-metadata__inspector bv-surface">
                <Button
                    v-if="searchResultsData.length"
                    variant="ghost"
                    size="sm"
                    class="mb-2"
                    @click="searchViewMode = 'table'">
                    <ArrowLeft class="size-3.5" />
                    {{ t('dialog.screenshot_metadata.back_to_results', { count: searchResultsData.length }) }}
                </Button>
                <template v-if="screenshotMetadataDialog.metadata.error">
                    <pre class="whitespace-pre-wrap text-xs" v-text="screenshotMetadataDialog.metadata.error"></pre>
                </template>
                <template v-else>
                    <section
                        v-if="screenshotMetadataDialog.metadata.world || screenshotMetadataDialog.metadata.author"
                        class="screenshot-metadata__section">
                        <h4 class="text-[11px] font-medium uppercase tracking-[0.08em] mb-1.5 text-muted-foreground">
                            {{ t('dialog.screenshot_metadata.section_location') }}
                        </h4>
                        <Location
                            v-if="screenshotMetadataDialog.metadata.world"
                            :location="screenshotMetadataDialog.metadata.world.instanceId"
                            :hint="screenshotMetadataDialog.metadata.world.name" />
                        <div
                            v-if="screenshotMetadataDialog.metadata.author"
                            class="flex items-center gap-1 text-muted-foreground">
                            <Camera class="size-3.5 shrink-0" />
                            <DisplayName
                                :userid="screenshotMetadataDialog.metadata.author.id"
                                :hint="screenshotMetadataDialog.metadata.author.displayName" />
                        </div>
                    </section>

                    <section
                        v-if="screenshotMetadataDialog.metadata.players?.length"
                        class="screenshot-metadata__section">
                        <h4 class="text-[11px] font-medium uppercase tracking-[0.08em] mb-1.5 text-muted-foreground">
                            {{ t('dialog.screenshot_metadata.section_players') }} ({{
                                screenshotMetadataDialog.metadata.players.length
                            }})
                        </h4>
                        <div class="flex flex-wrap gap-1 max-h-[180px] overflow-y-auto">
                            <Badge
                                v-for="user in screenshotMetadataDialog.metadata.players"
                                :key="user.id"
                                variant="secondary"
                                class="cursor-pointer hover:bg-accent transition-colors"
                                @click="lookupUser(user)">
                                {{ user.displayName }}
                            </Badge>
                        </div>
                    </section>

                    <section class="screenshot-metadata__section">
                        <h4 class="text-[11px] font-medium uppercase tracking-[0.08em] mb-1.5 text-muted-foreground">
                            {{ t('dialog.screenshot_metadata.section_file_info') }}
                        </h4>
                        <span v-if="screenshotMetadataDialog.metadata.dateTime" class="text-sm">{{
                            formatDateFilter(screenshotMetadataDialog.metadata.dateTime, 'long')
                        }}</span>
                        <br />
                        <span class="text-xs text-muted-foreground">
                            <span
                                v-if="screenshotMetadataDialog.metadata.fileResolution"
                                v-text="screenshotMetadataDialog.metadata.fileResolution"></span>
                            <span
                                v-if="
                                    screenshotMetadataDialog.metadata.fileResolution &&
                                    screenshotMetadataDialog.metadata.fileSize
                                ">
                                ·
                            </span>
                            <span v-if="screenshotMetadataDialog.metadata.fileSize">{{
                                screenshotMetadataDialog.metadata.fileSize
                            }}</span>
                        </span>
                        <br />
                        <span
                            class="text-xs text-muted-foreground/60"
                            v-text="screenshotMetadataDialog.metadata.fileName"></span>
                    </section>

                    <section v-if="screenshotMetadataDialog.metadata.note" class="screenshot-metadata__section">
                        <h4 class="text-[11px] font-medium uppercase tracking-[0.08em] mb-1.5 text-muted-foreground">
                            {{ t('dialog.screenshot_metadata.section_note') }}
                        </h4>
                        <span
                            class="text-sm text-muted-foreground"
                            v-text="screenshotMetadataDialog.metadata.note"></span>
                    </section>

                    <section
                        v-if="screenshotMetadataDialog.metadata.filePath"
                        class="screenshot-metadata__section screenshot-metadata__section--actions">
                        <h4 class="text-[11px] font-medium uppercase tracking-[0.08em] mb-1.5 text-muted-foreground">
                            {{ t('dialog.screenshot_metadata.section_actions') }}
                        </h4>
                        <div class="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                @click="copyImageToClipboard(screenshotMetadataDialog.metadata.filePath)">
                                <Copy />
                                {{ t('dialog.screenshot_metadata.copy_image') }}
                            </Button>
                            <Button
                                v-if="isLocalUserVrcPlusSupporter && screenshotMetadataDialog.metadata.filePath"
                                size="sm"
                                variant="outline"
                                @click="uploadScreenshotToGallery">
                                <Upload />
                                {{ t('dialog.screenshot_metadata.upload') }}
                            </Button>
                            <Button
                                v-if="screenshotMetadataDialog.metadata.filePath"
                                size="sm"
                                variant="destructive"
                                @click="deleteMetadata(screenshotMetadataDialog.metadata.filePath)">
                                <Trash2 />
                                {{ t('dialog.screenshot_metadata.delete_metadata') }}
                            </Button>
                        </div>
                    </section>
                </template>
            </aside>
        </div>
    </div>
</template>

<script setup>
    import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { useMagicKeys, whenever } from '@vueuse/core';
    import { onMounted, onUnmounted, reactive, ref, computed } from 'vue';
    import { useGalleryStore, useUserStore, useVrcxStore } from '@/stores';
    import {
        ArrowLeft,
        ArrowRight,
        Camera,
        ChevronLeft,
        ChevronRight,
        Copy,
        FolderOpen,
        FolderSearch,
        ImageIcon,
        Trash2,
        Upload,
        Users
    } from 'lucide-vue-next';
    import { Badge } from '@/components/ui/badge';
    import { Button } from '@/components/ui/button';
    import { ButtonGroup } from '@/components/ui/button-group';
    import { InputGroupSearch } from '@/components/ui/input-group';
    import { Kbd } from '@/components/ui/kbd';

    import { formatDateFilter } from '@/shared/utils';
    import { storeToRefs } from 'pinia';
    import { toast } from 'vue-sonner';
    import { useI18n } from 'vue-i18n';
    import { useRouter } from 'vue-router';
    import { vrcPlusImageRequest } from '@/api';
    import { lookupUser } from '@/coordinators/userCoordinator';

    const router = useRouter();
    const { t } = useI18n();

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const { showFullscreenImageDialog, handleGalleryImageAdd } = useGalleryStore();
    const { currentlyDroppingFile } = storeToRefs(useVrcxStore());
    const { isLocalUserVrcPlusSupporter } = storeToRefs(useUserStore());
    const { fullscreenImageDialog } = storeToRefs(useGalleryStore());

    const screenshotMetadataDialog = reactive({
        loading: false,
        search: '',
        searchType: 'Player Name',
        searchTypes: ['Player Name', 'Player ID', 'World Name', 'World ID'],
        searchIndex: null,
        searchResults: null,
        metadata: {},
        isUploading: false
    });

    const screenshotMetadataSearchTypeLabels = {
        'Player Name': 'dialog.screenshot_metadata.search_types.player_name',
        'Player ID': 'dialog.screenshot_metadata.search_types.player_id',
        'World Name': 'dialog.screenshot_metadata.search_types.world_name',
        'World ID': 'dialog.screenshot_metadata.search_types.world_id'
    };

    const searchViewMode = ref('detail');
    const searchResultsData = ref([]);
    const selectedSearchFilePath = ref(null);
    const searchSort = reactive({ key: 'dateTime', asc: false });

    const searchHasMatchColumn = computed(() => {
        const type = screenshotMetadataDialog.searchType;
        return type === 'Player Name' || type === 'Player ID';
    });

    const sortedSearchResults = computed(() => {
        const data = [...searchResultsData.value];
        const { key, asc } = searchSort;
        data.sort((a, b) => {
            let va = a[key];
            let vb = b[key];
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return asc ? -1 : 1;
            if (va > vb) return asc ? 1 : -1;
            return 0;
        });
        return data;
    });

    function toggleSearchSort(key) {
        if (searchSort.key === key) {
            searchSort.asc = !searchSort.asc;
        } else {
            searchSort.key = key;
            searchSort.asc = key === 'dateTime' ? false : true;
        }
    }

    function selectSearchResult(idx) {
        const row = sortedSearchResults.value[idx];
        if (!row) return;
        screenshotMetadataDialog.searchIndex = idx;
        selectedSearchFilePath.value = row.filePath;
        searchViewMode.value = 'detail';
        getAndDisplayScreenshot(row.filePath, false);
    }

    async function loadSearchResultsMetadata(filePaths, query, searchType) {
        const results = [];
        const lowerQuery = String(query).toLowerCase();
        const promises = filePaths.map(async (filePath) => {
            try {
                const metaJson = await AppApi.GetScreenshotMetadata(filePath);
                const meta = JSON.parse(metaJson);
                const extraJson = await AppApi.GetExtraScreenshotData(filePath, false);
                const extra = JSON.parse(extraJson);

                let dateTime = 0;
                let dateFormatted = '—';
                if (meta.timestamp) {
                    dateTime = Date.parse(meta.timestamp);
                } else if (extra.creationDate) {
                    dateTime = Date.parse(extra.creationDate);
                }
                if (dateTime) {
                    dateFormatted = formatDateFilter(dateTime, 'short');
                }

                let match = '';
                if (searchType === 0) {
                    const matched =
                        meta.players?.filter((p) => p.displayName?.toLowerCase().includes(lowerQuery)) || [];
                    match = matched.map((p) => p.displayName).join(', ');
                } else if (searchType === 1) {
                    const matched = meta.players?.find((p) => p.id === query);
                    match = matched?.displayName || '';
                }

                results.push({
                    filePath,
                    dateTime,
                    dateFormatted,
                    world: meta.world?.name || '',
                    playerCount: meta.players?.length || 0,
                    players: meta.players?.length || 0,
                    resolution: extra.fileResolution || '',
                    match,
                    author: meta.author?.displayName || ''
                });
            } catch (e) {
                console.error('Error loading metadata for', filePath, e);
            }
        });
        await Promise.all(promises);
        return results;
    }

    const screenshotMetadataSearchInputs = ref(0);

    onMounted(() => {
        if (!screenshotMetadataDialog.metadata.filePath) {
            getAndDisplayLastScreenshot();
        }
    });

    // Keyboard shortcuts: Alt+Left (prev) / Alt+Right (next)
    const keys = useMagicKeys();
    const stopPrevWatch = whenever(keys['Alt+ArrowLeft'], () => {
        navigatePrev();
    });
    const stopNextWatch = whenever(keys['Alt+ArrowRight'], () => {
        navigateNext();
    });
    onUnmounted(() => {
        stopPrevWatch();
        stopNextWatch();
    });

    /**
     *
     */
    function navigatePrev() {
        const D = screenshotMetadataDialog;

        if (D.searchIndex !== null) {
            const filesArr = D.searchResults;
            let searchIndex = D.searchIndex;
            if (searchIndex > 0) {
                getAndDisplayScreenshot(filesArr[searchIndex - 1], false);
                searchIndex--;
            } else {
                getAndDisplayScreenshot(filesArr[filesArr.length - 1], false);
                searchIndex = filesArr.length - 1;
            }
            D.searchIndex = searchIndex;
            return;
        }

        if (D.metadata.previousFilePath) {
            getAndDisplayScreenshot(D.metadata.previousFilePath);
        }

        if (fullscreenImageDialog.value.visible) {
            // TODO
        }
    }

    /**
     *
     */
    function navigateNext() {
        const D = screenshotMetadataDialog;

        if (D.searchIndex !== null) {
            const filesArr = D.searchResults;
            let searchIndex = D.searchIndex;
            if (searchIndex < filesArr.length - 1) {
                getAndDisplayScreenshot(filesArr[searchIndex + 1], false);
                searchIndex++;
            } else {
                getAndDisplayScreenshot(filesArr[0], false);
                searchIndex = 0;
            }
            D.searchIndex = searchIndex;
            return;
        }

        if (D.metadata.nextFilePath) {
            getAndDisplayScreenshot(D.metadata.nextFilePath);
        }

        if (fullscreenImageDialog.value.visible) {
            // TODO
        }
    }

    /**
     *
     */
    function goBack() {
        router.push({ name: 'tools' });
    }

    /**
     *
     * @param event
     */
    function handleDrop(event) {
        if (currentlyDroppingFile.value === null) {
            return;
        }
        console.log('Dropped file into viewer: ', currentlyDroppingFile.value);

        screenshotMetadataResetSearch();
        getAndDisplayScreenshot(currentlyDroppingFile.value);

        event.preventDefault();
    }

    /**
     *
     */
    async function getAndDisplayScreenshotFromFile() {
        let filePath = '';

        if (LINUX) {
            filePath = await window.electron.openFileDialog();
        } else {
            filePath = await AppApi.OpenFileSelectorDialog(
                await AppApi.GetVRChatPhotosLocation(),
                '.png',
                'PNG Files (*.png)|*.png'
            );
        }

        if (filePath === '') {
            return;
        }

        screenshotMetadataResetSearch();
        getAndDisplayScreenshot(filePath);
    }

    /**
     *
     */
    function getAndDisplayLastScreenshot() {
        screenshotMetadataResetSearch();
        AppApi.GetLastScreenshot().then((path) => {
            if (!path) {
                return;
            }
            getAndDisplayScreenshot(path);
        });
    }

    /**
     *
     * @param path
     */
    function copyImageToClipboard(path) {
        if (!path) {
            return;
        }
        AppApi.CopyImageToClipboard(path).then(() => {
            toast.success('Image copied to clipboard');
        });
    }
    /**
     *
     * @param path
     */
    function openImageFolder(path) {
        if (!path) {
            return;
        }
        AppApi.OpenFolderAndSelectItem(path).then(() => {
            toast.success('Opened image folder');
        });
    }
    /**
     *
     * @param path
     */
    function deleteMetadata(path) {
        if (!path) {
            return;
        }
        AppApi.DeleteScreenshotMetadata(path).then((result) => {
            if (!result) {
                toast.error(t('message.screenshot_metadata.delete_failed'));
                return;
            }
            toast.success(t('message.screenshot_metadata.deleted'));
            const D = screenshotMetadataDialog;
            getAndDisplayScreenshot(D.metadata.filePath, true);
        });
    }
    /**
     *
     */
    function uploadScreenshotToGallery() {
        const D = screenshotMetadataDialog;
        if (D.metadata.fileSizeBytes > 10000000) {
            toast.error(t('message.file.too_large'));
            return;
        }
        D.isUploading = true;
        AppApi.GetFileBase64(D.metadata.filePath)
            .then((base64Body) => {
                vrcPlusImageRequest
                    .uploadGalleryImage(base64Body)
                    .then((args) => {
                        handleGalleryImageAdd(args);
                        toast.success(t('message.gallery.uploaded'));
                        return args;
                    })
                    .finally(() => {
                        D.isUploading = false;
                    });
            })
            .catch((err) => {
                toast.error(t('message.gallery.failed'));
                console.error(err);
                D.isUploading = false;
            });
    }
    /**
     *
     */
    function screenshotMetadataSearch() {
        const D = screenshotMetadataDialog;

        screenshotMetadataSearchInputs.value++;
        let current = screenshotMetadataSearchInputs.value;
        setTimeout(() => {
            if (current !== screenshotMetadataSearchInputs.value) {
                return;
            }
            screenshotMetadataSearchInputs.value = 0;

            if (D.search === '') {
                screenshotMetadataResetSearch();
                if (D.metadata.filePath !== null) {
                    getAndDisplayScreenshot(D.metadata.filePath, true);
                }
                return;
            }

            const searchType = D.searchTypes.indexOf(D.searchType);
            D.loading = true;
            AppApi.FindScreenshotsBySearch(D.search, searchType)
                .then(async (json) => {
                    const results = JSON.parse(json);

                    if (results.length === 0) {
                        D.metadata = {};
                        D.metadata.error = t('dialog.screenshot_metadata.no_results');

                        D.searchIndex = null;
                        D.searchResults = null;
                        searchResultsData.value = [];
                        searchViewMode.value = 'detail';
                        return;
                    }

                    D.searchIndex = 0;
                    D.searchResults = results;

                    const enriched = await loadSearchResultsMetadata(results, D.search, searchType);
                    searchResultsData.value = enriched;
                    searchViewMode.value = 'table';
                })
                .finally(() => {
                    D.loading = false;
                });
        }, 500);
    }

    /**
     *
     * @param value
     */
    function handleSearchTypeChange(value) {
        screenshotMetadataDialog.searchType = value;
        screenshotMetadataSearch();
    }

    /**
     *
     */
    function screenshotMetadataResetSearch() {
        const D = screenshotMetadataDialog;

        D.search = '';
        D.searchIndex = null;
        D.searchResults = null;
        searchResultsData.value = [];
        selectedSearchFilePath.value = null;
        searchViewMode.value = 'detail';
    }

    /**
     *
     * @param path
     * @param needsCarouselFiles
     */
    async function getAndDisplayScreenshot(path, needsCarouselFiles = true) {
        const metadata = await AppApi.GetScreenshotMetadata(path);
        displayScreenshotMetadata(metadata, needsCarouselFiles);
    }

    /**
     * Function receives an unmodified json string grabbed from the screenshot file
     * Error checking and and verification of data is done in .NET already; In the case that the data/file is invalid, a JSON object with the token "error" will be returned containing a description of the problem.
     * Example: {"error":"Invalid file selected. Please select a valid VRChat screenshot."}
     * See docs/screenshotMetadata.json for schema
     * @param {string} json - JSON string grabbed from PNG file
     * @param {boolean} needsCarouselFiles - Whether or not to get the last/next files for the carousel
     * @returns {Promise<void>}
     */
    async function displayScreenshotMetadata(json, needsCarouselFiles = true) {
        let time;
        let date;
        const D = screenshotMetadataDialog;
        D.metadata.author = {};
        D.metadata.world = {};
        D.metadata.players = [];
        D.metadata.creationDate = '';
        D.metadata.application = '';

        let metadata = null;
        try {
            metadata = JSON.parse(json);
        } catch (e) {
            console.error('Error parsing screenshot metadata JSON:', e);
        }
        if (!metadata?.sourceFile) {
            D.metadata = {};
            D.metadata.error = t('dialog.screenshot_metadata.invalid_file');
            return;
        }

        D.loading = true;
        const extraData = await AppApi.GetExtraScreenshotData(metadata.sourceFile, needsCarouselFiles);
        D.loading = false;
        const extraDataObj = JSON.parse(extraData);
        Object.assign(metadata, extraDataObj);

        D.metadata = metadata;

        const regex = metadata.fileName?.match(
            /VRChat_((\d{3,})x(\d{3,})_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.(\d{1,})|(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.(\d{3})_(\d{3,})x(\d{3,}))/
        );
        if (regex) {
            if (typeof regex[2] !== 'undefined' && regex[4].length === 4) {
                date = `${regex[4]}-${regex[5]}-${regex[6]}`;
                time = `${regex[7]}:${regex[8]}:${regex[9]}`;
                D.metadata.dateTime = Date.parse(`${date} ${time}`);
            } else if (typeof regex[11] !== 'undefined' && regex[11].length === 4) {
                date = `${regex[11]}-${regex[12]}-${regex[13]}`;
                time = `${regex[14]}:${regex[15]}:${regex[16]}`;
                D.metadata.dateTime = Date.parse(`${date} ${time}`);
            }
        }
        if (metadata.timestamp) {
            D.metadata.dateTime = Date.parse(metadata.timestamp);
        }
        if (!D.metadata.dateTime) {
            D.metadata.dateTime = Date.parse(metadata.creationDate);
        }

        if (fullscreenImageDialog.value.visible) {
            showFullscreenImageDialog(D.metadata.filePath);
        }
    }
</script>

<style scoped>
    .screenshot-metadata-page {
        display: flex;
        min-height: 0;
        flex-direction: column;
        gap: 12px;
        overflow: hidden;
        padding: 16px 18px 18px;
    }

    .screenshot-metadata__header {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 12px;
    }

    .screenshot-metadata__header h1 {
        margin: 0;
        color: var(--bv-text-strong);
        font-size: 19px;
        font-weight: 700;
        letter-spacing: 0;
    }

    .screenshot-metadata__back {
        margin-left: -6px;
        color: var(--bv-text-muted);
    }

    .screenshot-metadata__toolbar {
        display: flex;
        flex: 0 0 auto;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 10px;
    }

    .screenshot-metadata__search {
        width: min(240px, 100%);
    }

    .screenshot-metadata__results {
        min-height: 0;
        flex: 1;
        overflow: auto;
    }

    .screenshot-metadata__table-head {
        position: sticky;
        z-index: 1;
        top: 0;
        background: var(--bv-bg-control);
    }

    .screenshot-metadata__result-row {
        cursor: pointer;
        transition: background-color 120ms ease;
    }

    .screenshot-metadata__result-row:hover {
        background: var(--bv-bg-hover);
    }

    .screenshot-metadata__workspace {
        display: grid;
        min-height: 0;
        flex: 1;
        grid-template-columns: minmax(0, 1fr) minmax(300px, 370px);
        gap: 12px;
        overflow: hidden;
    }

    .screenshot-metadata__preview {
        display: flex;
        min-width: 0;
        min-height: 0;
        flex-direction: column;
        overflow: hidden;
        background: color-mix(in srgb, var(--bv-bg-base) 72%, var(--bv-bg-surface));
    }

    .screenshot-metadata__stage {
        position: relative;
        display: flex;
        min-height: 0;
        flex: 1;
        align-items: center;
        justify-content: center;
        padding: 12px;
    }

    .screenshot-metadata__image {
        max-width: 100%;
        max-height: 100%;
        cursor: zoom-in;
        border-radius: 8px;
        object-fit: contain;
    }

    .screenshot-metadata__stage-nav {
        position: absolute;
        top: 50%;
        border: 1px solid var(--bv-border);
        border-radius: 999px;
        background: var(--bv-bg-control);
        opacity: 0.66;
        transform: translateY(-50%);
        transition: opacity 160ms ease;
    }

    .screenshot-metadata__stage-nav:hover,
    .screenshot-metadata__stage-nav:focus-visible {
        opacity: 1;
    }

    .screenshot-metadata__stage-nav--previous {
        left: 12px;
    }

    .screenshot-metadata__stage-nav--next {
        right: 12px;
    }

    .screenshot-metadata__drop-state {
        display: flex;
        max-width: 34ch;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        color: var(--bv-text-muted);
        font-size: 13px;
        text-align: center;
    }

    .screenshot-metadata__navigation {
        display: flex;
        min-height: 52px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-top: 1px solid var(--bv-border);
        background: var(--bv-bg-surface);
    }

    .screenshot-metadata__inspector {
        min-height: 0;
        overflow-y: auto;
        padding: 14px;
    }

    .screenshot-metadata__section {
        padding: 2px 0 14px;
    }

    .screenshot-metadata__section + .screenshot-metadata__section {
        padding-top: 14px;
        border-top: 1px solid var(--bv-border);
    }

    .screenshot-metadata__section--actions {
        padding-bottom: 2px;
    }

    @media (max-width: 860px) {
        .screenshot-metadata__workspace {
            overflow-y: auto;
            grid-template-columns: 1fr;
        }

        .screenshot-metadata__preview {
            min-height: 390px;
        }

        .screenshot-metadata__inspector {
            overflow: visible;
        }
    }

    @media (max-width: 620px) {
        .screenshot-metadata-page {
            padding: 12px;
        }

        .screenshot-metadata__toolbar > .flex-1 {
            display: none;
        }

        .screenshot-metadata__search {
            width: 100%;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .screenshot-metadata__result-row,
        .screenshot-metadata__stage-nav {
            transition: none;
        }
    }
</style>
