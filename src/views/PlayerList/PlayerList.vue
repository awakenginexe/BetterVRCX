<template>
    <div ref="playerListRef" class="player-list x-container x-container--auto-height">
        <div class="player-list__scroll">
            <header class="player-list__page-header bv-surface">
                <div class="player-list__heading">
                    <span class="bv-eyebrow">{{ t('nav_tooltip.social') }}</span>
                    <h1>{{ t('nav_tooltip.player_list') }}</h1>
                </div>
                <div class="player-list__live-context">
                    <span class="player-list__live-marker" aria-hidden="true"></span>
                    <span class="player-list__player-count font-mono">{{ playerListTotalItems }}</span>
                </div>
            </header>

            <section
                v-if="currentInstanceWorld.ref.id"
                ref="playerListHeaderRef"
                class="player-list__instance bv-surface-raised">
                <button
                    type="button"
                    class="player-list__world-preview bv-focus-ring"
                    :aria-label="currentInstanceWorld.ref.name"
                    data-testid="world-preview"
                    @click="showFullscreenImageDialog(currentInstanceWorld.ref.imageUrl)">
                    <img
                        v-if="!worldImageError"
                        :src="currentInstanceWorld.ref.thumbnailImageUrl"
                        :alt="currentInstanceWorld.ref.name"
                        @error="worldImageError = true"
                        loading="lazy" />
                    <span v-else class="player-list__world-placeholder">
                        <Image class="size-8 text-muted-foreground" />
                    </span>
                </button>
                <div class="player-list__identity">
                    <div class="flex items-center min-w-0">
                        <button
                            type="button"
                            class="player-list__world-name bv-focus-ring"
                            data-testid="world-name"
                            @click="showWorldDialog(currentInstanceWorld.ref.id)">
                            <Home
                                v-if="
                                    currentUser.$homeLocation &&
                                    currentUser.$homeLocation.worldId === currentInstanceWorld.ref.id
                                "
                                class="inline-block" />
                            {{ currentInstanceWorld.ref.name }}
                        </button>
                    </div>
                    <div>
                        <button
                            type="button"
                            class="player-list__author bv-focus-ring x-grey font-mono"
                            data-testid="world-author"
                            @click="showUserDialog(currentInstanceWorld.ref.authorId)"
                            v-text="currentInstanceWorld.ref.authorName"></button>
                    </div>
                    <div class="mt-1.5">
                        <Badge class="mr-1.5" v-if="currentInstanceWorld.ref.$isLabs" variant="outline">
                            {{ t('dialog.world.tags.labs') }}
                        </Badge>
                        <Badge
                            class="mr-1.5"
                            v-else-if="currentInstanceWorld.ref.releaseStatus === 'public'"
                            variant="outline">
                            {{ t('dialog.world.tags.public') }}
                        </Badge>
                        <Badge
                            class="mr-1.5"
                            v-else-if="currentInstanceWorld.ref.releaseStatus === 'private'"
                            variant="outline">
                            {{ t('dialog.world.tags.private') }}
                        </Badge>
                        <TooltipWrapper v-if="currentInstanceWorld.isPC" side="top" content="PC">
                            <Badge class="text-platform-pc border-platform-pc! mr-1.5" variant="outline"
                                ><Monitor class="h-4 w-4" />
                                <span
                                    v-if="currentInstanceWorld.fileAnalysis.standalonewindows?._fileSize"
                                    class="x-grey text-platform-pc border-l-[0.8px] border-solid ml-1.5 pl-1.5 pb-px"
                                    >{{ currentInstanceWorld.fileAnalysis.standalonewindows._fileSize }}</span
                                >
                            </Badge>
                        </TooltipWrapper>
                        <TooltipWrapper v-if="currentInstanceWorld.isQuest" side="top" content="Android">
                            <Badge class="text-platform-quest border-platform-quest! mr-1.5" variant="outline"
                                ><Smartphone class="h-4 w-4" />
                                <span
                                    v-if="currentInstanceWorld.fileAnalysis.android?._fileSize"
                                    class="x-grey text-platform-quest border-l-[0.8px] border-solid ml-1.5 pl-1.5 pb-px"
                                    >{{ currentInstanceWorld.fileAnalysis.android._fileSize }}</span
                                >
                            </Badge>
                        </TooltipWrapper>
                        <TooltipWrapper v-if="currentInstanceWorld.isIos" side="top" content="iOS">
                            <Badge class="text-platform-ios border-platform-ios mr-1.5" variant="outline"
                                ><Apple class="h-4 w-4 text-platform-ios" />
                                <span
                                    v-if="currentInstanceWorld.fileAnalysis.ios?._fileSize"
                                    class="x-grey text-platform-ios border-platform-ios border-l-[0.8px] border-solid ml-1.5 pl-1.5 pb-px"
                                    >{{ currentInstanceWorld.fileAnalysis.ios._fileSize }}</span
                                >
                            </Badge>
                        </TooltipWrapper>
                        <Badge
                            class="mr-1.5 mt-1.5"
                            v-if="currentInstanceWorld.avatarScalingDisabled"
                            variant="outline">
                            {{ t('dialog.world.tags.avatar_scaling_disabled') }}
                        </Badge>
                        <Badge class="mr-1.5" v-if="currentInstanceWorld.inCache" variant="outline">
                            <span>{{ currentInstanceWorld.cacheSize }} {{ t('dialog.world.tags.cache') }}</span>
                        </Badge>
                    </div>
                    <div class="mt-1.5">
                        <LocationWorld
                            :locationobject="currentInstanceLocation"
                            :currentuserid="currentUser.id"
                            class="w-fit" />
                        <span class="ml-1.5" v-if="lastLocation.playerList.size > 0">
                            {{ lastLocation.playerList.size }}
                            <template v-if="lastLocation.friendList.size > 0"
                                >({{ lastLocation.friendList.size }})</template
                            >
                            &nbsp;&horbar; <Timer v-if="lastLocation.date" :epoch="lastLocation.date" />
                        </span>
                    </div>
                    <div class="mt-1.5">
                        <span
                            v-show="currentInstanceWorld.ref.name !== currentInstanceWorld.ref.description"
                            class="inline-block max-w-full align-middle text-xs break-words"
                            v-text="currentInstanceWorld.ref.description"></span>
                    </div>
                </div>
                <aside class="player-list__metrics">
                    <div class="player-list__metric">
                        <div class="flex-1 overflow-hidden">
                            <span class="block truncate font-medium leading-[18px]">{{
                                t('dialog.world.info.capacity')
                            }}</span>
                            <span class="block truncate text-xs"
                                >{{ commaNumber(currentInstanceWorld.ref.recommendedCapacity) }} ({{
                                    commaNumber(currentInstanceWorld.ref.capacity)
                                }})</span
                            >
                        </div>
                    </div>
                    <div class="player-list__metric">
                        <div class="flex-1 overflow-hidden">
                            <span class="block truncate font-medium leading-[18px]">{{
                                t('dialog.world.info.last_updated')
                            }}</span>
                            <span class="block truncate text-xs">{{
                                formatDateFilter(
                                    currentInstanceWorld.fileAnalysis.standalonewindows?.created_at,
                                    'long'
                                )
                            }}</span>
                        </div>
                    </div>
                    <div class="player-list__metric">
                        <div class="flex-1 overflow-hidden">
                            <span class="block truncate font-medium leading-[18px]">{{
                                t('dialog.world.info.created_at')
                            }}</span>
                            <span class="block truncate text-xs">{{
                                formatDateFilter(currentInstanceWorld.ref.created_at, 'long')
                            }}</span>
                        </div>
                    </div>
                </aside>
            </section>

            <section v-if="photonLoggingEnabled" ref="playerListPhotonRef" class="player-list__photon bv-surface">
                <PhotonEventTable @show-chatbox-blacklist="showChatboxBlacklistDialog" />
            </section>

            <section class="player-list__players bv-surface">
                <DataTableLayout
                    class="[&_th]:px-2.5! [&_th]:py-0.75! [&_td]:px-2.5! [&_td]:py-0.75! [&_tr]:h-7!"
                    :table="playerListTable"
                    auto-height
                    :loading="false"
                    :show-pagination="false"
                    :on-row-click="handlePlayerListRowClick" />
            </section>
        </div>
        <ChatboxBlacklistDialog
            :chatbox-blacklist-dialog="chatboxBlacklistDialog"
            @delete-chatbox-user-blacklist="deleteChatboxUserBlacklist" />
    </div>
</template>

<script setup>
    import { computed, onActivated, onMounted, ref, watch } from 'vue';
    import { Apple, Home, Image, Monitor, Smartphone } from 'lucide-vue-next';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import {
        useAppearanceSettingsStore,
        useGalleryStore,
        useInstanceStore,
        useLocationStore,
        usePhotonStore,
        useUserStore
    } from '../../stores';
    import { commaNumber, formatDateFilter } from '../../shared/utils';
    import { Badge } from '../../components/ui/badge';
    import { DataTableLayout } from '../../components/ui/data-table';
    import { createColumns } from './columns.jsx';
    import { useVrcxVueTable } from '../../lib/table/useVrcxVueTable';

    import ChatboxBlacklistDialog from './dialogs/ChatboxBlacklistDialog.vue';
    import Timer from '../../components/Timer.vue';
    import { showUserDialog, lookupUser } from '../../coordinators/userCoordinator';
    import { showWorldDialog } from '../../coordinators/worldCoordinator';

    import PhotonEventTable from './components/PhotonEventTable.vue';
    import { useUserDisplay } from '../../composables/useUserDisplay';

    const { randomUserColours } = storeToRefs(useAppearanceSettingsStore());
    const { userImage } = useUserDisplay();
    const photonStore = usePhotonStore();
    const { photonLoggingEnabled, chatboxUserBlacklist } = storeToRefs(photonStore);
    const { saveChatboxUserBlacklist } = photonStore;

    const { lastLocation } = storeToRefs(useLocationStore());
    const { currentInstanceLocation, currentInstanceWorld, currentInstanceUsersData } = storeToRefs(useInstanceStore());

    const worldImageError = ref(false);

    watch(
        () => currentInstanceWorld.value?.ref?.id,
        () => {
            worldImageError.value = false;
        }
    );
    const { getCurrentInstanceUserList } = useInstanceStore();
    const { showFullscreenImageDialog } = useGalleryStore();
    const { currentUser } = storeToRefs(useUserStore());

    const playerListRef = ref(null);
    const playerListHeaderRef = ref(null);
    const playerListPhotonRef = ref(null);

    const { t } = useI18n();

    const chatboxBlacklistDialog = ref({
        visible: false,
        loading: false
    });

    /**
     *
     */
    function showChatboxBlacklistDialog() {
        const D = chatboxBlacklistDialog.value;
        D.visible = true;
    }

    /**
     *
     * @param val
     */
    function selectCurrentInstanceRow(val) {
        if (val === null) {
            return;
        }
        const ref = val.ref;
        if (ref.id) {
            showUserDialog(ref.id);
        } else {
            lookupUser(ref);
        }
    }

    /**
     *
     * @param userId
     */
    async function deleteChatboxUserBlacklist(userId) {
        chatboxUserBlacklist.value.delete(userId);
        await saveChatboxUserBlacklist();
        getCurrentInstanceUserList();
    }

    /**
     *
     * @param user
     */
    async function addChatboxUserBlacklist(user) {
        chatboxUserBlacklist.value.set(user.id, user.displayName);
        await saveChatboxUserBlacklist();
        getCurrentInstanceUserList();
    }

    /**
     *
     * @param a
     * @param b
     * @param field
     */
    function sortAlphabetically(a, b, field) {
        if (!a[field] || !b[field]) return 0;
        return a[field].toLowerCase().localeCompare(b[field].toLowerCase());
    }

    const playerListColumns = computed(() =>
        createColumns({
            randomUserColours,
            chatboxUserBlacklist,
            onBlockChatbox: addChatboxUserBlacklist,
            onUnblockChatbox: deleteChatboxUserBlacklist,
            sortAlphabetically,
            userImage
        })
    );

    const { table: playerListTable } = useVrcxVueTable({
        persistKey: 'playerList',
        get data() {
            return currentInstanceUsersData.value;
        },
        columns: playerListColumns,
        enablePagination: false,
        getRowId: (row) => `${row?.ref?.id ?? ''}:${row?.displayName ?? ''}`
    });

    watch(
        playerListColumns,
        (next) => {
            playerListTable.setOptions((prev) => ({
                ...prev,
                columns: next
            }));
        },
        { immediate: true }
    );

    watch(
        photonLoggingEnabled,
        (enabled) => {
            const column = playerListTable?.getColumn?.('photonId');
            if (!column) {
                return;
            }
            column.toggleVisibility(Boolean(enabled));
        },
        { immediate: true }
    );

    const playerListTotalItems = computed(() => playerListTable.getRowModel().rows.length);

    const handlePlayerListRowClick = (row) => {
        selectCurrentInstanceRow(row?.original ?? null);
    };

    onMounted(() => {
        getCurrentInstanceUserList();
    });

    onActivated(() => {
        getCurrentInstanceUserList();
    });
</script>

<style scoped>
    .player-list__scroll {
        display: flex;
        min-height: 0;
        height: 100%;
        flex-direction: column;
        gap: 14px;
        overflow-x: hidden;
        overflow-y: auto;
        padding-bottom: 4px;
    }

    .player-list__page-header {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 14px 18px;
        border-radius: 14px;
    }

    .player-list__heading {
        min-width: 0;
    }

    .player-list__heading h1 {
        margin: 2px 0 0;
        color: var(--bv-text-strong);
        font-size: 20px;
        font-weight: 750;
        line-height: 1.15;
    }

    .player-list__live-context {
        display: inline-flex;
        flex: none;
        align-items: center;
        gap: 8px;
        min-height: 32px;
        padding: 0 11px;
        border: 1px solid color-mix(in srgb, var(--bv-success) 35%, var(--bv-border));
        border-radius: 8px;
        color: var(--bv-text-strong);
        background: color-mix(in srgb, var(--bv-success) 8%, var(--bv-bg-control));
    }

    .player-list__live-marker {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--bv-success);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--bv-success) 18%, transparent);
    }

    .player-list__player-count {
        font-size: 12px;
        font-weight: 700;
    }

    .player-list__instance {
        display: grid;
        grid-template-columns: 176px minmax(280px, 1fr) minmax(170px, auto);
        flex: none;
        gap: 16px;
        min-height: 140px;
        padding: 14px;
        border-radius: 14px;
    }

    .player-list__world-preview {
        width: 176px;
        height: 132px;
        overflow: hidden;
        padding: 0;
        border: 1px solid var(--bv-border);
        border-radius: 12px;
        background: var(--bv-bg-control);
        cursor: pointer;
    }

    .player-list__world-preview img,
    .player-list__world-placeholder {
        display: flex;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
        object-fit: cover;
    }

    .player-list__identity {
        display: flex;
        min-width: 0;
        flex-direction: column;
    }

    .player-list__world-name,
    .player-list__author {
        max-width: 100%;
        overflow: hidden;
        padding: 1px 3px;
        border: 0;
        border-radius: 5px;
        background: transparent;
        text-align: left;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
    }

    .player-list__world-name {
        color: var(--bv-text-strong);
        font-size: 17px;
        font-weight: 750;
    }

    .player-list__author {
        color: var(--bv-text-muted);
        font-size: 11px;
    }

    .player-list__metrics {
        display: grid;
        align-content: start;
        gap: 6px;
        padding-left: 14px;
        border-left: 1px solid var(--bv-border);
    }

    .player-list__metric {
        box-sizing: border-box;
        display: flex;
        min-width: 0;
        align-items: center;
        padding: 6px;
        color: var(--bv-text-muted);
        font-size: 13px;
        cursor: default;
    }

    .player-list__photon,
    .player-list__players {
        min-width: 0;
        padding: 12px;
        border-radius: 12px;
    }

    .player-list__photon {
        flex: none;
    }

    .player-list__players {
        display: flex;
        min-height: 240px;
        flex: 1;
    }

    @media (max-width: 900px) {
        .player-list__instance {
            grid-template-columns: 144px minmax(0, 1fr);
        }

        .player-list__world-preview {
            width: 144px;
            height: 108px;
        }

        .player-list__metrics {
            grid-column: 1 / -1;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            padding: 10px 0 0;
            border-top: 1px solid var(--bv-border);
            border-left: 0;
        }
    }
</style>
