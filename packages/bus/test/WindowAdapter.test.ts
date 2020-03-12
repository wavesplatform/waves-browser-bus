import { EventType, IEventData, TMessageContent, WindowAdapter } from '../src';
import { IMockWindow, mockWindow } from './mock/Win';
import { EventEmitter } from 'typed-ts-events';
import { WindowProtocol } from '../src/protocols/WindowProtocol';


describe('Window adapter', () => {

    const eventData: IEventData = {
        type: EventType.Event,
        name: 'test',
        data: 'some data for event',
        chanelId: undefined
    };

    let listen: Array<WindowProtocol<TMessageContent>>;
    let dispatch: Array<WindowProtocol<TMessageContent>>;
    let adapter: WindowAdapter;
    let listenWin: IMockWindow<TMessageContent> = mockWindow();
    let dispatchWin: IMockWindow<TMessageContent> = mockWindow();

    beforeEach(() => {
        listenWin = mockWindow();
        dispatchWin = mockWindow();
        listen = [new WindowProtocol(listenWin, WindowProtocol.PROTOCOL_TYPES.LISTEN)];
        dispatch = [new WindowProtocol(dispatchWin, WindowProtocol.PROTOCOL_TYPES.DISPATCH)];
        adapter = new WindowAdapter(listen, dispatch, {});
    });

    describe('check connect by chanel id', () => {

        it('with same chain id', () => {

            let ok = false;

            adapter = new WindowAdapter(listen, dispatch, {
                chanelId: 1,
                origins: ['*'],
                availableChanelId: [2]
            });

            adapter.addListener(event => {
                ok = event.type === EventType.Event && event.data === 1 && event.name === 'test';
            });

            listenWin.runEventListeners('message', {
                origin: 'https://some-origin.com',
                data: {
                    type: EventType.Event,
                    data: 1,
                    name: 'test'
                }
            });

            expect(ok).toBe(false);

            listenWin.runEventListeners('message', {
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
        listenWin = mockWindow();
        listen = [new WindowProtocol(listenWin, WindowProtocol.PROTOCOL_TYPES.LISTEN)];
        dispatch = [new WindowProtocol(mockWindow(), WindowProtocol.PROTOCOL_TYPES.DISPATCH)];
        adapter = new WindowAdapter(listen, dispatch, { origins: '*' });

        let count = 0;

        adapter.addListener(() => {
            count++;
        });

        listenWin.runEventListeners('message', {
            origin: 'https://dispatch-origin.com',
            data: { ...eventData }
        });

        expect(count).toBe(1);
    });

    it('Exception in handler', () => {
        let ok = false;

        adapter.addListener(() => {
            throw new Error('Some error');
        });
        adapter.addListener(() => {
            ok = true;
        });

        listenWin.runEventListeners('message', {
            origin: window.location.origin,
            data: { ...eventData }
        });
        expect(ok).toBe(true);
    });

    it('Wrong event format', () => {
        let ok = true;
        adapter.addListener(() => {
            ok = false;
        });

        listenWin.runEventListeners('message', {
            origin: window.location.origin,
            data: null
        });
        listenWin.runEventListeners('message', {
            origin: window.location.origin,
            data: {}
        });
        expect(ok).toBe(true);
    });

    it('send', () => {
        let wasEvent = false;

        dispatchWin.onPostMessageRun.once(message => {
            wasEvent = true;
            expect(message.data).toEqual(eventData);
        });
        const sendResult = adapter.send(eventData);

        expect(sendResult).toBe(adapter);
        expect(wasEvent).toBe(true);
    });

    it('listen with origin', () => {
        let count = 0;
        const data = [{ ...eventData, data: 'test 1' }, { ...eventData, data: 'test 2' }];

        const addListenerResult = adapter.addListener((eventData: any) => {
            if (eventData !== data[count]) {
                throw new Error('Wrong data in event!');
            }
            count++;
        });

        listenWin.runEventListeners('message', {
            origin: window.location.origin,
            data: data[0]
        });

        listenWin.runEventListeners('message', {
            origin: window.location.origin,
            data: data[1]
        });

        listenWin.runEventListeners('message', {
            origin: 'some-origin',
            data: eventData
        });

        expect(addListenerResult).toBe(adapter);
        expect(count).toBe(2);
    });

    it('destroy', () => {
        let wasPostMessage = false;
        let wasListenEvent = false;

        dispatchWin.onPostMessageRun.once(() => {
            wasPostMessage = true;
        });

        adapter.addListener(() => {
            wasListenEvent = true;
        });

        const destroyResult = adapter.destroy();
        adapter.destroy();

        adapter.send(eventData);
        listenWin.runEventListeners('message', {
            origin: 'listen.origin',
            data: 'some data'
        });

        expect(destroyResult).toBe(undefined);
        expect(wasPostMessage).toBe(false);
        expect(wasListenEvent).toBe(false);
    });

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

        it('Create', done => {
            WindowAdapter.createSimpleWindowAdapter()
                .then(() => {
                    done();
                });
        });

        it('Add Listener', done => {
            WindowAdapter.createSimpleWindowAdapter().then(adapter => {
                let ok = false;

                adapter.addListener(() => {
                    ok = true;
                });

                window.postMessage({ type: EventType.Event, name: 'test' }, window.origin);
                expect(ok).toBe(true);
                done();
            });
        });

        it('Destroy', done => {
            const win = mockWindow();
            (window as any).opener = win;

            WindowAdapter.createSimpleWindowAdapter()
                .then(adapter => {
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
                    expect(sendCount).toBe(1);
                    done();
                });
        });

    });

});
