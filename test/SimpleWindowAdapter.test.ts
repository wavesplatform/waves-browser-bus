import { EventType, SimpleWindowAdapter } from '../src';
import { EventEmitter } from 'typed-ts-events';
import { mockWindow } from './mock/Win';


describe('SimpleWindowAdapter', () => {

    const addEventListener = window.addEventListener;
    const removeEventListener = window.removeEventListener;
    const postMessage = window.postMessage;
    const emitter = new EventEmitter<any>();

    beforeEach(() => {
        (window as any).origin = window.location.origin;
        emitter.off();
        window.addEventListener = (event: string, handler: any) => {
            emitter.on(event, handler);
        };
        window.removeEventListener = (event: string, handler: any) => {
            emitter.off(event, handler);
        };
        window.postMessage = (data: any, origin: string) => {
            emitter.trigger('message', { data, origin });
        };
    });

    afterAll(() => {
        window.addEventListener = addEventListener;
        window.removeEventListener = removeEventListener;
        window.postMessage = postMessage;
    });

    it('Create', () => {
        new SimpleWindowAdapter();
    });

    it('Add Listener', () => {
        const adapter = new SimpleWindowAdapter();
        let ok = false;

        adapter.addListener(() => {
            ok = true;
        });

        window.postMessage({ type: EventType.Event, name: 'test' }, window.origin);
        expect(ok).toBe(true);
    });

    it('Destroy', done => {
        const win = mockWindow();
        const adapter = new SimpleWindowAdapter(win);
        let listenerCount = 0;
        let sendCount = 0;

        win.onPostMessageRun.on(() => {
            sendCount++;
        });

        adapter.addListener(() => {
            listenerCount++;
        });


        window.postMessage({ type: EventType.Event, name: 'test' }, window.origin);
        adapter.send({ type: EventType.Event, data: '', name: 'test' });
        adapter.destroy();
        adapter.send({ type: EventType.Event, data: '', name: 'test' });
        window.postMessage({ type: EventType.Event, name: 'test' }, window.origin);

        expect(listenerCount).toBe(1);

        adapter.ready.then(() => {
            expect(sendCount).toBe(1);
            done();
        });
    });

});
