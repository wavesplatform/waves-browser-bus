import { WindowAdapter, EventType, IEventData } from '../src';
import { IMockWindow, mockWindow } from './mock/Win';


describe('Window adapter', () => {

    const eventData: IEventData = {
        type: EventType.Event,
        name: 'test',
        data: 'some data for event'
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

    it('send', () => {
        let wasEvent = false;

        dispatch.win.onPostMessageRun.once((message) => {
            wasEvent = true;
            expect(message.origin).toBe(dispatch.origin);
            expect(message.data).toBe(eventData);
        });
        const sendResult = adapter.send(eventData);

        expect(sendResult).toBe(adapter);
        expect(wasEvent).toBe(true);
    });

    it('listen with origin', () => {
        let count = 0;
        const data = ['test 1', 'test 2'];

        const addListenerResult = adapter.addListener((eventData) => {
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
