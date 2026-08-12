import { describe, expect, it } from 'vitest';

import ResizablePanel from '../ResizablePanel.vue';

describe('ResizablePanel', () => {
    it('restricts sizeUnit to the units supported by Reka SplitterPanel', () => {
        const validateSizeUnit = ResizablePanel.props.sizeUnit.validator;

        expect(validateSizeUnit('%')).toBe(true);
        expect(validateSizeUnit('px')).toBe(true);
        expect(validateSizeUnit('rem')).toBe(false);
    });
});
