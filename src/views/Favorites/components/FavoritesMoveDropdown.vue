<template>
    <DropdownMenu class="favorites-move-dropdown" v-model:open="moveDropdownOpen">
        <DropdownMenuTrigger as-child>
            <Button class="rounded-full w-6 h-6 text-xs" size="icon-sm" variant="ghost"
                ><ArrowLeft class="h-4 w-4"
            /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="favorites-move-menu" :aria-label="t(tooltipKey)">
            <span class="favorites-move-menu__heading">{{ t(tooltipKey) }}</span>
            <DropdownMenuSeparator />
            <template v-for="groupAPI in favoriteGroupList" :key="groupAPI.name">
                <DropdownMenuItem
                    v-if="isLocalFavorite || groupAPI.name !== currentGroup?.name"
                    class="favorites-move-menu__destination"
                    :class="{ 'favorites-move-menu__destination--full': groupAPI.count >= groupAPI.capacity }"
                    :disabled="groupAPI.count >= groupAPI.capacity"
                    @click="handleDropdownItemClick(groupAPI)">
                    <span>{{ groupAPI.displayName }}</span>
                    <span class="favorites-move-menu__capacity">{{ groupAPI.count }} / {{ groupAPI.capacity }}</span>
                </DropdownMenuItem>
            </template>
        </DropdownMenuContent>
    </DropdownMenu>
</template>

<script setup>
    import { computed, ref } from 'vue';
    import { ArrowLeft } from 'lucide-vue-next';
    import { Button } from '@/components/ui/button';
    import { toast } from 'vue-sonner';
    import { useI18n } from 'vue-i18n';

    import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger
    } from '../../../components/ui/dropdown-menu';
    import { favoriteRequest } from '../../../api';

    const { t } = useI18n();

    const props = defineProps({
        favoriteGroup: {
            type: [Array, Object],
            required: true
        },
        currentGroup: {
            type: [Object, String],
            required: false
        },
        currentFavorite: {
            type: Object,
            required: true
        },
        isLocalFavorite: {
            type: Boolean,
            required: false
        },
        type: {
            type: String,
            required: true
        }
    });

    const tooltipKey = computed(() =>
        props.isLocalFavorite ? 'view.favorite.copy_tooltip' : 'view.favorite.move_tooltip'
    );
    const favoriteGroupList = computed(() => {
        const rawGroup = props.favoriteGroup;
        const source = Array.isArray(rawGroup) ? rawGroup : Array.isArray(rawGroup?.value) ? rawGroup.value : [];
        return source.filter((entry) => entry && typeof entry === 'object' && typeof entry.name === 'string');
    });
    const moveDropdownOpen = ref(false);

    /**
     *
     * @param groupAPI
     */
    function handleDropdownItemClick(groupAPI) {
        moveDropdownOpen.value = false;
        if (props.isLocalFavorite) {
            if (props.type === 'world') {
                addFavoriteWorld(groupAPI);
            } else if (props.type === 'avatar') {
                addFavoriteAvatar(groupAPI);
            }
        } else {
            moveFavorite(props.currentFavorite.ref, groupAPI);
        }
    }

    /**
     *
     * @param ref
     * @param group
     */
    async function moveFavorite(ref, group) {
        await favoriteRequest.deleteFavorite({ objectId: ref.id });
        return favoriteRequest.addFavorite({
            type: group.type,
            favoriteId: ref.id,
            tags: group.name
        });
    }

    /**
     *
     * @param groupAPI
     */
    function addFavoriteAvatar(groupAPI) {
        return favoriteRequest
            .addFavorite({
                type: groupAPI.type,
                favoriteId: props.currentFavorite.id,
                tags: groupAPI.name
            })
            .then((args) => {
                toast.success('Avatar added to favorites');
                return args;
            });
    }

    /**
     *
     * @param groupAPI
     */
    function addFavoriteWorld(groupAPI) {
        return favoriteRequest
            .addFavorite({
                type: groupAPI.type,
                favoriteId: props.currentFavorite.id,
                tags: groupAPI.name
            })
            .then((args) => {
                toast.success('World added to favorites');
                return args;
            });
    }
</script>

<style scoped>
    .favorites-move-dropdown {
        margin-left: 0.375rem;
    }

    .favorites-move-menu {
        min-width: 15rem;
        padding: 0.5rem;
    }

    .favorites-move-menu__heading {
        display: block;
        padding: 0.25rem 0.5rem 0.5rem;
        color: var(--muted-foreground);
        font-size: 0.75rem;
        font-weight: 650;
    }

    .favorites-move-menu__destination {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin: 0.125rem 0;
    }

    .favorites-move-menu__capacity {
        color: var(--muted-foreground);
        font-variant-numeric: tabular-nums;
    }

    .favorites-move-menu__destination--full .favorites-move-menu__capacity {
        color: var(--destructive);
    }
</style>
