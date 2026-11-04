import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, defineStore, setActivePinia } from 'pinia';
import { reactive, ref } from 'vue';
const mocks = vi.hoisted(() => ({ refresh: vi.fn(), transactions: vi.fn() }));
const user = reactive({ currentUser: { id: 'usr_a' } });
const state = reactive({ isLoggedIn: true });
const useFakeEconomy = defineStore('HistoryEconomy', () => ({
    purchases: ref([]),
    refreshPurchases: mocks.refresh
}));
vi.mock('../../../../stores/economy', () => ({
    useEconomyStore: () => useFakeEconomy()
}));
vi.mock('../../../../stores/user', () => ({ useUserStore: () => user }));
vi.mock('../../../../services/watchState', () => ({ watchState: state }));
vi.mock('../../../../api/marketplace', () => ({
    default: { getEconomyTransactions: mocks.transactions }
}));
vi.mock('../../../../services/appConfig', () => ({ AppDebug: {} }));
vi.mock('../../../../shared/utils', () => ({
    commaNumber: String,
    formatDateFilter: String,
    replaceBioSymbols: (value) => value || ''
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('@/components/ui/dialog', () => {
    const component = { template: '<div><slot /></div>' };
    return {
        Dialog: component,
        DialogContent: component,
        DialogHeader: component,
        DialogTitle: component
    };
});
vi.mock('@/components/ui/tabs', () => {
    const component = { template: '<div><slot /></div>' };
    return {
        Tabs: component,
        TabsContent: component,
        TabsList: component,
        TabsTrigger: component
    };
});
const { default: PurchaseHistoryDialog } =
    await import('../PurchaseHistoryDialog.vue');

const wrapperFor = () =>
    mount(PurchaseHistoryDialog, {
        global: {
            stubs: {
                Dialog: { template: '<div><slot /></div>' },
                DialogContent: { template: '<div><slot /></div>' },
                Tabs: { template: '<div><slot /></div>' },
                TabsContent: { template: '<div><slot /></div>' }
            }
        }
    });

describe('purchase and credit history dialog', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        user.currentUser.id = 'usr_a';
        state.isLoggedIn = true;
        mocks.refresh.mockResolvedValue();
    });
    it('refreshes purchases on open and binds transaction history to the current account', async () => {
        mocks.transactions.mockResolvedValue({
            json: {
                transactions: [
                    {
                        transactionLineId: 'line',
                        listingDisplayName: 'Credits',
                        amount: 100,
                        balance: 200
                    }
                ]
            }
        });
        const wrapper = wrapperFor();
        await wrapper.setProps({ visible: true });
        await flushPromises();
        expect(mocks.refresh).toHaveBeenCalledTimes(1);
        wrapper.vm.activeTab = 'transactions';
        await flushPromises();
        expect(mocks.transactions).toHaveBeenCalledWith({
            userId: 'usr_a',
            n: 100
        });
        expect(wrapper.text()).toContain('Credits');
        expect(wrapper.text()).toContain('100V');
        wrapper.unmount();
    });

    it('discards transaction results arriving after logout', async () => {
        let finish;
        mocks.transactions.mockReturnValue(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        const wrapper = wrapperFor();
        await wrapper.setProps({ visible: true });
        wrapper.vm.activeTab = 'transactions';
        await flushPromises();
        state.isLoggedIn = false;
        await flushPromises();
        finish({
            json: {
                transactions: [
                    {
                        transactionLineId: 'late',
                        listingDisplayName: 'Private old account transaction'
                    }
                ]
            }
        });
        await flushPromises();
        expect(wrapper.text()).not.toContain('Private old account transaction');
        wrapper.unmount();
    });
});
