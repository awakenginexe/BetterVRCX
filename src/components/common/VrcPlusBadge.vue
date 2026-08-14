<template>
    <TooltipWrapper :content="label" :side="side">
        <span
            :class="['bv-vrcplus-badge', size === 'md' ? 'bv-vrcplus-badge--md' : 'bv-vrcplus-badge--sm', props.class]"
            :aria-label="label"
            role="status">
            VRC+
        </span>
    </TooltipWrapper>
</template>

<script setup>
    import { computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { TooltipWrapper } from '@/components/ui/tooltip';

    const props = defineProps({
        size: {
            type: String,
            default: 'sm',
            validator: (value) => ['sm', 'md'].includes(value)
        },
        side: {
            type: String,
            default: 'top'
        },
        class: {
            type: [String, Object, Array],
            default: ''
        }
    });

    const { t, te } = useI18n();
    const label = computed(() =>
        typeof te === 'function' && te('dialog.user.info.vrcplus_supporter')
            ? t('dialog.user.info.vrcplus_supporter')
            : 'VRChat+ Supporter'
    );
</script>
