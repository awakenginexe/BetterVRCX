import { avtrdb } from './avtrdb';
import { avtricu } from './avtricu';
import { vrcndb } from './vrcndb';

export const BUILTIN_PROVIDERS = [avtrdb, avtricu, vrcndb];
export const sourceLabel = (source) =>
    BUILTIN_PROVIDERS.find((p) => p.id === source)?.label || 'Custom provider';
