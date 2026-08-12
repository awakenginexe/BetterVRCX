<template>
    <UserContextMenu :user-id="friend.id" :state="friend.state" :location="friend.ref?.location">
        <Card
            class="friend-card bv-surface-raised bv-focus-ring x-hover-card relative"
            :style="cardStyle"
            role="button"
            tabindex="0"
            :aria-label="friend.name"
            @click="activateFriend"
            @keydown.enter.prevent="activateFriend"
            @keydown.space.prevent="activateFriend">
            <div class="friend-card__header grid items-center mb-1.75">
                <div class="relative inline-block flex-none size-9 mr-2.5">
                    <Avatar class="size-full rounded-full">
                        <AvatarImage :src="userImage(friend.ref, true)" class="object-cover" />
                        <AvatarFallback>
                            <User class="text-muted-foreground" :size="Math.max(16, 20 * cardScale)" />
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div
                    class="friend-card__name font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                    :title="friend.name">
                    {{ friend.name }}
                </div>
            </div>
            <div class="friend-card__body grid">
                <div
                    v-if="displayInstanceInfo"
                    @click.stop
                    class="friend-card__world flex items-center justify-start box-border max-w-full min-w-0 overflow-hidden"
                    :title="friend.worldName">
                    <Location
                        class="friend-card__location flex w-full overflow-hidden wrap-break-word text-center"
                        :location="friend.ref?.location"
                        :traveling="friend.ref?.travelingToLocation"
                        enable-context-menu
                        link />
                </div>
                <div class="friend-card__metadata">
                    <div class="friend-card__status bv-badge">
                        <span
                            class="friend-card__status-dot bv-status-dot pointer-events-none"
                            :class="statusPresentation.className"
                            :data-status="statusPresentation.tone"
                            aria-hidden="true"></span>
                        <span class="friend-card__status-label">{{ statusPresentation.label }}</span>
                    </div>
                    <div
                        class="friend-card__signature flex items-center overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground"
                        :title="friend.ref?.statusDescription">
                        <Pencil v-if="friend.ref?.statusDescription" class="h-3.5 w-3.5 mr-0.5" style="opacity: 0.7" />
                        {{ friend.ref?.statusDescription || '&nbsp;' }}
                    </div>
                </div>
            </div>
        </Card>
    </UserContextMenu>
</template>

<script setup>
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Card } from '@/components/ui/card';
    import { Pencil, User } from 'lucide-vue-next';
    import { computed } from 'vue';
    import { useI18n } from 'vue-i18n';

    import { useUserDisplay } from '../../../composables/useUserDisplay';

    import Location from '../../../components/Location.vue';
    import UserContextMenu from '../../../components/UserContextMenu.vue';
    import { showUserDialog } from '../../../coordinators/userCoordinator';

    const { userImage, userStatusClass } = useUserDisplay();
    const { t } = useI18n();

    const props = defineProps({
        friend: {
            type: Object,
            required: true
        },
        cardScale: {
            type: Number,
            default: 1
        },
        displayInstanceInfo: {
            type: Boolean,
            default: true
        },
        cardSpacing: {
            type: Number,
            default: 1
        }
    });

    const cardStyle = computed(() => ({
        '--card-scale': props.cardScale,
        '--card-spacing': props.cardSpacing,
        cursor: 'pointer',
        padding: `${8 * props.cardScale}px`,
        paddingBottom: `${6 * props.cardScale}px !important`
    }));

    const statusPresentation = computed(() => {
        const status = userStatusClass(props.friend.ref, props.friend.pendingOffline);

        if (status?.online) {
            return {
                className: 'friend-card__status-dot--online',
                tone: 'online',
                label: t('dialog.user.status.online')
            };
        }
        if (status?.['active-joinme']) {
            return {
                className: 'friend-card__status-dot--active-joinme',
                tone: 'joinme',
                label: t('dialog.user.status.join_me')
            };
        }
        if (status?.['active-askme']) {
            return {
                className: 'friend-card__status-dot--active-askme',
                tone: 'askme',
                label: t('dialog.user.status.ask_me')
            };
        }
        if (status?.['active-busy']) {
            return {
                className: 'friend-card__status-dot--active-busy',
                tone: 'busy',
                label: t('dialog.user.status.busy')
            };
        }
        if (status?.active) {
            return {
                className: 'friend-card__status-dot--active',
                tone: 'online',
                label: t('dialog.user.status.active')
            };
        }
        if (status?.joinme) {
            return {
                className: 'friend-card__status-dot--joinme',
                tone: 'joinme',
                label: t('dialog.user.status.join_me')
            };
        }
        if (status?.askme) {
            return {
                className: 'friend-card__status-dot--askme',
                tone: 'askme',
                label: t('dialog.user.status.ask_me')
            };
        }
        if (status?.busy) {
            return {
                className: 'friend-card__status-dot--busy',
                tone: 'busy',
                label: t('dialog.user.status.busy')
            };
        }
        if (status?.offline) {
            return {
                className: 'friend-card__status-dot--offline',
                tone: 'offline',
                label: t('dialog.user.status.offline')
            };
        }

        return {
            className: 'friend-card__status-dot--hidden',
            tone: 'offline',
            label: t('dialog.user.status.offline')
        };
    });

    const activateFriend = () => showUserDialog(props.friend.id);
</script>

<style scoped>
    .friend-card {
        --card-scale: 1;
        --card-spacing: 1;
        gap: calc(14px * var(--card-scale) * var(--card-spacing));
        max-width: var(--friend-card-target-width, 220px);
        min-width: var(--friend-card-min-width, 220px);
        color: var(--bv-text-strong);
        transition:
            border-color 160ms ease,
            background-color 160ms ease,
            box-shadow 160ms ease;
    }

    .friend-card:hover {
        border-color: color-mix(in srgb, var(--bv-accent) 42%, var(--bv-border));
        background: var(--bv-bg-hover);
    }

    .friend-card__header {
        grid-template-columns: auto minmax(0, 1fr);
        gap: calc(10px * var(--card-scale) * var(--card-spacing));
    }

    .friend-card__status-dot {
        inline-size: calc(8px * var(--card-scale));
        block-size: calc(8px * var(--card-scale));
    }

    .friend-card__status-dot--hidden {
        display: none;
    }

    .friend-card__body {
        gap: calc(8px * var(--card-scale) * var(--card-spacing));
    }

    .friend-card__name {
        font-size: calc(13px * var(--card-scale));
    }

    .friend-card__signature {
        font-size: calc(12px * var(--card-scale));
        line-height: 1.4;
        gap: calc(4px * var(--card-scale));
    }

    .friend-card__signature :deep(svg) {
        margin-top: calc(1px * var(--card-scale));
    }

    .friend-card__world {
        min-height: calc(24px * var(--card-scale));
        padding: calc(7px * var(--card-scale)) calc(8px * var(--card-scale));
        border-radius: calc(var(--radius-lg) * var(--card-scale));
        font-size: calc(12px * var(--card-scale));
        line-height: 1.3;
        border: 1px solid var(--bv-border);
        background: var(--bv-bg-surface);
    }

    .friend-card__metadata {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: calc(8px * var(--card-scale) * var(--card-spacing));
        min-width: 0;
        padding: calc(5px * var(--card-scale)) 0 0;
    }

    .friend-card__status {
        gap: calc(5px * var(--card-scale));
        min-height: calc(20px * var(--card-scale));
        padding: calc(2px * var(--card-scale)) calc(6px * var(--card-scale));
        font-size: calc(10px * var(--card-scale));
    }

    .friend-card__status-label {
        line-height: 1.2;
    }

    :global(html.dark) .friend-card__world,
    :global(:root.dark) .friend-card__world,
    :global(:root[data-theme='dark']) .friend-card__world {
        color: var(--color-zinc-300);
    }

    .friend-card__location {
        max-height: calc(36px * var(--card-scale));
        white-space: normal;
    }

    .friend-card__location :deep(.x-location__text) {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        text-overflow: ellipsis;
    }

    .friend-card__location :deep(.x-location__text:only-child) {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(24px * var(--card-scale));
    }

    .friend-card__location :deep(.x-location__text:only-child span) {
        display: block;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .friend-card__location :deep(.x-location__meta) {
        display: none;
    }

    .friend-card__location :deep(.flags) {
        scale: calc(1 * var(--card-scale));
        filter: brightness(1.05);
    }

    @media (prefers-reduced-motion: reduce) {
        .friend-card {
            transition-duration: 0.01ms;
        }
    }
</style>
