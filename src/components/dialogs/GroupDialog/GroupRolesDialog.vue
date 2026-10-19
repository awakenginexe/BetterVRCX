<template>
    <Dialog v-model:open="open">
        <DialogContent class="w-full sm:max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader
                ><DialogTitle>{{ t('group_management.roles') }} · {{ group.name }}</DialogTitle></DialogHeader
            >
            <div class="flex gap-2">
                <Button variant="outline" size="sm" :disabled="loading" @click="reload">{{
                    t('group_management.refresh')
                }}</Button>
                <Button v-if="canManage" size="sm" :disabled="loading" @click="select()">{{
                    t('group_management.new_role')
                }}</Button>
            </div>
            <p v-if="error || validationError" role="alert" class="text-destructive text-sm">
                {{ t(validationError || error) }}
            </p>
            <p v-if="loading" role="status" class="text-sm text-muted-foreground">
                {{ t('group_management.loading') }}
            </p>
            <p v-else-if="!roles.length" class="text-sm text-muted-foreground">{{ t('group_management.no_roles') }}</p>
            <div class="grid grid-cols-[minmax(150px,1fr)_2fr] gap-4 overflow-auto min-h-0">
                <div class="space-y-2">
                    <div v-for="role in roles" :key="role.id" class="rounded-lg border p-2">
                        <Button
                            class="w-full justify-start truncate"
                            variant="ghost"
                            :disabled="loading"
                            @click="select(role)"
                            >{{ role.name }}</Button
                        >
                        <span v-if="group.myMember?.roleIds?.includes(role.id)" class="text-xs text-muted-foreground">{{
                            t('group_management.assigned')
                        }}</span>
                        <div v-if="canDelete(role)" class="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                :disabled="loading"
                                :aria-label="t('group_management.move_up')"
                                @click="run(() => move(role, -1))"
                                >↑</Button
                            >
                            <Button
                                size="sm"
                                variant="ghost"
                                :disabled="loading"
                                :aria-label="t('group_management.move_down')"
                                @click="run(() => move(role, 1))"
                                >↓</Button
                            >
                            <Button size="sm" variant="ghost" :disabled="loading" @click="deleteRole(role)">{{
                                t('group_management.delete')
                            }}</Button>
                        </div>
                    </div>
                </div>
                <div v-if="form" class="space-y-3">
                    <Field
                        ><FieldLabel>{{ t('group_management.name') }}</FieldLabel
                        ><InputGroupField v-model="form.name" :maxlength="64" :disabled="readOnly || form.defaultRole"
                    /></Field>
                    <Field
                        ><FieldLabel>{{ t('group_management.description') }}</FieldLabel
                        ><InputGroupTextareaField
                            v-model="form.description"
                            :maxlength="512"
                            :disabled="readOnly || form.defaultRole"
                    /></Field>
                    <template v-if="!form.defaultRole && !form.permissions?.includes('*')">
                        <label class="flex items-center gap-2"
                            ><Checkbox
                                v-model="form.isSelfAssignable"
                                :disabled="readOnly || form.requiresPurchase" />{{
                                t('group_management.self_assignable')
                            }}</label
                        >
                        <label class="flex items-center gap-2"
                            ><Checkbox v-model="form.isAddedOnJoin" :disabled="readOnly || form.requiresPurchase" />{{
                                t('group_management.added_on_join')
                            }}</label
                        >
                        <label class="flex items-center gap-2"
                            ><Checkbox
                                v-model="form.requiresPurchase"
                                :disabled="readOnly"
                                @update:model-value="purchaseChanged" />{{
                                t('group_management.requires_purchase')
                            }}</label
                        >
                        <label class="flex items-center gap-2"
                            ><Checkbox v-model="form.requiresTwoFactor" :disabled="readOnly" />{{
                                t('group_management.requires_two_factor')
                            }}</label
                        >
                    </template>
                    <p v-if="form.requiresPurchase" class="text-sm text-muted-foreground">
                        {{ t('group_management.purchase_restrictions') }}
                    </p>
                    <div v-if="!form.permissions?.includes('*')" class="space-y-2">
                        <p class="font-medium">{{ t('group_management.permissions') }}</p>
                        <label
                            v-for="permission in permissions"
                            :key="permission.name"
                            class="flex gap-2 text-sm"
                            :title="permission.help">
                            <Checkbox
                                :model-value="form.permissions.includes(permission.name)"
                                :disabled="
                                    readOnly ||
                                    !permission.allowedToAdd ||
                                    (form.requiresPurchase && permission.isManagementPermission)
                                "
                                @update:model-value="togglePermission(permission.name, $event)" />
                            {{ permission.displayName || permission.name }}
                        </label>
                        <p v-if="!permissions.length" class="text-sm text-muted-foreground">
                            {{ form.permissions.join(', ') || '—' }}
                        </p>
                    </div>
                    <div class="flex flex-wrap gap-2 pt-2">
                        <Button
                            v-if="selectedRole && canToggleSelf(selectedRole)"
                            variant="outline"
                            :disabled="loading"
                            @click="run(() => toggleSelf(selectedRole))"
                            >{{
                                t(
                                    group.myMember?.roleIds?.includes(selectedRole.id)
                                        ? 'group_management.remove_self'
                                        : 'group_management.add_self'
                                )
                            }}</Button
                        >
                        <Button v-if="!readOnly" :disabled="loading || !form.name?.trim()" @click="saveForm">{{
                            t('group_management.save')
                        }}</Button>
                    </div>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { computed, ref, toRef, watch } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { storeToRefs } from 'pinia';
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Field, FieldLabel } from '@/components/ui/field';
    import { InputGroupField, InputGroupTextareaField } from '@/components/ui/input-group';
    import { groupRequest } from '../../../api';
    import { useModalStore, useUserStore } from '../../../stores';
    import { useGroupRoles } from './useGroupRoles';

    const props = defineProps({ group: { type: Object, required: true } });
    const open = defineModel('open', { type: Boolean, default: false });
    const { t } = useI18n();
    const { currentUser } = storeToRefs(useUserStore());
    const modal = useModalStore();
    const {
        roles,
        permissions,
        loading,
        error,
        canManage,
        canEdit,
        canDelete,
        canToggleSelf,
        load,
        save,
        remove,
        move,
        toggleSelf
    } = useGroupRoles(
        toRef(props, 'group'),
        computed(() => currentUser.value.id),
        groupRequest
    );
    const form = ref(null);
    const validationError = ref('');
    const selectedRole = computed(() => roles.value.find((role) => role.id === form.value?.id));
    const readOnly = computed(
        () => loading.value || (selectedRole.value ? !canEdit(selectedRole.value) : !canManage.value)
    );
    function select(role) {
        validationError.value = '';
        form.value = role
            ? { ...role, permissions: [...(role.permissions || [])] }
            : {
                  name: '',
                  description: '',
                  permissions: [],
                  isSelfAssignable: false,
                  isAddedOnJoin: false,
                  requiresPurchase: false,
                  requiresTwoFactor: false
              };
    }
    async function run(action) {
        const id = props.group.id;
        validationError.value = '';
        try {
            await action();
        } catch (e) {
            if (id === props.group.id) validationError.value = e.message || String(e);
        }
    }
    async function reload() {
        form.value = null;
        await load();
    }
    async function saveForm() {
        await run(async () => {
            await save(form.value);
            form.value = null;
        });
    }
    async function deleteRole(role) {
        const id = props.group.id;
        const { ok } = await modal.confirm({
            title: t('confirm.title'),
            description: t('group_management.delete_role_confirm', { name: role.name }),
            destructive: true
        });
        if (ok && id === props.group.id)
            await run(async () => {
                await remove(role);
                form.value = null;
            });
    }
    function togglePermission(name, checked) {
        form.value.permissions = checked
            ? [...new Set([...form.value.permissions, name])]
            : form.value.permissions.filter((p) => p !== name);
    }
    function purchaseChanged(checked) {
        if (!checked) return;
        form.value.isSelfAssignable = false;
        form.value.isAddedOnJoin = false;
        form.value.permissions = form.value.permissions.filter(
            (name) => !permissions.value.some((p) => p.name === name && p.isManagementPermission)
        );
    }
    watch([open, () => props.group.id], ([visible]) => {
        form.value = null;
        if (visible) load();
    });
</script>
