import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    calendar: vi.fn(),
    update: vi.fn(),
    groups: new Map()
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../../api', () => ({
    groupRequest: { getGroupCalendar: mocks.calendar },
    instanceRequest: { updateInstance: mocks.update }
}));
vi.mock('../../../stores', () => ({
    useUserStore: () => ({ currentUser: { id: 'usr_me' } }),
    useGroupStore: () => ({ cachedGroups: mocks.groups })
}));
vi.mock('../InstanceEventDetails.vue', () => ({
    default: { props: ['event'], template: '<div>{{ event.title }}</div>' }
}));
vi.mock('@/components/ui/dialog', () => ({
    Dialog: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
    DialogContent: { template: '<div><slot /></div>' },
    DialogFooter: { template: '<div><slot /></div>' },
    DialogHeader: { template: '<div><slot /></div>' },
    DialogTitle: { template: '<div><slot /></div>' }
}));
vi.mock('@/components/ui/select', () => ({
    Select: { template: '<div><slot /></div>' },
    SelectTrigger: { template: '<div><slot /></div>' },
    SelectValue: { template: '<span />' },
    SelectContent: { template: '<div><slot /></div>' },
    SelectItem: { template: '<div><slot /></div>' }
}));
import InstanceCalendarLinkDialog from '../InstanceCalendarLinkDialog.vue';

const event = () => ({
    id: 'cal_test',
    title: 'Current event',
    startsAt: new Date(Date.now() - 3600000).toISOString(),
    endsAt: new Date(Date.now() + 3600000).toISOString()
});
const create = (instance = { ownerId: 'grp_a' }) =>
    mount(InstanceCalendarLinkDialog, {
        props: { open: true, location: 'wrld_a:1', instance }
    });
beforeEach(() => {
    vi.clearAllMocks();
    mocks.groups.clear();
    mocks.groups.set('grp_a', {
        myMember: {
            permissions: [
                'group-instance-manage',
                'group-instance-calendar-link'
            ]
        }
    });
    mocks.calendar.mockResolvedValue({ json: { results: [event()] } });
    mocks.update.mockResolvedValue({});
});

test('links the selected calendar event with the exact instance scope', async () => {
    const wrapper = create();
    await flushPromises();
    await wrapper
        .findAll('button')
        .find((button) => button.text() === 'instance_improvements.link_event')
        .trigger('click');
    await flushPromises();
    expect(mocks.update).toHaveBeenCalledWith({
        location: 'wrld_a:1',
        calendarEntryId: 'cal_test'
    });
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
});

test('unlinks using an explicit null rather than an empty event identifier', async () => {
    const wrapper = create({
        ownerId: 'grp_a',
        calendarEntryId: 'cal_current'
    });
    await flushPromises();
    await wrapper
        .findAll('button')
        .find(
            (button) => button.text() === 'instance_improvements.unlink_event'
        )
        .trigger('click');
    expect(mocks.update).toHaveBeenCalledWith({
        location: 'wrld_a:1',
        calendarEntryId: null
    });
});

test('does not load or save events without both permissions', async () => {
    mocks.groups.set('grp_a', {
        myMember: { permissions: ['group-instance-manage'] }
    });
    const wrapper = create();
    await flushPromises();
    const save = wrapper
        .findAll('button')
        .find((button) => button.text() === 'instance_improvements.link_event');
    expect(save.attributes('disabled')).toBeDefined();
    await save.trigger('click');
    expect(mocks.calendar).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
});

test('ignores calendar responses received after closing or changing instance', async () => {
    let resolve;
    mocks.calendar.mockReturnValueOnce(
        new Promise((done) => {
            resolve = done;
        })
    );
    const wrapper = create();
    await wrapper.setProps({ open: false, location: 'wrld_a:2' });
    resolve({ json: { results: [{ ...event(), title: 'Stale event' }] } });
    await flushPromises();
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.text()).not.toContain('Stale event');
});
