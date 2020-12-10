import { Bus, EventType, TMessageContent, console, config } from '../src';
import { MockAdapter } from './mock/MockAdapter';
import { Signal } from 'ts-utils';


describe('Bus', () => {

    let adapter: MockAdapter;
    let bus: Bus;

    beforeEach(() => {
        config.console.logLevel = config.console.LOG_LEVEL.PRODUCTION;
        adapter = new MockAdapter();
        bus = new Bus(adapter);
    });

    it('destroy', () => {
        let counter = 0;
        adapter.destroy = () => {
            counter++;
        };
        bus.destroy();
        expect(counter).toBe(1);
    });

    it('bus id is unique', () => {
        const first = new Bus(new MockAdapter());
        const second = new Bus(new MockAdapter());

        expect(first.id).not.toBe(second.id);
    });

    it('bus dispatch event', () => {
        const adapter = new MockAdapter();
        const bus = new Bus(adapter);
        const eventName = 'test';
        const eventData = { some: true };
        let wasCall = 0;

        adapter.onSend.once((eventData: TMessageContent) => {

            if (eventData.type !== EventType.Event) {
                throw new Error('Wrong event type!');
            }

            expect(eventData.type).toBe(EventType.Event);
            expect(eventData.name).toBe(eventName);
            expect(eventData.data).toBe(undefined);
            wasCall++;
        });

        bus.dispatchEvent(eventName, void 0);

        adapter.onSend.once((event: TMessageContent) => {
            if (event.type !== EventType.Event) {
                throw new Error('Wrong event type!');
            }
            wasCall++;
            expect(event.data).toBe(eventData);
        });

        bus.dispatchEvent(eventName, eventData);

        expect(wasCall).toBe(2);
    });

    describe('console', () => {

        const consoleModule = (function (root: { console: Console }) {
            return root.console;
        })(self || global);

        const originError = consoleModule.error;
        const originInfo = consoleModule.info;

        let info: Signal<Array<any>>;
        let error: Signal<Array<any>>;

        beforeEach(() => {
            info = new Signal<Array<any>>();
            error = new Signal<Array<any>>();
            consoleModule.info = (...args: Array<any>) => {
                info.dispatch(args);
            };
            consoleModule.error = (...args: Array<any>) => {
                error.dispatch(args);
            };
        });

        it('Check production level', done => {

            let counter = 0;
            info.on(() => {
                counter++;
            });
            error.on(() => {
                counter++;
            });

            new MockAdapter();
            new Bus(adapter).request('some', null, 10)
                .catch(() => {
                    expect(counter).toBe(0);
                    const message = console.getSavedMessages('error');
                    const info = console.getSavedMessages('info');
                    expect(info).toHaveLength(0);
                    expect(String(message[0][0])).toBe('Error: Timeout error for request with name "some" and timeout 10!');
                    done();
                });
        });

        it('Check errors level', done => {

            config.console.logLevel = config.console.LOG_LEVEL.ERRORS;
            let counter = 0;
            info.on(() => {
                counter++;
            });
            error.on(e => {
                expect(String(e)).toBe('Error: Timeout error for request with name "some" and timeout 10!');
                counter++;
            });

            new MockAdapter();
            new Bus(adapter).request('some', null, 10)
                .catch(() => {
                    expect(counter).toBe(1);
                    done();
                });
        });

        it('Check verbose level', done => {

            config.console.logLevel = config.console.LOG_LEVEL.VERBOSE;
            let counter = 0;
            info.on(() => {
                counter++;
            });
            error.on(e => {
                expect(String(e)).toBe('Error: Timeout error for request with name "some" and timeout 10!');
                counter++;
            });

            new MockAdapter();
            new Bus(adapter).request('some', null, 10)
                .catch(() => {
                    expect(counter).toBe(3);
                    done();
                });
        });

        afterAll(() => {
            consoleModule.error = originError;
            consoleModule.info = originInfo;
        });

    });

    it('change adapter', () => {
        let count = 0;

        bus.once('some-event', () => {
            count++;
        });

        bus.on('some-event', () => {
            count++;
        });

        bus.registerRequestHandler('some-request', () => {
            count++;
        });

        const newAdapter = new MockAdapter();
        bus.changeAdapter(newAdapter);

        newAdapter.dispatchAdapterEvent({ name: 'some-request', id: 0, type: EventType.Action });
        newAdapter.dispatchAdapterEvent({ name: 'some-event', type: EventType.Event });

        expect(count).toBe(3);
    });

    describe('event emitter', () => {
        const event = {
            type: EventType.Event,
            name: 'test-event',
            data: { someData: true }
        };

        it('on', () => {
            let count = 0;

            bus.on(event.name, function (data) {
                count++;
                expect(data).toBe(event.data);
            });

            bus.on(event.name, function (data) {
                count++;
                expect(data).toBe(event.data);
            });

            adapter.dispatchAdapterEvent(event as any);
            adapter.dispatchAdapterEvent({ ...event, name: 'new' } as any);
            adapter.dispatchAdapterEvent(event as any);

            expect(count).toBe(4);
        });

        it('once', () => {
            let count = 0;

            bus.once(event.name, function (data) {
                count++;
                expect(data).toBe(event.data);
            });

            adapter.dispatchAdapterEvent(event as any);
            adapter.dispatchAdapterEvent({ ...event, name: 'new' } as any);
            adapter.dispatchAdapterEvent(event as any);

            expect(count).toBe(1);
        });

        it('off', () => {
            let count = 0;

            const handlers = [() => count++, () => count++];

            handlers.forEach((handler) => {
                bus.on(event.name, handler);
            });
            bus.off(event.name, handlers[0]).off('some-event');

            adapter.dispatchAdapterEvent(event as any);
            expect(count).toBe(1);

            bus.off();

            adapter.dispatchAdapterEvent(event as any);
            expect(count).toBe(1);
        });

        it('should call second handler', () => {
            let count = 0;
            const eventName = 'some-event';
            [
                () => {
                    throw new Error('Some error!');
                },
                () => count++
            ].forEach(f => {
                bus.on(eventName, f);
            });

            adapter.dispatchAdapterEvent({
                name: eventName,
                type: EventType.Event
            });

            expect(count).toBe(1);
        });

    });

    describe('request api', () => {

        it('timeout error', (done) => {
            const adapter = new MockAdapter();
            const bus = new Bus(adapter, 50);

            bus.request('some-event').catch((e) => {
                expect(e.message).toBe('Timeout error for request with name "some-event" and timeout 50!');
                done();
            });
        });

        it('response without request', () => {
            adapter.dispatchAdapterEvent({
                type: EventType.Response,
                id: 'some'
            } as any);
        });

        it('request', (done) => {
            const requestData = {
                count: 0,
                name: 'getRequestCount',
                handler: (c: number) => {
                    requestData.count++;
                    return requestData.count + c;
                }
            };

            const secondAdapter = new MockAdapter();
            const secondBus = new Bus(secondAdapter);

            secondBus.registerRequestHandler(requestData.name, requestData.handler);

            adapter.onSend.once((data) => {
                secondAdapter.onSend.once(d => adapter.dispatchAdapterEvent(d));
                secondAdapter.dispatchAdapterEvent(data);
            });

            bus.request(requestData.name, 10, 100)
                .then((r) => {
                    expect(r).toBe(11);
                    done();
                });
        });

        it('request async', (done) => {
            const requestData = {
                count: 0,
                name: 'getRequestCount',
                handler: (c: number) => {
                    requestData.count++;
                    return Promise.resolve(requestData.count + c);
                }
            };

            const secondAdapter = new MockAdapter();
            const secondBus = new Bus(secondAdapter);

            secondBus.registerRequestHandler(requestData.name, requestData.handler);

            adapter.onSend.once((data) => {
                secondAdapter.onSend.once(d => adapter.dispatchAdapterEvent(d));
                secondAdapter.dispatchAdapterEvent(data);
            });

            bus.request(requestData.name, 10, 100)
                .then((r) => {
                    expect(r).toBe(11);

                    secondBus.unregisterHandler(requestData.name);

                    bus.request(requestData.name, 10, 100).catch(() => {
                        done();
                    });
                });
        });

        it('has no handler for request', done => {
            const requestData = {
                name: 'getRequestCount',
                handler: () => null
            };

            const secondAdapter = new MockAdapter();
            new Bus(secondAdapter);

            adapter.onSend.once((data) => {
                secondAdapter.onSend.once(d => adapter.dispatchAdapterEvent(d));
                secondAdapter.dispatchAdapterEvent(data);
            });

            bus.request(requestData.name, null, 100)
                .catch((e) => {
                    expect(String(e)).toBe('Error: Has no handler for "getRequestCount" action!');
                    done();
                });
        });

        it('handler with exception', done => {
            const requestData = {
                count: 0,
                name: 'getRequestCount',
                handler: () => {
                    throw new Error('Test error!');
                }
            };

            const secondAdapter = new MockAdapter();
            const secondBus = new Bus(secondAdapter);

            secondBus.registerRequestHandler(requestData.name, requestData.handler);

            adapter.onSend.once((data) => {
                secondAdapter.onSend.once(d => adapter.dispatchAdapterEvent(d));
                secondAdapter.dispatchAdapterEvent(data);
            });

            bus.request(requestData.name, 10, 100)
                .catch((e) => {
                    console.log(e);
                    expect(String(e)).toBe('Error: Test error!');
                    done();
                });
        });

        it('duplicate handler', () => {
            const f = () => null, name = 'test';

            bus.registerRequestHandler(name, f);
            expect(() => bus.registerRequestHandler(name, f)).toThrow('Duplicate request handler!');
        });

    });

});
