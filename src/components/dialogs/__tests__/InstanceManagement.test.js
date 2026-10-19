import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    prompt: vi.fn(),
    update: vi.fn(),
    groups: new Map(),
    plus: true
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../../stores', () => ({
    useUserStore: () => ({
        currentUser: { id: 'usr_me' },
        get isLocalUserVrcPlusSupporter() {
            return mocks.plus;
        }
    }),
    useGroupStore: () => ({
        cachedGroups: mocks.groups,
        currentUserGroups: new Map()
    }),
    useModalStore: () => ({ prompt: mocks.prompt })
}));
vi.mock('../../../api', () => ({
    instanceRequest: { updateInstance: mocks.update },
    queryRequest: { fetch: vi.fn() }
}));
vi.mock('../InstanceCalendarLinkDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../InstanceEventDetails.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('@/components/ui/button', () => ({
    Button: { template: '<button><slot /></button>' }
}));
import InstanceManagement from '../InstanceManagement.vue';

beforeEach(() => {
    mocks.plus = true;
    mocks.groups.clear();
    mocks.prompt.mockReset();
    mocks.update.mockReset().mockResolvedValue({});
});
const mountManagement = (
    instance = { ownerId: 'usr_me', displayName: 'Old' }
) => mount(InstanceManagement, { props: { instance, location: 'wrld_a:1' } });

it('renames an authorized personal instance and supports clearing its name', async () => {
    mocks.prompt.mockResolvedValue({ ok: true, value: '  ' });
    const wrapper = mountManagement();
    await wrapper
        .get('[aria-label="instance_improvements.rename"]')
        .trigger('click');
    await flushPromises();
    expect(mocks.update).toHaveBeenCalledWith({
        location: 'wrld_a:1',
        displayName: null
    });
});
it('hides rename for personal owners without VRC+', () => {
    mocks.plus = false;
    expect(
        mountManagement()
            .find('[aria-label="instance_improvements.rename"]')
            .exists()
    ).toBe(false);
});
it('does not rename a different instance after navigating during the prompt', async () => {
    let resolve;
    mocks.prompt.mockImplementation(
        () =>
            new Promise((done) => {
                resolve = done;
            })
    );
    const wrapper = mountManagement();
    await wrapper
        .get('[aria-label="instance_improvements.rename"]')
        .trigger('click');
    await wrapper.setProps({ location: 'wrld_b:2' });
    resolve({ ok: true, value: 'New' });
    await flushPromises();
    expect(mocks.update).not.toHaveBeenCalled();
});
it('requires both manage and calendar-link permission for linking', () => {
    mocks.groups.set('grp_a', {
        myMember: { permissions: ['group-instance-manage'] }
    });
    const wrapper = mountManagement({ ownerId: 'grp_a' });
    expect(
        wrapper.find('[aria-label="instance_improvements.link_event"]').exists()
    ).toBe(false);
    wrapper.unmount();
    mocks.groups.set('grp_a', {
        myMember: {
            permissions: [
                'group-instance-manage',
                'group-instance-calendar-link'
            ]
        }
    });
    expect(
        mountManagement({ ownerId: 'grp_a' })
            .find('[aria-label="instance_improvements.link_event"]')
            .exists()
    ).toBe(true);
});
