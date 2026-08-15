import { computed, reactive, ref } from 'vue';

const STORAGE_KEY = 'BetterVRCX_homeBackgroundConfig';

export const defaultPresets = [
    'https://assets.vrchat.com/www/brand/vrchat-logo-white.png',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80'
];

function loadSavedConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return {
                    mode: parsed.mode || 'vrchat_photos',
                    presetIndex: parsed.presetIndex ?? 1,
                    customPath: parsed.customPath || '',
                    vrchatPhotosFolder: parsed.vrchatPhotosFolder || '',
                    dimOpacity: parsed.dimOpacity ?? 50,
                    blur: parsed.blur ?? 0,
                    fit: parsed.fit || 'cover',
                    positionY: parsed.positionY ?? 50
                };
            }
        }
    } catch {
        // ignore
    }
    return {
        mode: 'vrchat_photos', // default to vrchat_photos!
        presetIndex: 1,
        customPath: '',
        vrchatPhotosFolder: '',
        dimOpacity: 50,
        blur: 0,
        fit: 'cover',
        positionY: 50
    };
}

export const homeBackgroundState = reactive(loadSavedConfig());
export const activePhotoUrl = ref('');

export function saveHomeBackgroundConfig() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(homeBackgroundState));
    } catch {
        // ignore
    }
}

export function formatLocalPath(filePath) {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
        return filePath;
    }
    let clean = filePath.replace(/\\/g, '/');
    if (!clean.startsWith('file:///')) {
        if (clean.startsWith('/')) {
            clean = 'file://' + clean;
        } else {
            clean = 'file:///' + clean;
        }
    }
    return encodeURI(clean).replace(/#/g, '%23').replace(/\?/g, '%3F');
}

export function useHomeBackground() {
    async function initPhotosLocation() {
        if (!homeBackgroundState.vrchatPhotosFolder && typeof AppApi !== 'undefined' && AppApi?.GetVRChatPhotosLocation) {
            try {
                const loc = await AppApi.GetVRChatPhotosLocation();
                if (loc) {
                    homeBackgroundState.vrchatPhotosFolder = loc;
                    saveHomeBackgroundConfig();
                }
            } catch {
                // ignore
            }
        }
    }

    async function fetchRandomVRChatPhoto() {
        if (typeof AppApi === 'undefined') return null;

        try {
            // First check if search function returns photos from all subdirectories
            if (AppApi.FindScreenshotsBySearch) {
                const resultJson = await AppApi.FindScreenshotsBySearch('', 0);
                if (resultJson) {
                    const photos = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
                    if (Array.isArray(photos) && photos.length > 0) {
                        const randomItem = photos[Math.floor(Math.random() * photos.length)];
                        if (randomItem) {
                            activePhotoUrl.value = formatLocalPath(randomItem);
                            return activePhotoUrl.value;
                        }
                    }
                }
            }

            // Fallback to GetLastScreenshot
            if (AppApi.GetLastScreenshot) {
                const last = await AppApi.GetLastScreenshot();
                if (last) {
                    activePhotoUrl.value = formatLocalPath(last);
                    return activePhotoUrl.value;
                }
            }
        } catch (err) {
            console.warn('Failed to fetch random VRChat photo:', err);
        }
        return null;
    }

    const currentBackgroundUrl = computed(() => {
        if (homeBackgroundState.mode === 'custom' && homeBackgroundState.customPath) {
            return formatLocalPath(homeBackgroundState.customPath);
        }
        if (homeBackgroundState.mode === 'vrchat_photos') {
            if (activePhotoUrl.value) {
                return activePhotoUrl.value;
            }
            if (homeBackgroundState.customPath) {
                return formatLocalPath(homeBackgroundState.customPath);
            }
            const index = homeBackgroundState.presetIndex ?? 1;
            return defaultPresets[index] || defaultPresets[1];
        }
        const index = homeBackgroundState.presetIndex ?? 1;
        return defaultPresets[index] || defaultPresets[1];
    });

    const backgroundStyle = computed(() => {
        const url = currentBackgroundUrl.value;
        const pos = homeBackgroundState.positionY ?? 50;
        // Allows vertical panning across all aspect ratios
        const translateY = (50 - pos) * 0.4;
        return {
            backgroundImage: url ? `url("${url}")` : 'none',
            backgroundSize: homeBackgroundState.fit || 'cover',
            backgroundPosition: `center ${pos}%`,
            transform: `scale(1.3) translateY(${translateY}%)`,
            transformOrigin: 'center center',
            filter: homeBackgroundState.blur > 0 ? `blur(${homeBackgroundState.blur}px)` : 'none'
        };
    });

    const overlayStyle = computed(() => {
        const opacity = (homeBackgroundState.dimOpacity ?? 50) / 100;
        return {
            backgroundColor: `rgba(10, 12, 18, ${opacity})`
        };
    });

    async function pickSpecificPhoto() {
        let path = null;
        if (typeof window !== 'undefined' && window.electron?.openFileDialog) {
            try {
                path = await window.electron.openFileDialog();
            } catch (err) {
                console.error('Failed to select file via electron:', err);
            }
        } else if (typeof AppApi !== 'undefined' && AppApi?.OpenFileSelectorDialog) {
            try {
                const initialDir =
                    homeBackgroundState.vrchatPhotosFolder || (await AppApi.GetVRChatPhotosLocation?.()) || '';
                path = await AppApi.OpenFileSelectorDialog(
                    initialDir,
                    '.png',
                    'Image Files (*.png;*.jpg;*.jpeg;*.webp)|*.png;*.jpg;*.jpeg;*.webp|All Files (*.*)|*.*'
                );
            } catch (err) {
                console.error('Failed to select file via AppApi:', err);
            }
        }

        if (path) {
            activePhotoUrl.value = formatLocalPath(path);
            homeBackgroundState.customPath = path;
            saveHomeBackgroundConfig();
            return path;
        }
        return null;
    }

    async function pickCustomImage() {
        let path = null;
        if (typeof window !== 'undefined' && window.electron?.openFileDialog) {
            try {
                path = await window.electron.openFileDialog();
            } catch (err) {
                console.error('Failed to select file via electron:', err);
            }
        } else if (typeof AppApi !== 'undefined' && AppApi?.OpenFileSelectorDialog) {
            try {
                const initialDir =
                    homeBackgroundState.vrchatPhotosFolder || (await AppApi.GetVRChatPhotosLocation?.()) || '';
                path = await AppApi.OpenFileSelectorDialog(
                    initialDir,
                    '.png',
                    'Image Files (*.png;*.jpg;*.jpeg;*.webp)|*.png;*.jpg;*.jpeg;*.webp|All Files (*.*)|*.*'
                );
            } catch (err) {
                console.error('Failed to select file via AppApi:', err);
            }
        }

        if (path) {
            homeBackgroundState.customPath = path;
            homeBackgroundState.mode = 'custom';
            activePhotoUrl.value = formatLocalPath(path);
            saveHomeBackgroundConfig();
            return path;
        }
        return null;
    }

    async function pickPhotosFolder() {
        let folder = null;
        if (typeof window !== 'undefined' && window.electron?.openDirectoryDialog) {
            try {
                folder = await window.electron.openDirectoryDialog();
            } catch (err) {
                console.error('Failed to select folder via electron:', err);
            }
        } else if (typeof AppApi !== 'undefined' && AppApi?.OpenFolderSelectorDialog) {
            try {
                folder = await AppApi.OpenFolderSelectorDialog(
                    homeBackgroundState.vrchatPhotosFolder || ''
                );
            } catch (err) {
                console.error('Failed to select folder via AppApi:', err);
            }
        }

        if (folder) {
            homeBackgroundState.vrchatPhotosFolder = folder;
            saveHomeBackgroundConfig();
            await fetchRandomVRChatPhoto();
            return folder;
        }
        return null;
    }

    return {
        state: homeBackgroundState,
        activePhotoUrl,
        defaultPresets,
        currentBackgroundUrl,
        backgroundStyle,
        overlayStyle,
        saveHomeBackgroundConfig,
        initPhotosLocation,
        fetchRandomVRChatPhoto,
        pickSpecificPhoto,
        pickCustomImage,
        pickPhotosFolder
    };
}
