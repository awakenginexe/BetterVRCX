<template>
    <div
        class="relative isolate overflow-hidden rounded-xl box-border flex items-center gap-2.5 px-2 py-1.5 text-[13px] cursor-pointer transition-colors duration-150 hover:bg-foreground/[0.05] active:bg-foreground/[0.08]"
        @click="showUserDialog(friend.id)">
        <template v-if="friend.ref">
            <NameplateEffect variant="sidebar" :nameplate-effect="friend.ref.nameplateEffect" />
            <HoverCard :open-delay="450" :close-delay="80" @update:open="onHoverOpen">
                <HoverCardTrigger as-child>
                    <div class="relative z-10 flex flex-1 min-w-0 items-center gap-2.5">
                        <div class="relative z-10 inline-block flex-none size-9" :class="friendStatusClass">
                            <Avatar class="size-full rounded-full">
                                <AvatarImage :src="userImage(friend.ref, true)" class="object-cover" />
                                <AvatarFallback>
                                    <User class="size-5 text-muted-foreground" />
                                </AvatarFallback>
                            </Avatar>
                            <IconFrame :icon-frame="friend.ref.iconFrame" />
                        </div>
                        <div
                            data-friend-row-content
                            class="relative z-10 flex-1 overflow-hidden min-h-9 flex flex-col justify-between">
                            <div class="flex items-center min-w-0 font-semibold leading-[18px] tracking-[-0.005em]">
                                <span
                                    v-if="!hideNicknames && friend.$nickName"
                                    class="truncate flex-1 min-w-0"
                                    :style="{ color: friend.ref.$userColour }">
                                    {{ friend.ref.displayName }} ({{ friend.$nickName }})
                                </span>
                                <span v-else class="truncate flex-1 min-w-0" :style="{ color: friend.ref.$userColour }">
                                    {{ friend.ref.displayName
                                    }}{{ isGroupByInstance && allFavoriteFriendIds.has(friend.id) ? ' ⭐' : '' }}
                                </span>
                                <VrcPlusBadge v-if="friend.ref?.$isVRCPlus" size="sm" class="ml-1 flex-none shrink-0" />
                            </div>

                            <span
                                v-if="observation"
                                class="block truncate text-xs text-muted-foreground"
                                :title="t('last_known_presence.uncertain')">
                                <span aria-hidden="true">◌</span>
                                {{
                                    t(
                                        isGroupByInstance
                                            ? 'last_known_presence.last_seen_here'
                                            : 'last_known_presence.last_seen'
                                    )
                                }}
                                · <Timer :epoch="observation.observedAt" />
                            </span>
                            <span
                                v-else-if="isFriendActiveOrOffline"
                                class="block truncate text-xs text-muted-foreground"
                                >{{ friend.ref.statusDescription }}</span
                            >
                            <template v-else>
                                <div v-if="friend.pendingOffline" class="extra block truncate text-xs">
                                    {{ t('side_panel.pending_offline') }}
                                </div>
                                <template v-else-if="isGroupByInstance">
                                    <div class="flex items-center">
                                        <Spinner v-if="isFriendTraveling" class="mr-1" />
                                        <Timer
                                            class="text-xs"
                                            :epoch="epoch"
                                            :style="
                                                isFriendTraveling
                                                    ? { display: 'inline-block', overflow: 'unset' }
                                                    : undefined
                                            " />
                                    </div>
                                </template>
                                <Location
                                    v-else
                                    class="extra block truncate text-xs! text-muted-foreground"
                                    :location="locationProp"
                                    :traveling="travelingProp"
                                    :link="false" />
                            </template>
                        </div>
                    </div>
                </HoverCardTrigger>
                <HoverCardContent
                    side="left"
                    align="start"
                    :side-offset="12"
                    class="w-72 overflow-hidden rounded-2xl border-foreground/10 p-0 shadow-2xl shadow-black/50"
                    @click.stop>
                    <div class="relative flex items-center gap-3 p-3.5">
                        <div
                            class="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25 blur-xl scale-125"
                            :style="{ backgroundImage: `url(${userImage(friend.ref, true)})` }" />
                        <div class="relative flex-none size-16" :class="friendStatusClass">
                            <Avatar class="size-full rounded-full ring-2 ring-foreground/10">
                                <AvatarImage :src="userImage(friend.ref, true)" class="object-cover" />
                                <AvatarFallback><User class="size-7 text-muted-foreground" /></AvatarFallback>
                            </Avatar>
                        </div>
                        <div class="relative min-w-0">
                            <div class="truncate text-[15px] font-semibold" :style="{ color: friend.ref.$userColour }">
                                {{ friend.ref.displayName }}
                            </div>
                            <div class="truncate text-xs text-muted-foreground">
                                {{ friend.ref.statusDescription || '—' }}
                            </div>
                        </div>
                    </div>
                    <dl class="grid grid-cols-2 gap-px border-t border-foreground/[0.06] bg-foreground/[0.06] text-xs">
                        <div
                            v-for="stat in hoverStats"
                            :key="stat.label"
                            class="bg-popover px-3.5 py-2.5 last:odd:col-span-2">
                            <dt class="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                                {{ stat.label }}
                            </dt>
                            <dd class="mt-0.5 truncate font-semibold tabular-nums">
                                <Skeleton v-if="stat.loading" class="h-3.5 w-14 rounded" />
                                <template v-else>{{ stat.value }}</template>
                            </dd>
                        </div>
                    </dl>
                </HoverCardContent>
            </HoverCard>
        </template>
        <template v-else-if="!friend.ref && !isRefreshFriendsLoading">
            <span>{{ friend.name || friend.id }}</span>
            <Button
                size="sm"
                variant="ghost"
                class="mr-1 w-6 h-6 text-xs"
                :ariaLabel="t('common.actions.delete')"
                @click.stop="confirmDeleteFriend(friend.id)"
                ><Trash2 class="h-4 w-4" />
            </Button>
        </template>
    </div>
</template>

<script setup>
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Trash2, User } from 'lucide-vue-next';
    import { Button } from '@/components/ui/button';
    import { Spinner } from '@/components/ui/spinner';
    import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
    import { Skeleton } from '@/components/ui/skeleton';
    import { computed, ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import Location from '@/components/Location.vue';
    import Timer from '@/components/Timer.vue';
    import VrcPlusBadge from '@/components/common/VrcPlusBadge.vue';
    import IconFrame from '@/components/IconFrame.vue';
    import NameplateEffect from '@/components/NameplateEffect.vue';

    import { useAppearanceSettingsStore, useFriendStore, useLocationStore } from '../../../stores';
    import { database } from '../../../services/database';
    import { timeAgo, userOnlineForTimestamp } from '../../../shared/utils';
    import { useUserDisplay } from '../../../composables/useUserDisplay';

    import '@/styles/status-icon.css';
    import { showUserDialog } from '../../../coordinators/userCoordinator';
    import { confirmDeleteFriend } from '../../../coordinators/friendRelationshipCoordinator';

    const props = defineProps({
        friend: { type: Object, required: true },
        isGroupByInstance: Boolean,
        observation: { type: Object, default: null }
    });

    const { hideNicknames } = storeToRefs(useAppearanceSettingsStore());
    const { isRefreshFriendsLoading, allFavoriteFriendIds } = storeToRefs(useFriendStore());
    const { userImage, userStatusClass } = useUserDisplay();

    const { t } = useI18n();

    const isFriendTraveling = computed(() => props.friend.ref?.location === 'traveling');
    const isFriendActiveOrOffline = computed(() => props.friend.state === 'active' || props.friend.state === 'offline');

    const friendStatusClass = computed(() => {
        return userStatusClass(props.friend.ref, props.friend.pendingOffline);
    });

    const epoch = computed(() =>
        isFriendTraveling.value ? props.friend.ref?.$travelingToTime : props.friend.ref?.$location_at
    );

    // Same queries the user dialog runs, loaded lazily when the hover card opens.
    const stats = ref(null);
    async function onHoverOpen(open) {
        if (!open || !props.friend.ref) return;
        const id = props.friend.id;
        stats.value = null;
        try {
            const inCurrentWorld = useLocationStore().lastLocation.playerList.has(id);
            // allSettled: one failed query must not blank the other stats.
            const [statsResult, historyResult] = await Promise.allSettled([
                database.getUserStats(props.friend.ref, inCurrentWorld),
                database.getFriendLogHistoryForUserId(id, ['Friend'])
            ]);
            if (props.friend.id !== id) return;
            for (const result of [statsResult, historyResult]) {
                if (result.status === 'rejected') console.error('Failed to load friend hover stats', result.reason);
            }
            const userStats = statsResult.status === 'fulfilled' ? statsResult.value : {};
            const history = historyResult.status === 'fulfilled' ? historyResult.value : [];
            const friendedAt = history
                .filter((entry) => entry.userId === id && entry.created_at)
                .map((entry) => entry.created_at)
                .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
            stats.value = { ...userStats, friendedAt };
        } catch (err) {
            console.error('Failed to load friend hover stats', err);
            stats.value = {};
        }
    }

    const hoverStats = computed(() => {
        const s = stats.value;
        const loading = s === null;
        const ref = props.friend.ref;
        const onlineTs = ref ? userOnlineForTimestamp({ ref }) : null;
        const isOnline = ref?.state === 'online' && ref?.$online_for;
        return [
            {
                label: t(isOnline ? 'dialog.user.info.online_for' : 'dialog.user.info.offline_for'),
                value: onlineTs ? timeAgo(onlineTs) : '—'
            },
            { label: t('dialog.user.info.last_seen'), loading, value: s?.lastSeen ? timeAgo(s.lastSeen) : '—' },
            { label: t('dialog.user.info.friended'), loading, value: s?.friendedAt ? timeAgo(s.friendedAt) : '—' },
            {
                label: t('dialog.user.info.time_together'),
                loading,
                value: s?.timeSpent ? timeAgo(Date.now() - s.timeSpent * 1000) : '—'
            },
            { label: t('dialog.user.info.join_count'), loading, value: s?.joinCount || '—' }
        ];
    });

    const locationProp = computed(() => props.friend.ref?.location || '');
    const travelingProp = computed(() => props.friend.ref?.travelingToLocation || '');
</script>
