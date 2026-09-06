<template>
    <ContextMenu @update:open="handleContextMenuOpen">
        <ContextMenuTrigger as="div" class="h-full">
            <div
                class="avatar-card-wrapper relative h-full group"
                :data-menu-open="contextMenuOpen || dropdownMenuOpen"
                @click="handleCardClick">
                <!-- Static invisible placeholder preserving exact grid cell height and layout footprint -->
                <div class="invisible pointer-events-none select-none opacity-0" aria-hidden="true">
                    <Card class="flex flex-col h-full rounded-xl border border-transparent">
                        <div class="w-full" style="aspect-ratio: 4 / 3;" />
                        <div class="flex-1 flex flex-col justify-between p-2.5 gap-2">
                            <div class="flex flex-col gap-1">
                                <div class="font-semibold text-sm leading-tight truncate">placeholder</div>
                                <div class="text-[11px] truncate">placeholder</div>
                            </div>
                            <div class="flex items-center gap-1.5 pt-1 border-t border-transparent">
                                <div class="flex-1 h-7" />
                                <div class="size-7" />
                                <div class="size-7" />
                            </div>
                        </div>
                    </Card>
                </div>

                <!-- Floating Card that expands on hover -->
                <Card
                    class="avatar-card avatar-card-floating flex flex-col cursor-pointer rounded-xl border bg-card select-none"
                    :class="[
                        isActive
                            ? 'ring-2 ring-primary border-primary/70 bg-primary/5 shadow-sm'
                            : 'border-border/60 hover:border-primary/50 hover:bg-accent/40'
                    ]">
                    <!-- 4:3 Aspect Ratio Thumbnail Container -->
                    <div
                        class="w-full aspect-4/3 overflow-hidden bg-muted relative group/thumb cursor-pointer shrink-0 rounded-t-xl"
                        @click.stop="handleImageClick">
                        <img
                            v-if="avatar.thumbnailImageUrl && !imageLoadError"
                            :src="avatar.thumbnailImageUrl"
                            :alt="avatar.name"
                            loading="lazy"
                            decoding="async"
                            fetchpriority="low"
                            class="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                            @error="imageLoadError = true" />
                        <div v-else class="w-full h-full grid place-items-center bg-muted/60">
                            <ImageIcon class="size-8 text-muted-foreground/60" />
                        </div>

                        <!-- Subtle Top Gradient for Badge Readability -->
                        <div class="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

                        <!-- Subtle Bottom Gradient for Badges -->
                        <div class="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                        <!-- Zoom overlay indicator on hover -->
                        <div
                            class="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div class="p-2 rounded-full bg-black/75 text-white shadow-md">
                                <ZoomIn class="size-5" />
                            </div>
                        </div>

                        <!-- Top Badges: Active & Visibility -->
                        <div class="absolute top-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none">
                            <!-- Active/Wearing Badge -->
                            <div
                                v-if="isActive"
                                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shadow-sm">
                                <Check class="size-3 stroke-[2.5]" />
                                <span>{{ t('common.current_session') }}</span>
                            </div>
                            <div v-else />

                            <!-- Release Status Badge -->
                            <Badge
                                variant="secondary"
                                class="text-[10px] px-1.5 py-0 font-medium bg-background/95 shadow-xs border border-border/50"
                                :class="avatar.releaseStatus === 'public' ? 'text-emerald-500' : 'text-amber-500'">
                                <Lock v-if="avatar.releaseStatus !== 'public'" class="size-2.5 mr-0.5" />
                                {{ avatar.releaseStatus === 'public' ? t('dialog.avatar.tags.public') : t('dialog.avatar.tags.private') }}
                            </Badge>
                        </div>

                        <!-- Bottom Badges: Performance, Cache Size & Platforms -->
                        <div class="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between gap-1">
                            <!-- Bottom Left: Performance & Cache Badge -->
                            <div class="flex items-center gap-1 flex-wrap">
                                <div
                                    v-if="bestPerf"
                                    class="flex items-center gap-1 bg-black/75 px-1.5 py-0.5 rounded-md border border-white/10 text-[10px] text-white/90">
                                    <span class="size-1.5 rounded-full" :class="perfDotColor" />
                                    <span>{{ bestPerf }}</span>
                                </div>

                                <!-- Cache Badge (if found on PC) -->
                                <TooltipWrapper
                                    v-if="inCache"
                                    :content="`${t('dialog.avatar.tags.cache')}: ${cacheSize} (${t('common.actions.open')})`"
                                    side="top">
                                    <div
                                        data-testid="cache-badge"
                                        class="flex items-center gap-1 bg-sky-950/90 hover:bg-sky-900 px-1.5 py-0.5 rounded-md border border-sky-400/30 text-[10px] text-sky-300 font-medium cursor-pointer transition-colors"
                                        @click.stop="openFolderGeneric(cachePath)">
                                        <HardDrive class="size-2.5 text-sky-400" />
                                        <span>{{ cacheSize }}</span>
                                    </div>
                                </TooltipWrapper>
                            </div>

                            <!-- Platform Badges (Bottom Right of Thumbnail) -->
                            <div
                                v-if="platformInfo.isPC || platformInfo.isQuest || platformInfo.isIos"
                                class="flex items-center gap-1 bg-black/75 px-1.5 py-0.5 rounded-md border border-white/10 shrink-0">
                                <TooltipWrapper v-if="platformInfo.isPC" content="PC" side="top">
                                    <Monitor class="size-3 text-platform-pc" />
                                </TooltipWrapper>
                                <TooltipWrapper v-if="platformInfo.isQuest" content="Android / Quest" side="top">
                                    <Smartphone class="size-3 text-platform-quest" />
                                </TooltipWrapper>
                                <TooltipWrapper v-if="platformInfo.isIos" content="iOS" side="top">
                                    <Apple class="size-3 text-platform-ios" />
                                </TooltipWrapper>
                            </div>
                        </div>
                    </div>

                    <!-- Card Body -->
                    <div class="flex-1 flex flex-col justify-between p-2.5 gap-2 min-w-0">
                        <div class="flex flex-col gap-1 min-w-0">
                            <TooltipWrapper :content="avatar.name" side="top" :delay-duration="500">
                                <h3 class="font-semibold text-sm leading-tight truncate text-foreground group-hover:text-primary transition-colors">
                                    {{ avatar.name }}
                                </h3>
                            </TooltipWrapper>

                            <!-- Compact Tags or Time Spent -->
                            <div v-if="avatar.$tags?.length" class="flex flex-wrap gap-1 items-center max-h-5 overflow-hidden">
                                <Badge
                                    v-for="tagEntry in visibleTags"
                                    :key="tagEntry.tag"
                                    variant="outline"
                                    class="text-[10px] px-1 py-0 rounded-xs font-normal border leading-tight truncate max-w-[90px]"
                                    :style="{
                                        borderColor: getTagColor(tagEntry.tag).bg,
                                        color: getTagColor(tagEntry.tag).text
                                    }">
                                    {{ tagEntry.tag }}
                                </Badge>
                                <span v-if="remainingTagCount > 0" class="text-[10px] text-muted-foreground font-medium">
                                    +{{ remainingTagCount }}
                                </span>
                            </div>
                            <div v-else-if="avatar.$timeSpent" class="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock class="size-3" />
                                <span>{{ timeToText(avatar.$timeSpent) }}</span>
                            </div>
                            <div v-else class="text-[11px] text-muted-foreground/60 truncate">
                                {{ formatDateFilter(avatar.updated_at, 'short') }}
                            </div>
                        </div>

                        <!-- Hover Expandable Details Section -->
                        <div class="card-details-expand">
                            <div class="card-details-inner">
                                <div class="flex flex-col gap-2 pt-2 border-t border-border/40 text-xs">
                                    <!-- All Tags (if more than visibleTags) -->
                                    <div v-if="avatar.$tags?.length > 2" class="flex flex-wrap gap-1">
                                        <Badge
                                            v-for="tagEntry in avatar.$tags"
                                            :key="tagEntry.tag"
                                            variant="outline"
                                            class="text-[10px] px-1.5 py-0 font-normal border leading-tight"
                                            :style="{
                                                borderColor: getTagColor(tagEntry.tag).bg,
                                                color: getTagColor(tagEntry.tag).text
                                            }">
                                            {{ tagEntry.tag }}
                                        </Badge>
                                    </div>

                                    <!-- Platform & Performance Breakdown -->
                                    <div
                                        v-if="platformInfo.isPC || platformInfo.isQuest || platformInfo.isIos"
                                        class="flex flex-col gap-1 rounded-md bg-muted/40 p-2 border border-border/40 text-[11px]">
                                        <div v-if="platformInfo.isPC" class="flex items-center justify-between">
                                            <span class="flex items-center gap-1.5 text-muted-foreground">
                                                <Monitor class="size-3 text-platform-pc" />
                                                <span>PC</span>
                                            </span>
                                            <span class="font-medium" :class="getPerfTextColor(pcPerf)">{{ pcPerf || '-' }}</span>
                                        </div>
                                        <div v-if="platformInfo.isQuest" class="flex items-center justify-between">
                                            <span class="flex items-center gap-1.5 text-muted-foreground">
                                                <Smartphone class="size-3 text-platform-quest" />
                                                <span>Android</span>
                                            </span>
                                            <span class="font-medium" :class="getPerfTextColor(androidPerf)">{{ androidPerf || '-' }}</span>
                                        </div>
                                        <div v-if="platformInfo.isIos" class="flex items-center justify-between">
                                            <span class="flex items-center gap-1.5 text-muted-foreground">
                                                <Apple class="size-3 text-platform-ios" />
                                                <span>iOS</span>
                                            </span>
                                            <span class="font-medium" :class="getPerfTextColor(iosPerf)">{{ iosPerf || '-' }}</span>
                                        </div>
                                    </div>

                                    <!-- Metadata Grid -->
                                    <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] px-0.5">
                                        <span class="text-muted-foreground">{{ t('dialog.avatar.info.version') }}</span>
                                        <span class="text-right font-medium">{{ avatar.version ?? '-' }}</span>

                                        <template v-if="inCache">
                                            <span class="text-muted-foreground">{{ t('dialog.avatar.tags.cache') }}</span>
                                            <div class="flex justify-end">
                                                <Badge
                                                    variant="outline"
                                                    class="text-[10px] px-1.5 py-0 text-sky-400 border-sky-400/30 cursor-pointer hover:bg-sky-500/10 transition-colors"
                                                    @click.stop="openFolderGeneric(cachePath)">
                                                    <HardDrive class="size-2.5 mr-1" />
                                                    {{ cacheSize }}
                                                </Badge>
                                            </div>
                                        </template>

                                        <template v-if="avatar.$timeSpent">
                                            <span class="text-muted-foreground">{{ t('dialog.avatar.info.time_spent') }}</span>
                                            <span class="text-right font-medium">{{ timeToText(avatar.$timeSpent) }}</span>
                                        </template>

                                        <span class="text-muted-foreground">{{ t('dialog.avatar.info.last_updated') }}</span>
                                        <span class="text-right text-muted-foreground/80 truncate">{{ formatDateFilter(avatar.updated_at, 'short') }}</span>

                                        <span class="text-muted-foreground">{{ t('dialog.avatar.info.created_at') }}</span>
                                        <span class="text-right text-muted-foreground/80 truncate">{{ formatDateFilter(avatar.created_at, 'short') }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons Row -->
                        <div class="flex items-center gap-1.5 pt-1 border-t border-border/40" @click.stop>
                            <Button
                                size="sm"
                                :variant="isActive ? 'secondary' : 'default'"
                                class="flex-1 h-7 text-xs font-medium gap-1 rounded-md px-2"
                                :disabled="isActive"
                                @click="emit('wear', avatar)">
                                <Check v-if="isActive" class="size-3.5" />
                                <span>{{ isActive ? t('common.current_session') : t('dialog.avatar.actions.select') }}</span>
                            </Button>

                            <TooltipWrapper :content="t('dialog.avatar.actions.view_details')" side="top">
                                <Button
                                    size="icon-sm"
                                    variant="outline"
                                    class="size-7 rounded-md shrink-0"
                                    @click="emit('details', avatar)">
                                    <Eye class="size-3.5" />
                                </Button>
                            </TooltipWrapper>

                            <!-- Quick Actions Dropdown Menu -->
                            <DropdownMenu @update:open="handleDropdownMenuOpen">
                                <DropdownMenuTrigger as-child>
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        class="size-7 rounded-md shrink-0 hover:bg-muted"
                                        @click.stop>
                                        <MoreVertical class="size-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" class="w-52" @click.stop>
                                    <DropdownMenuItem @click="handleImageClick">
                                        <ZoomIn class="size-4 mr-2" />
                                        {{ t('dialog.edit_profile.profile_background_type_image') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="emit('context-action', 'details', avatar)">
                                        <Eye class="size-4 mr-2" />
                                        {{ t('dialog.avatar.actions.view_details') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem :disabled="isActive" @click="emit('context-action', 'wear', avatar)">
                                        <Check class="size-4 mr-2" />
                                        {{ t('view.favorite.select_avatar_tooltip') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="emit('context-action', 'copyId', avatar)">
                                        <Copy class="size-4 mr-2" />
                                        {{ t('dialog.avatar.info.copy_id') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem v-if="inCache" @click="openFolderGeneric(cachePath)">
                                        <HardDrive class="size-4 mr-2 text-sky-400" />
                                        {{ t('dialog.avatar.tags.cache') }} ({{ cacheSize }})
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        v-if="inCache"
                                        class="text-destructive focus:text-destructive"
                                        @click="handleDeleteCache">
                                        <Trash2 class="size-4 mr-2" />
                                        {{ t('dialog.avatar.actions.delete_cache_tooltip') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem @click="emit('context-action', 'manageTags', avatar)">
                                        <Tag class="size-4 mr-2" />
                                        {{ t('dialog.avatar.actions.manage_tags') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        @click="
                                            emit(
                                                'context-action',
                                                avatar.releaseStatus === 'public' ? 'makePrivate' : 'makePublic',
                                                avatar
                                            )
                                        ">
                                        <User class="size-4 mr-2" />
                                        {{
                                            avatar.releaseStatus === 'public'
                                                ? t('dialog.avatar.actions.make_private')
                                                : t('dialog.avatar.actions.make_public')
                                        }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="emit('context-action', 'rename', avatar)">
                                        <Pencil class="size-4 mr-2" />
                                        {{ t('dialog.avatar.actions.rename') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="emit('context-action', 'changeDescription', avatar)">
                                        <Pencil class="size-4 mr-2" />
                                        {{ t('dialog.avatar.actions.change_description') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="emit('context-action', 'changeImage', avatar)">
                                        <ImageIcon class="size-4 mr-2" />
                                        {{ t('dialog.avatar.actions.change_image') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="emit('context-action', 'createImpostor', avatar)">
                                        <RefreshCw class="size-4 mr-2" />
                                        {{ t('dialog.avatar.actions.create_impostor') }}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </Card>
            </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
            <ContextMenuItem @click="handleImageClick">
                <ZoomIn class="size-4" />
                {{ t('dialog.edit_profile.profile_background_type_image') }}
            </ContextMenuItem>
            <ContextMenuItem @click="emit('context-action', 'details', avatar)">
                <Eye class="size-4" />
                {{ t('dialog.avatar.actions.view_details') }}
            </ContextMenuItem>
            <ContextMenuItem :disabled="isActive" @click="emit('context-action', 'wear', avatar)">
                <Check class="size-4" />
                {{ t('view.favorite.select_avatar_tooltip') }}
            </ContextMenuItem>
            <ContextMenuItem @click="emit('context-action', 'copyId', avatar)">
                <Copy class="size-4" />
                {{ t('dialog.avatar.info.copy_id') }}
            </ContextMenuItem>
            <ContextMenuItem v-if="inCache" @click="openFolderGeneric(cachePath)">
                <HardDrive class="size-4 text-sky-400" />
                {{ t('dialog.avatar.tags.cache') }} ({{ cacheSize }})
            </ContextMenuItem>
            <ContextMenuItem
                v-if="inCache"
                class="text-destructive focus:text-destructive"
                @click="handleDeleteCache">
                <Trash2 class="size-4" />
                {{ t('dialog.avatar.actions.delete_cache_tooltip') }}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem @click="emit('context-action', 'manageTags', avatar)">
                <Tag class="size-4" />
                {{ t('dialog.avatar.actions.manage_tags') }}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
                @click="
                    emit(
                        'context-action',
                        avatar.releaseStatus === 'public' ? 'makePrivate' : 'makePublic',
                        avatar
                    )
                ">
                <User class="size-4" />
                {{
                    avatar.releaseStatus === 'public'
                        ? t('dialog.avatar.actions.make_private')
                        : t('dialog.avatar.actions.make_public')
                }}
            </ContextMenuItem>
            <ContextMenuItem @click="emit('context-action', 'rename', avatar)">
                <Pencil class="size-4" />
                {{ t('dialog.avatar.actions.rename') }}
            </ContextMenuItem>
            <ContextMenuItem @click="emit('context-action', 'changeDescription', avatar)">
                <Pencil class="size-4" />
                {{ t('dialog.avatar.actions.change_description') }}
            </ContextMenuItem>
            <ContextMenuItem @click="emit('context-action', 'changeTags', avatar)">
                <Pencil class="size-4" />
                {{ t('dialog.avatar.actions.change_content_tags') }}
            </ContextMenuItem>
            <ContextMenuItem @click="emit('context-action', 'changeStyles', avatar)">
                <Pencil class="size-4" />
                {{ t('dialog.avatar.actions.change_styles_author_tags') }}
            </ContextMenuItem>
            <ContextMenuItem @click="emit('context-action', 'changeImage', avatar)">
                <ImageIcon class="size-4" />
                {{ t('dialog.avatar.actions.change_image') }}
            </ContextMenuItem>
            <ContextMenuItem @click="emit('context-action', 'createImpostor', avatar)">
                <RefreshCw class="size-4" />
                {{ t('dialog.avatar.actions.create_impostor') }}
            </ContextMenuItem>
        </ContextMenuContent>
    </ContextMenu>
</template>

<script setup>
    import {
        Apple,
        Check,
        Clock,
        Copy,
        ExternalLink,
        Eye,
        HardDrive,
        Image as ImageIcon,
        Lock,
        Monitor,
        MoreVertical,
        Pencil,
        RefreshCw,
        Smartphone,
        Tag,
        Trash2,
        User,
        ZoomIn
    } from 'lucide-vue-next';
    import {
        ContextMenu,
        ContextMenuContent,
        ContextMenuItem,
        ContextMenuSeparator,
        ContextMenuTrigger
    } from '@/components/ui/context-menu';
    import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger
    } from '@/components/ui/dropdown-menu';
    import { TooltipWrapper } from '@/components/ui/tooltip';
    import {
        checkVRChatCache,
        formatDateFilter,
        getAvailablePlatforms,
        getPlatformInfo,
        openFolderGeneric,
        timeToText
    } from '@/shared/utils';
    import { computed, onMounted, ref, watch } from 'vue';
    import { runDeleteVRChatCacheFlow } from '@/coordinators/gameCoordinator';
    import { useGalleryStore } from '@/stores';
    import { Badge } from '@/components/ui/badge';
    import { Button } from '@/components/ui/button';
    import { Card } from '@/components/ui/card';
    import { Separator } from '@/components/ui/separator';
    import { getTagColor } from '@/shared/constants';
    import { useI18n } from 'vue-i18n';

    const { t } = useI18n();
    const { showFullscreenImageDialog } = useGalleryStore();

    // Module-level cache map to avoid duplicate IPC queries when scrolling
    const avatarCacheMap = new Map();

    const contextMenuOpen = ref(false);
    const dropdownMenuOpen = ref(false);
    const imageLoadError = ref(false);
    const cacheInfo = ref(null);

    const handleContextMenuOpen = (open) => {
        contextMenuOpen.value = open;
    };

    const handleDropdownMenuOpen = (open) => {
        dropdownMenuOpen.value = open;
    };

    function getPerfTextColor(perf) {
        switch (perf) {
            case 'Excellent':
                return 'text-emerald-400';
            case 'Good':
                return 'text-green-400';
            case 'Medium':
                return 'text-yellow-400';
            case 'Poor':
                return 'text-orange-400';
            case 'VeryPoor':
                return 'text-red-400';
            default:
                return 'text-muted-foreground';
        }
    }

    const props = defineProps({
        avatar: {
            type: Object,
            required: true
        },
        currentAvatarId: {
            type: String,
            default: ''
        },
        cardScale: {
            type: Number,
            default: 0.6
        }
    });

    const emit = defineEmits(['click', 'wear', 'details', 'context-action']);

    function handleCardClick() {
        emit('click', props.avatar);
    }

    function handleImageClick(e) {
        e?.stopPropagation();
        const url = props.avatar.imageUrl || props.avatar.thumbnailImageUrl;
        if (url) {
            showFullscreenImageDialog(url);
        }
    }

    async function checkCache() {
        const avatarId = props.avatar?.id;
        if (!avatarId) {
            cacheInfo.value = null;
            return;
        }
        if (avatarCacheMap.has(avatarId)) {
            cacheInfo.value = avatarCacheMap.get(avatarId);
            return;
        }
        try {
            const result = await checkVRChatCache(props.avatar);
            const data = result && typeof result === 'object' && result.Item1 > 0 ? result : null;
            avatarCacheMap.set(avatarId, data);
            cacheInfo.value = data;
        } catch {
            cacheInfo.value = null;
        }
    }

    onMounted(() => {
        checkCache();
    });

    watch(
        () => props.avatar?.id,
        () => {
            checkCache();
        }
    );

    const inCache = computed(() => !!cacheInfo.value && cacheInfo.value.Item1 > 0);
    const cacheSize = computed(() => {
        if (!inCache.value) return '';
        return `${(cacheInfo.value.Item1 / 1048576).toFixed(1)} MB`;
    });
    const cachePath = computed(() => cacheInfo.value?.Item3 || '');

    async function handleDeleteCache() {
        try {
            await runDeleteVRChatCacheFlow(props.avatar);
            if (props.avatar?.id) {
                avatarCacheMap.delete(props.avatar.id);
            }
            cacheInfo.value = null;
        } catch (err) {
            console.error('Failed to delete avatar cache:', err);
        }
    }

    const isActive = computed(() => props.avatar.id === props.currentAvatarId);

    const platformInfo = computed(() => getAvailablePlatforms(props.avatar.unityPackages));

    const perfInfo = computed(() => getPlatformInfo(props.avatar.unityPackages));
    const pcPerf = computed(() => perfInfo.value?.pc?.performanceRating ?? '');
    const androidPerf = computed(() => perfInfo.value?.android?.performanceRating ?? '');
    const iosPerf = computed(() => perfInfo.value?.ios?.performanceRating ?? '');
    const bestPerf = computed(() => pcPerf.value || androidPerf.value || iosPerf.value || '');

    const perfDotColor = computed(() => {
        switch (bestPerf.value) {
            case 'Excellent':
                return 'bg-emerald-400';
            case 'Good':
                return 'bg-green-400';
            case 'Medium':
                return 'bg-yellow-400';
            case 'Poor':
                return 'bg-orange-400';
            case 'VeryPoor':
                return 'bg-red-400';
            default:
                return 'bg-muted-foreground';
        }
    });

    const visibleTags = computed(() => (props.avatar.$tags || []).slice(0, 2));
    const remainingTagCount = computed(() => Math.max(0, (props.avatar.$tags || []).length - 2));
</script>

<style scoped>
    .avatar-card img {
        display: block;
        object-fit: cover;
    }

    .avatar-card-wrapper {
        position: relative;
        height: 100%;
    }

    .avatar-card-floating {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: auto;
        transform-origin: top center;
        transform: translate3d(0, 0, 0);
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        perspective: 1000px;
        will-change: transform, box-shadow;
        transition:
            transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1),
            border-color 150ms ease;
        z-index: 10;
    }

    .avatar-card-wrapper:hover .avatar-card-floating,
    .avatar-card-wrapper[data-menu-open="true"] .avatar-card-floating {
        transform: translate3d(0, -4px, 0) scale(1.025);
        z-index: 50;
        box-shadow:
            0 16px 24px -6px rgba(0, 0, 0, 0.5),
            0 6px 10px -4px rgba(0, 0, 0, 0.4);
        border-color: var(--color-primary, hsl(var(--primary)));
    }

    .card-details-expand {
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        will-change: max-height, opacity;
        transition:
            max-height 220ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 180ms ease;
    }

    .avatar-card-wrapper:hover .card-details-expand,
    .avatar-card-wrapper[data-menu-open="true"] .card-details-expand {
        max-height: 360px;
        opacity: 1;
    }

    .card-details-inner {
        overflow: hidden;
    }
</style>
