import { EventType, IEventData, WindowAdapter } from '../src';
import { IMockWindow, mockWindow } from './mock/Win';


describe('Window adapter', () => {

    const eventData: IEventData = {
        type: EventType.Event,
        name: 'test',
        data: 'some data for event',
        chanelId: undefined
    };

    let listen: ITestWinData;
    let dispatch: ITestWinData;
    let adapter: WindowAdapter;

    beforeEach(() => {
        listen = {
            win: mockWindow(),
            origin: 'https://listen-origin.com'
        };

        dispatch = {
            win: mockWindow(),
            origin: 'https://dispatch-origin.com'
        };

        adapter = new WindowAdapter(listen, dispatch);
    });

    describe('check connect by chanel id', () => {

        it('with same chain id', () => {

            let ok = false;

            adapter = new WindowAdapter(listen, dispatch, {
                chanelId: 1,
                availableDomains: ['*'],
                availableChanelId: [2]
            });

            adapter.addListener(event => {
                ok = event.type === EventType.Event && event.data === 1 && event.name === 'test';
            });

            listen.win.runEventListeners('message', {
                origin: 'https://some-origin.com',
                data: {
                    type: EventType.Event,
                    data: 1,
                    name: 'test'
                }
            });

            expect(ok).toBe(false);

            listen.win.runEventListeners('message', {
                origin: 'https://some-origin.com',
                data: {
                    type: EventType.Event,
                    data: 1,
                    name: 'test',
                    chanelId: 2
                }
            });

            expect(ok).toBe(true);
        });

    });

    it('all origin', () => {
        listen = {
            win: mockWindow(),
            origin: '*'
        };

        dispatch = {
            win: mockWindow(),
            origin: '*'
        };

        adapter = new WindowAdapter(listen, dispatch);

        let count = 0;

        adapter.addListener(() => {
            count++;
        });

        listen.win.runEventListeners('message', {
            origin: 'https://dispatch-origin.com',
            data: null
        });

        expect(count).toBe(1);

    });

    it('send', () => {
        let wasEvent = false;

        dispatch.win.onPostMessageRun.once(message => {
            wasEvent = true;
            expect(message.origin).toBe(dispatch.origin);
            expect(message.data).toEqual(eventData);
        });
        const sendResult = adapter.send(eventData);

        expect(sendResult).toBe(adapter);
        expect(wasEvent).toBe(true);
    });

    it('listen with origin', () => {
        let count = 0;
        const data = ['test 1', 'test 2'];

        const addListenerResult = adapter.addListener((eventData: any) => {
            if (eventData !== data[count]) {
                throw new Error('Wrong data in event!');
            }
            count++;
        });

        listen.win.runEventListeners('message', {
            origin: listen.origin,
            data: data[0]
        });

        listen.win.runEventListeners('message', {
            origin: dispatch.origin,
            data: data[1]
        });

        listen.win.runEventListeners('message', {
            origin: 'some-origin',
            data: {}
        });

        expect(addListenerResult).toBe(adapter);
        expect(count).toBe(2);
    });

    it('destroy', () => {
        let wasPostMessage = false;
        let wasListenEvent = false;

        dispatch.win.onPostMessageRun.once(() => {
            wasPostMessage = true;
        });

        adapter.addListener(() => {
            wasListenEvent = true;
        });

        const destroyResult = adapter.destroy();
        adapter.destroy();

        adapter.send(eventData);
        listen.win.runEventListeners('message', {
            origin: listen.origin,
            data: 'some data'
        });

        expect(destroyResult).toBe(undefined);
        expect(wasPostMessage).toBe(false);
        expect(wasListenEvent).toBe(false);
    });

});

interface ITestWinData {
    win: IMockWindow<any>;
    origin: string;
}
