import { WindowAdapter } from '../src/WindowAdapter';


it('Create', () => {
    WindowAdapter.createByWindow(window, { childOrigin: location.origin });
});

// TODO add tests
