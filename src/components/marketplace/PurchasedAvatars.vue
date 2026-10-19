<template>
    <div class="flex min-h-0 flex-col gap-2 pt-2">
        <div class="flex items-center justify-between text-sm">
            <span>{{ t('profile_improvements.licensed_count', { count: filteredAvatars.length }) }}</span>
            <Button
                data-refresh-licensed
                variant="ghost"
                size="icon-sm"
                :disabled="loading"
                :aria-label="t('profile_improvements.refresh_licensed')"
                @click="refresh">
                <Spinner v-if="loading" />
                <RefreshCw v-else />
            </Button>
        </div>
        <p v-if="error" role="alert" class="text-sm text-destructive">{{ t('profile_improvements.licensed_error') }}</p>
        <div v-if="filteredAvatars.length" class="flex flex-wrap items-start overflow-auto">
            <button
                v-for="avatar in filteredAvatars"
                :key="avatar.id"
                data-licensed-avatar
                type="button"
                class="bv-entity-item-card flex w-[167px] items-center text-left text-[13px]"
                @click="showAvatarDialog(avatar.id)">
                <Avatar class="mr-2.5 size-9 flex-none">
                    <AvatarImage v-if="avatar.thumbnailImageUrl" :src="avatar.thumbnailImageUrl" class="object-cover" />
                    <AvatarFallback><Image class="size-4 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <span class="truncate font-medium" v-text="avatar.name || avatar.id"></span>
            </button>
        </div>
        <p v-else-if="!loading && !error" class="py-8 text-center text-sm text-muted-foreground">
            {{ t('profile_improvements.licensed_empty') }}
        </p>
    </div>
</template>

<script setup>
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { Image, RefreshCw } from 'lucide-vue-next';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Button } from '@/components/ui/button';
    import { Spinner } from '@/components/ui/spinner';
    import marketplaceRequest from '../../api/marketplace';
    import { showAvatarDialog } from '../../coordinators/avatarCoordinator';
    import { compareByCreatedAt, compareByName, compareByUpdatedAt } from '../../shared/utils/compare';

    const props = defineProps({
        searchQuery: { type: String, default: '' },
        sorting: { type: String, default: 'name' }
    });
    const { t } = useI18n();
    const avatars = ref([]);
    const loading = ref(false);
    const error = ref(false);
    let generation = 0;
    const filteredAvatars = computed(() => {
        const query = props.searchQuery.trim().toLowerCase();
        const comparator =
            props.sorting === 'update'
                ? compareByUpdatedAt
                : props.sorting === 'createdAt'
                  ? compareByCreatedAt
                  : compareByName;
        return avatars.value
            .filter((avatar) => !query || (avatar.name || '').toLowerCase().includes(query))
            .sort(comparator);
    });

    async function refresh() {
        const requestGeneration = ++generation;
        loading.value = true;
        error.value = false;
        const results = new Map();
        try {
            let offset = 0;
            while (requestGeneration === generation) {
                const { json } = await marketplaceRequest.getLicensedAvatars({ n: 100, offset });
                if (requestGeneration !== generation) return;
                if (!Array.isArray(json)) throw new Error('Invalid licensed avatar response');
                const previousSize = results.size;
                for (const avatar of json) {
                    if (typeof avatar?.id === 'string' && avatar.id.startsWith('avtr_')) results.set(avatar.id, avatar);
                }
                if (json.length < 100 || results.size === previousSize) break;
                offset += json.length;
            }
            if (requestGeneration === generation) avatars.value = Array.from(results.values());
        } catch {
            if (requestGeneration === generation) error.value = true;
        } finally {
            if (requestGeneration === generation) loading.value = false;
        }
    }

    onMounted(refresh);
    onBeforeUnmount(() => {
        generation++;
    });
</script>
