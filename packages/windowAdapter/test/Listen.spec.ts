import { Listen } from '../src/Listen';
import { TMessageEvent } from '../src/interface';

it('Craete', () => {
    new Listen(window, {}, 'production');
});

it('Simple event', (done) => {
    const listen = new Listen(window, { '*': true }, 'verbose');
    const handler = (event: TMessageEvent<unknown>) => {
        expect(event.origin).to.be(location.origin);
        expect(event.data).to.be('test');
        listen.off(handler);
        listen.off(handler);
        listen.destroy();
        done();
    };
    listen.on(handler);
    window.postMessage('test', location.origin);
});
