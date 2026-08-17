<template>
    <div class="bv-home-page relative w-full h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden select-none">
        <!-- Background Layer -->
        <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div
                class="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out scale-105"
                :style="backgroundStyle" />
            <div class="absolute inset-0 transition-opacity duration-500" :style="overlayStyle" />
            <!-- Dark gradient overlays for text contrast -->
            <div
                class="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"
                style="mask-image: linear-gradient(to top, black 50%, transparent 100%)" />
            <div class="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-background/50" />
        </div>

        <!-- Main Content Frame -->
        <div class="relative z-10 flex flex-col min-h-full p-6 md:p-10 max-w-[1600px] mx-auto justify-between">
            <!-- Hero / Greeting Section -->
            <header class="space-y-4 pt-2 md:pt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div class="space-y-1.5">
                    <h1 class="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
                        {{ t('view.home.welcome') }}
                        <span v-if="userDisplayName" class="text-primary-foreground font-black">
                            {{ userDisplayName }}
                        </span>
                    </h1>
                    <p class="text-sm md:text-base text-white/80 font-medium max-w-xl drop-shadow-sm">
                        {{ isConnected ? t('view.home.subtitle_connected') : t('view.home.subtitle_disconnected') }}
                    </p>
                </div>

                <!-- Online Players & Friends Live Stats -->
                <div class="flex flex-wrap items-center gap-3 pt-1">
                    <div
                        class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md shadow-sm">
                        <span class="relative flex size-2.5">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
                        </span>
                        <span class="text-xs font-medium text-white/70">{{ t('view.home.online_players') }}:</span>
                        <span class="text-xs font-bold text-white font-mono">
                            {{ onlinePlayersFormatted }}
                        </span>
                    </div>

                    <div
                        class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md shadow-sm cursor-pointer hover:bg-black/70 transition-colors"
                        @click="goToFriendsLocations">
                        <Users class="size-3.5 text-primary" />
                        <span class="text-xs font-medium text-white/70">{{ t('view.home.online_friends') }}:</span>
                        <span class="text-xs font-bold text-white font-mono">
                            {{ onlineFriendsCount }}
                        </span>
                    </div>
                </div>
            </header>

            <!-- Spacious open area to showcase custom screenshot wallpaper -->
            <div class="flex-1 min-h-[380px] md:min-h-[500px] lg:min-h-[55vh] pointer-events-none" />

            <!-- Bottom Dashboard Area (Split Events/News & Friends Locations) -->
            <div class="space-y-6 pb-6">
                <!-- Split Section: Left = Upcoming Events, Right = VRChat News -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <!-- Left: Upcoming Events -->
                <section class="space-y-4 flex flex-col">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <h2 class="text-xs font-bold uppercase tracking-[0.12em] text-white/90">
                                {{ t('view.home.upcoming_events') }}
                            </h2>
                            <button
                                type="button"
                                class="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10 cursor-pointer"
                                :title="t('common.refresh') || 'Refresh'"
                                @click="fetchEvents">
                                <RotateCw class="size-3.5" :class="{ 'animate-spin': isEventsLoading }" />
                            </button>
                        </div>
                        <button
                            type="button"
                            class="text-[11px] font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors cursor-pointer"
                            @click="openCalendar">
                            {{ t('view.home.see_all') }} &rarr;
                        </button>
                    </div>

                    <!-- Event Cards or No Events State -->
                    <div v-if="events.length > 0" class="flex-1 space-y-3">
                        <div
                            v-for="evt in events.slice(0, 3)"
                            :key="evt.id"
                            class="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl hover:border-white/20 hover:bg-black/60 transition-all cursor-pointer group"
                            @click="openCalendar">
                            <div class="size-12 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center text-primary shrink-0 border border-white/10 shadow-inner group-hover:border-primary/40 transition-all">
                                <img
                                    v-if="evt.imageUrl || evt.groupIconUrl"
                                    :src="evt.imageUrl || evt.groupIconUrl"
                                    class="size-full object-cover" />
                                <Calendar v-else class="size-6 text-primary" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between gap-2">
                                    <h4 class="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{{ evt.name }}</h4>
                                    <span v-if="evt.formattedTime" class="text-[11px] font-medium text-primary shrink-0 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                        {{ evt.formattedTime }}
                                    </span>
                                </div>
                                <div class="flex items-center gap-1.5 mt-1 min-w-0">
                                    <img
                                        v-if="evt.groupIconUrl"
                                        :src="evt.groupIconUrl"
                                        class="size-3.5 rounded-full object-cover shrink-0 border border-white/20" />
                                    <p class="text-xs text-white/60 truncate">{{ evt.groupName }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        v-else
                        class="flex-1 flex flex-col items-center justify-center p-8 min-h-[200px] rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md text-center space-y-2">
                        <CalendarPlus class="size-7 text-white/40" />
                        <p class="text-xs text-white/70">
                            {{ t('view.home.no_events') }}
                        </p>
                    </div>
                </section>

                <!-- Right: VRChat News (1 featured card per slide) -->
                <section class="space-y-4 flex flex-col">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <h2 class="text-xs font-bold uppercase tracking-[0.12em] text-white/90">
                                {{ t('view.home.vrchat_news') }}
                            </h2>
                            <button
                                type="button"
                                class="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10 cursor-pointer"
                                :title="t('common.refresh') || 'Refresh'"
                                @click="fetchNews">
                                <RotateCw class="size-3.5" :class="{ 'animate-spin': isNewsLoading }" />
                            </button>
                        </div>

                        <!-- Slide Carousel Controls -->
                        <div class="flex items-center gap-2">
                            <span class="text-[11px] text-white/60 font-mono">
                                {{ newsSlideIndex + 1 }} / {{ maxNewsSlides }}
                            </span>
                            <ButtonGroup>
                                <Button
                                    size="icon-sm"
                                    variant="secondary"
                                    class="size-7 bg-black/40 hover:bg-black/70 text-white border border-white/10 backdrop-blur-sm"
                                    :disabled="newsSlideIndex <= 0"
                                    @click="newsSlideIndex--">
                                    <ChevronLeft class="size-4" />
                                </Button>
                                <Button
                                    size="icon-sm"
                                    variant="secondary"
                                    class="size-7 bg-black/40 hover:bg-black/70 text-white border border-white/10 backdrop-blur-sm"
                                    :disabled="newsSlideIndex >= maxNewsSlides - 1"
                                    @click="newsSlideIndex++">
                                    <ChevronRight class="size-4" />
                                </Button>
                            </ButtonGroup>
                        </div>
                    </div>

                    <!-- News Card (1 per slide in side-by-side view) -->
                    <div v-if="visibleNews.length > 0" class="flex-1">
                        <article
                            v-for="news in visibleNews"
                            :key="news.id"
                            class="group relative flex flex-col sm:flex-row h-full min-h-[200px] rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-white/25 hover:shadow-2xl">
                            <!-- News Cover Image -->
                            <div class="relative w-full sm:w-2/5 h-40 sm:h-auto overflow-hidden bg-muted/20 shrink-0">
                                <img
                                    :src="news.image"
                                    :alt="news.title"
                                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy" />
                                <div class="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                                <div class="absolute top-3 left-3">
                                    <span class="bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-white/10">
                                        {{ news.date }}
                                    </span>
                                </div>
                            </div>

                            <!-- News Content -->
                            <div class="flex flex-col flex-1 p-5 justify-between space-y-3">
                                <div>
                                    <h3 class="text-base font-bold text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                        {{ news.title }}
                                    </h3>
                                    <p class="text-xs text-white/70 leading-relaxed line-clamp-3 mt-2">
                                        {{ news.excerpt }}
                                    </p>
                                </div>
                                <div class="pt-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        class="bg-white/15 hover:bg-white/25 text-white text-xs border border-white/10 backdrop-blur-sm cursor-pointer"
                                        @click="openNews(news)">
                                        {{ t('view.home.show_more') }}
                                    </Button>
                                </div>
                            </div>
                        </article>
                    </div>
                </section>
            </div>

            <!-- Friends Locations Section -->
            <section class="space-y-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <h2 class="text-xs font-bold uppercase tracking-[0.12em] text-white/90">
                            {{ t('view.home.friends_location') }}
                        </h2>
                    </div>
                    <button
                        type="button"
                        class="text-[11px] font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors cursor-pointer"
                        @click="goToFriendsLocations">
                        {{ t('view.home.see_all') }} &rarr;
                    </button>
                </div>

                <!-- Friends Location Cards with High Opacity World Background -->
                <div v-if="activeLocationGroups.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div
                        v-for="(group, idx) in activeLocationGroups"
                        :key="idx"
                        class="relative overflow-hidden p-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl flex flex-col justify-between min-h-[110px] cursor-pointer hover:border-white/25 hover:shadow-xl transition-all group"
                        @click="handleLocationClick(group)">
                        <!-- World Image Background with High Opacity -->
                        <div
                            v-if="group.worldImage"
                            class="absolute inset-0 z-0 bg-cover bg-center opacity-65 group-hover:opacity-80 transition-opacity duration-300 scale-105"
                            :style="{ backgroundImage: `url(${group.worldImage})` }" />
                        <div
                            class="absolute inset-0 z-0 bg-gradient-to-t from-black/90 via-black/60 to-black/35 pointer-events-none" />

                        <!-- Card Header: World Info & Player/Capacity Badge -->
                        <div class="relative z-10 flex items-start justify-between gap-2">
                            <div class="min-w-0 flex-1">
                                <h4 class="text-sm font-bold text-white truncate leading-tight group-hover:text-primary transition-colors">
                                    {{ group.worldName }}
                                </h4>
                                <p class="text-[11px] text-white/60 truncate mt-0.5 font-mono">
                                    {{ group.accessTypeName }} {{ group.instanceName ? `· #${group.instanceName}` : '' }}
                                </p>
                            </div>
                            <span class="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-black/60 text-white/90 shrink-0 border border-white/10 backdrop-blur-md">
                                {{ group.friends.length }}/{{ group.capacity }}
                            </span>
                        </div>

                        <!-- Card Footer: Friends Avatars & Names -->
                        <div class="relative z-10 flex items-center justify-between gap-2 pt-3">
                            <div class="flex items-center -space-x-2 overflow-hidden">
                                <Avatar
                                    v-for="friend in group.friends.slice(0, 5)"
                                    :key="friend.id"
                                    class="size-7 rounded-full ring-2 ring-black/60 hover:scale-110 transition-transform"
                                    :title="friend.name"
                                    @click.stop="openUserProfile(friend.id)">
                                    <AvatarImage :src="userImage(friend.ref, true)" class="object-cover" />
                                    <AvatarFallback class="text-[10px] bg-primary/20 text-primary">
                                        {{ (friend.name || '?').substring(0, 2).toUpperCase() }}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <span class="text-xs font-semibold text-white/90 truncate text-right flex-1 ml-2">
                                {{ group.friends.map(f => f.name || f.displayName).join(', ') }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Empty State for Friends Locations -->
                <div
                    v-else
                    class="flex flex-col items-center justify-center p-8 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md text-center space-y-2 cursor-pointer hover:bg-black/40 transition-colors"
                    @click="goToFriendsLocations">
                    <Compass class="size-7 text-white/40" />
                    <p class="text-xs text-white/70">
                        {{ t('view.home.no_friends_in_instances') }}
                    </p>
                </div>
            </section>
        </div>
    </div>

        <!-- News Detail Modal / Dialog -->
        <Dialog v-model:open="newsDialogOpen">
            <DialogContent class="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
                <DialogHeader>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            {{ selectedNews?.date }}
                        </span>
                    </div>
                    <DialogTitle class="text-xl font-bold text-foreground">{{ selectedNews?.title }}</DialogTitle>
                </DialogHeader>
                <div class="space-y-4 py-3">
                    <img
                        v-if="selectedNews?.image"
                        :src="selectedNews.image"
                        :alt="selectedNews.title"
                        class="w-full h-56 object-cover rounded-xl border border-border" />
                    <p class="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                        {{ selectedNews?.fullContent || selectedNews?.excerpt }}
                    </p>
                </div>
                <DialogFooter class="flex items-center justify-between sm:justify-between">
                    <Button
                        v-if="selectedNews?.url"
                        variant="outline"
                        size="sm"
                        @click="openExternalUrl(selectedNews.url)">
                        <ExternalLink class="size-3.5 mr-1.5" />
                        {{ t('view.home.open_post') }}
                    </Button>
                    <Button size="sm" @click="newsDialogOpen = false">
                        {{ t('dialog.change_log.close') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup>
    import { computed, onMounted, ref, watch } from 'vue';
    import { useIntervalFn } from '@vueuse/core';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { useRouter } from 'vue-router';
    import {
        Calendar,
        CalendarPlus,
        ChevronLeft,
        ChevronRight,
        Compass,
        ExternalLink,
        RotateCw,
        Users
    } from 'lucide-vue-next';

    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Button } from '@/components/ui/button';
    import { ButtonGroup } from '@/components/ui/button-group';
    import {
        Dialog,
        DialogContent,
        DialogFooter,
        DialogHeader,
        DialogTitle
    } from '@/components/ui/dialog';
    import {
        useFriendStore,
        useToolsStore,
        useUserStore,
        useWorldStore
    } from '../../stores';
    import { useUserDisplay } from '../../composables/useUserDisplay';
    import { useHomeBackground } from '../../addons/homeBackground/homeBackgroundStore';
    import { useHomeNews } from './composables/useHomeNews';
    import { useHomeEvents } from './composables/useHomeEvents';
    import { isRealInstance, openExternalLink, parseLocation } from '../../shared/utils';
    import { showUserDialog } from '../../coordinators/userCoordinator';
    import { showWorldDialog } from '../../coordinators/worldCoordinator';
    import { queryRequest } from '../../api';
    import miscRequest from '../../api/misc';

    const { t } = useI18n();
    const router = useRouter();

    const userStore = useUserStore();
    const friendStore = useFriendStore();
    const worldStore = useWorldStore();
    const toolsStore = useToolsStore();
    const { userImage } = useUserDisplay();
    const { currentUser } = storeToRefs(userStore);

    const userDisplayName = computed(() => currentUser.value?.displayName || '');
    const isConnected = computed(() => !!currentUser.value?.id);

    const {
        state: bgState,
        activePhotoUrl,
        backgroundStyle,
        overlayStyle,
        saveHomeBackgroundConfig,
        fetchRandomVRChatPhoto
    } = useHomeBackground();

    const { newsList, isLoading: isNewsLoading, fetchNews } = useHomeNews();
    const { events, isLoading: isEventsLoading, fetchEvents } = useHomeEvents();

    // Online counters
    const onlineVisitsCount = ref(0);
    const onlineFriendsCount = computed(() => friendStore.onlineFriendCount || 0);

    const onlinePlayersFormatted = computed(() => {
        if (!onlineVisitsCount.value) return '--';
        return Number(onlineVisitsCount.value).toLocaleString();
    });

    async function fetchOnlineVisits() {
        try {
            const res = await miscRequest.getVisits();
            const count = typeof res === 'object' && res?.json !== undefined ? res.json : res;
            if (typeof count === 'number') {
                onlineVisitsCount.value = count;
            }
        } catch (err) {
            console.warn('Could not fetch visits count:', err);
        }
    }

    // Carousel for VRChat News (1 featured card per slide in split view)
    const newsSlideIndex = ref(0);
    const CARDS_PER_SLIDE = 1;

    const maxNewsSlides = computed(() => {
        return Math.max(1, Math.ceil(newsList.value.length / CARDS_PER_SLIDE));
    });

    const visibleNews = computed(() => {
        const start = newsSlideIndex.value * CARDS_PER_SLIDE;
        return newsList.value.slice(start, start + CARDS_PER_SLIDE);
    });

    // Friends Locations list (All online friends grouped by instance)
    const activeLocationGroups = computed(() => {
        const map = new Map();
        const allFriends = Array.from(friendStore.friends.values());

        for (const friend of allFriends) {
            const loc = friend.ref?.location || friend.ref?.travelingToLocation;
            if (!loc || !isRealInstance(loc)) continue;
            const L = parseLocation(loc);
            if (!L.isRealInstance || !L.worldId) continue;

            if (!map.has(L.tag)) {
                const cached = worldStore.cachedWorlds.get(L.worldId);
                map.set(L.tag, {
                    tag: L.tag,
                    worldId: L.worldId,
                    worldName: cached?.name || L.worldName || 'VRChat World',
                    worldImage: cached?.thumbnailImageUrl || cached?.imageUrl || null,
                    capacity: cached?.capacity || 32,
                    accessTypeName: L.accessTypeName || 'Public',
                    instanceName: L.instanceName || '',
                    friends: []
                });

                // Fetch world details in background if missing
                if (!cached && L.worldId) {
                    queryRequest.fetch('world.dialog', { worldId: L.worldId }).catch(() => {});
                }
            }
            map.get(L.tag).friends.push(friend);
        }

        const sorted = Array.from(map.values()).sort((a, b) => b.friends.length - a.friends.length);
        return sorted.slice(0, 6);
    });

    // News modal
    const newsDialogOpen = ref(false);
    const selectedNews = ref(null);

    function openNews(news) {
        selectedNews.value = news;
        newsDialogOpen.value = true;
    }

    function openExternalUrl(url) {
        if (url) {
            openExternalLink(url);
        }
    }

    function openUserProfile(userId) {
        if (userId) {
            showUserDialog(userId);
        }
    }

    function handleLocationClick(group) {
        if (group.tag) {
            showWorldDialog(group.tag);
        } else {
            goToFriendsLocations();
        }
    }

    function openCalendar() {
        toolsStore.openDialog('groupCalendar');
    }

    function goToFriendsLocations() {
        router.push({ name: 'friends-locations' });
    }

    useIntervalFn(() => {
        fetchOnlineVisits();
    }, 600000);

    watch(
        () => bgState.eventsDaysAhead,
        () => {
            fetchEvents();
        }
    );

    onMounted(async () => {
        fetchOnlineVisits();
        if (bgState.mode === 'vrchat_photos' && !activePhotoUrl.value) {
            await fetchRandomVRChatPhoto();
        }
        fetchEvents();
    });
</script>

<style scoped>
    .bv-home-page {
        background-color: var(--bv-bg-base);
    }
</style>
