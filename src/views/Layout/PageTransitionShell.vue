<template>
    <div class="vrcx-page-stage relative h-full min-h-0 min-w-0 overflow-hidden">
        <RouterView v-slot="{ Component, route }">
            <Transition :name="routeTransitionName" appear>
                <KeepAlive exclude="ChartsInstance, ChartsMutual">
                    <component :is="Component" :key="getTransitionKey(route)" class="vrcx-page-surface" />
                </KeepAlive>
            </Transition>
        </RouterView>
    </div>
</template>

<script setup>
    import { onUnmounted, ref } from 'vue';
    import { useRouter } from 'vue-router';

    const router = useRouter();
    const routeTransitionName = ref('vrcx-page-down');

    const routeOrder = new Map(
        [
            'feed',
            'friends-locations',
            'game-log',
            'player-list',
            'search',
            'dashboard',
            'favorite-friends',
            'favorite-worlds',
            'favorite-avatars',
            'friend-log',
            'moderation',
            'notification',
            'my-avatars',
            'friend-list',
            'charts',
            'charts-instance',
            'charts-mutual',
            'charts-hot-worlds',
            'tools',
            'gallery',
            'screenshot-metadata',
            'settings'
        ].map((name, index) => [name, index])
    );

    const removeRouteTransitionHook = router.afterEach((to, from) => {
        const toOrder = routeOrder.get(String(to.name || ''));
        const fromOrder = routeOrder.get(String(from.name || ''));

        if (toOrder == null || fromOrder == null || toOrder === fromOrder) {
            routeTransitionName.value = 'vrcx-page-fade';
            return;
        }

        routeTransitionName.value = toOrder > fromOrder ? 'vrcx-page-down' : 'vrcx-page-up';
    });

    const getTransitionKey = (route) => String(route.meta?.transitionKey ?? route.fullPath);

    onUnmounted(() => {
        removeRouteTransitionHook();
    });
</script>
