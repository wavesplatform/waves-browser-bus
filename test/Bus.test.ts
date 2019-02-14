import { Bus, EventType, TMessageContent } from '../src';
import { MockAdapter } from './mock/MockAdapter';


describe('Bus', () => {

    let adapter: MockAdapter;
    let bus: Bus;

    beforeEach(() => {
        adapter = new MockAdapter();
        bus = new Bus(adapter);
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

        bus.dispatchEvent(eventName);

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
        const newBus = bus.changeAdapter(newAdapter);

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
                expect(e.message).toBe('Timeout error!');
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
            const secondBus = new Bus(secondAdapter);

            adapter.onSend.once((data) => {
                secondAdapter.onSend.once(d => adapter.dispatchAdapterEvent(d));
                secondAdapter.dispatchAdapterEvent(data);
            });

            bus.request(requestData.name, null, 100)
                .catch((e) => {
                    expect(e.message).toBe('Has no handler for this action!');
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
                    expect(e.message).toBe('Test error!');
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
