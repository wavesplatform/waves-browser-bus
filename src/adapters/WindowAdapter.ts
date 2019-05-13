import { Adapter } from './Adapter';
import { console, IOneArgFunction, TChanelId, TMessageContent, toArray, UniqPrimitiveCollection, uniqueId } from '..';
import { WindowProtocol } from '../protocols/WindowProtocol';
import { pipe } from '../utils/utils';
import IOptions = WindowAdapter.IOptions;
import IWindow = WindowProtocol.IWindow;

const EMPTY_OPTIONS: IOptions<TOrList<string>, TOrList<TChanelId>> = { origins: [], availableChanelId: [] };
type TOrList<T> = T | Array<T>;
type TContent = HTMLIFrameElement | WindowProtocol.IWindow;


export class WindowAdapter extends Adapter {

    public readonly id: string = uniqueId('wa');
    private readonly chanelId: TChanelId | undefined;
    private readonly dispatch: Array<WindowProtocol<TMessageContent>>;
    private readonly listen: Array<WindowProtocol<TMessageContent>>;
    private readonly options: WindowAdapter.IOptions<UniqPrimitiveCollection<string>, UniqPrimitiveCollection<TChanelId>>;
    private readonly callbacks: Array<IOneArgFunction<TMessageContent, void>> = [];


    constructor(listen: Array<WindowProtocol<TMessageContent>>, dispatch: Array<WindowProtocol<TMessageContent>>, options?: Partial<WindowAdapter.IOptions<TOrList<string>, TOrList<TChanelId>>>) {
        super();

        this.options = WindowAdapter.prepareOptions(options);
        this.listen = listen;
        this.dispatch = dispatch;
        this.listen.forEach(protocol => protocol.on('message', this.onMessage, this));
    }

    public addListener(cb: IOneArgFunction<TMessageContent, void>): this {
        this.callbacks.push(cb);
        console.info('WindowAdapter: Add iframe message listener');
        return this;
    }

    public send(data: TMessageContent): this {
        const message = { ...data, chanelId: this.chanelId };
        this.dispatch.forEach(protocol => protocol.dispatch(message));
        console.info('WindowAdapter: Send message', message);
        return this;
    }

    public destroy(): void {
        this.listen.forEach(protocol => protocol.destroy());
        this.dispatch.forEach(protocol => protocol.destroy());
        console.info('WindowAdapter: Destroy');
    }

    private onMessage(event: WindowProtocol.IMessageEvent<TMessageContent>): void {
        if (this.accessEvent(event)) {
            this.callbacks.forEach(cb => {
                try {
                    cb(event.data);
                } catch (e) {
                    console.warn('WindowAdapter: Unhandled exception!', e);
                }
            });
        }
    }

    private accessEvent(event: WindowProtocol.IMessageEvent<TMessageContent>): boolean {
        if (typeof event.data !== 'object' || event.data.type == null) {
            console.info('WindowAdapter: Block event. Wrong event format!', event.data);
            return false;
        }

        if (!this.options.origins.has('*') && !this.options.origins.has(event.origin)) {
            console.info(`SimpleWindowAdapter: Block event by origin "${event.origin}"`);
            return false;
        }

        if (!this.options.availableChanelId.size) {
            return true;
        }

        const access = !!(event.data.chanelId && this.options.availableChanelId.has(event.data.chanelId));

        if (!access) {
            console.info(`SimpleWindowAdapter: Block event by chanel id "${event.data.chanelId}"`);
        }

        return access;
    }

    public static createSimpleWindowAdapter(iframe?: TContent, options?: WindowAdapter.IOptions<TOrList<string>, TOrList<TChanelId>>): Promise<WindowAdapter> {
        const origin = this.getContentOrigin(iframe);
        const myOptions = this.prepareOptions(options);
        const events: Array<WindowProtocol.IMessageEvent<TMessageContent>> = [];

        if (origin) {
            myOptions.origins.add(origin);
        }

        const listen = new WindowProtocol<TMessageContent>(window, WindowProtocol.PROTOCOL_TYPES.LISTEN);
        const handler: (e: WindowProtocol.IMessageEvent<TMessageContent>) => void = event => {
            events.push(event);
        };

        listen.on('message', handler);

        return this.getIframeContent(iframe)
            .then(win => {
                const dispatch = new WindowProtocol<TMessageContent>(win.win, WindowProtocol.PROTOCOL_TYPES.DISPATCH);
                const adapter = new WindowAdapter([listen], [dispatch], this.unPrepareOptions(myOptions));

                events.forEach(event => {
                    adapter.onMessage(event);
                });
                listen.off('message', handler);

                return adapter;
            });
    }

    private static prepareOptions(options: Partial<IOptions<TOrList<string>, TOrList<TChanelId>>> = EMPTY_OPTIONS): WindowAdapter.IOptions<UniqPrimitiveCollection<string>, UniqPrimitiveCollection<TChanelId>> {
        const concat = <T extends keyof any>(initialValue: UniqPrimitiveCollection<T>) => (list: Array<T>) => list.reduce((set, item) => set.add(item), initialValue);
        const getCollection = <T extends keyof any>(data: TOrList<T>, initial: UniqPrimitiveCollection<T>) => pipe<TOrList<T>, Array<T>, UniqPrimitiveCollection<T>>(toArray, concat(initial))(data);

        const origins = getCollection<string>(options.origins || [], new UniqPrimitiveCollection([window.location.origin]));
        const chanelId = getCollection<TChanelId>(options.availableChanelId || [], new UniqPrimitiveCollection());

        return { ...options, origins, availableChanelId: chanelId };
    }

    private static unPrepareOptions(options: WindowAdapter.IOptions<UniqPrimitiveCollection<string>, UniqPrimitiveCollection<TChanelId>>): WindowAdapter.IOptions<TOrList<string>, TOrList<TChanelId>> {
        return {
            origins: options.origins.toArray(),
            availableChanelId: options.availableChanelId.toArray(),
            chanelId: options.chanelId
        };
    }

    private static getIframeContent(content?: TContent): Promise<{ win: IWindow }> {
        if (!content) {
            return Promise.resolve({ win: window.opener || window.parent });
        }
        if (!(content instanceof HTMLIFrameElement)) {
            return Promise.resolve({ win: content });
        }
        if (content.contentWindow) {
            return Promise.resolve({ win: content.contentWindow });
        }
        return new Promise((resolve, reject) => {
            content.addEventListener('load', () => resolve({ win: content.contentWindow as IWindow }), false);
            content.addEventListener('error', reject, false);
        });
    }

    private static getContentOrigin(content?: TContent): string | null {
        if (!content) {
            try {
                return new URL(document.referrer).origin;
            } catch (e) {
                return null;
            }
        }

        if (!(content instanceof HTMLIFrameElement)) {
            try {
                return window.top.origin;
            } catch (e) {
                return null;
            }
        }

        try {
            return new URL(content.src).origin || null;
        } catch (e) {
            return null;
        }
    }
}


export namespace WindowAdapter {

    export interface IOptions<ORIGINS, CHANEL_ID> {
        origins: ORIGINS;
        availableChanelId: CHANEL_ID;
        chanelId?: TChanelId;
    }

}