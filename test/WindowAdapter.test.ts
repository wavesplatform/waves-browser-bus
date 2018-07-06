import { WindowAdapter, EventType, IEventData } from '../src';
import { mockWindow } from './mock/Win';


describe('Window adapter', () => {

    it('send', () => {
        let wasEvent = false;

        const listen = {
            win: mockWindow(),
            origin: 'https://listen-origin.com'
        };

        const dispatch = {
            win: mockWindow(),
            origin: 'https://dispatch-origin.com'
        };

        const eventData: IEventData = {
            type: EventType.Event,
            name: 'test',
            data: 'some data for event'
        };

        const adapter = new WindowAdapter(listen, dispatch);

        dispatch.win.onPostMessageRun.once((message) => {
            wasEvent = true;
            expect(message.origin).toBe(dispatch.origin);
            expect(message.data).toBe(eventData);
        });
        adapter.send(eventData);

        expect(wasEvent).toBe(true);
    });

});
