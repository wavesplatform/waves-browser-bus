import { Dispatch } from '../src/Dispatch';
import { EventType, IEventData, TMessageContent } from '@waves/waves-browser-bus';


it('Create', () => {
    new Dispatch({ postMessage: () => void 0 }, '');
});

it('Check dispatch method', () => {
    const data = {
        name: 'test',
        type: EventType.Event
    };
    const win = {
        postMessage: (message: TMessageContent, origin: string) => {
            expect(message).to.equal(data);
            expect(origin).to.equal('origin');
        }
    };
    const dispatch = new Dispatch(win, 'origin');
    dispatch.send(data as IEventData);
});
