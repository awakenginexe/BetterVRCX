<template>
    <div ref="container" class="h-full w-full bg-muted/30">
        <img v-if="source" :src="source" :alt="alt" class="h-full w-full object-cover" loading="lazy" />
        <div v-else class="flex h-full items-center justify-center text-muted-foreground" aria-hidden="true">
            <i class="ri-image-line text-3xl" />
        </div>
    </div>
</template>

<script setup>
    import { onMounted, onUnmounted, ref, watch } from 'vue';

    const props = defineProps({ path: { type: String, required: true }, alt: { type: String, default: '' } });
    const container = ref(null);
    const source = ref('');
    let observer;
    let generation = 0;

    async function load() {
        const current = ++generation;
        try {
            const result = await AppApi.GetLocalPhotoThumbnail(props.path, 256);
            if (current === generation) source.value = result || '';
        } catch {
            if (current === generation) source.value = '';
        }
    }

    function observe() {
        observer?.disconnect();
        if (typeof IntersectionObserver === 'undefined') {
            load();
            return;
        }
        observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    observer.disconnect();
                    load();
                }
            },
            { rootMargin: '200px' }
        );
        if (container.value) observer.observe(container.value);
    }

    watch(
        () => props.path,
        () => {
            generation++;
            source.value = '';
            observe();
        }
    );
    onMounted(observe);
    onUnmounted(() => {
        generation++;
        observer?.disconnect();
    });
</script>
