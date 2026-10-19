function registerSystemTheme(ipcMain, nativeTheme, getWindow) {
    function publishTheme() {
        const targetWindow = getWindow();
        if (
            nativeTheme.themeSource === 'system' &&
            targetWindow &&
            !targetWindow.isDestroyed()
        ) {
            targetWindow.webContents.send(
                'systemThemeChanged',
                nativeTheme.shouldUseDarkColors
            );
        }
    }

    ipcMain.handle('app:setThemeSource', (_event, source) => {
        if (!['system', 'light', 'dark'].includes(source)) return;
        nativeTheme.themeSource = source;
        publishTheme();
        return nativeTheme.shouldUseDarkColors;
    });
    nativeTheme.on('updated', publishTheme);
    return () => {
        nativeTheme.removeListener('updated', publishTheme);
        ipcMain.removeHandler('app:setThemeSource');
    };
}

module.exports = { registerSystemTheme };
