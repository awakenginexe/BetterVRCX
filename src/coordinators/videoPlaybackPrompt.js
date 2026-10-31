import configRepository from '../services/config';
import { i18n } from '../plugins/i18n';
import { useModalStore } from '../stores/modal';

let prompted = false;

export async function checkYoutubeBotError(videoError) {
    if (prompted || !videoError.includes('Sign in to confirm')) return;
    prompted = true;
    if (await configRepository.getBool('VRCX_hideYoutubeBotErrorPrompt', false))
        return;
    const t = i18n.global.t;
    const { ok, checked } = await useModalStore().confirm({
        description: t('confirm.youtube_bot_error'),
        title: t('confirm.youtube_bot_error_title'),
        checkboxLabel: t('dialog.alertdialog.dont_show_again')
    });
    if (checked)
        await configRepository.setBool('VRCX_hideYoutubeBotErrorPrompt', true);
    if (ok) await AppApi.OpenSteamStorePage(4296960);
}
