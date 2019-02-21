import { Adapter } from './Adapter';
import { console, IOneArgFunction, TChanelId, TMessageContent, toArray, UniqPrimitiveCollection } from '..';
import { WindowProtocol } from '../protocols/WindowProtocol';
import { pipe } from '../utils/utils';
import IOptions = SimpleWindowAdapter.IOptions;
import IWindow = WindowProtocol.IWindow;


type TOrList<T> = T | Array<T>;
type TOrString = TOrList<string>;
type TContent = HTMLIFrameElement | WindowProtocol.IWindow;
const emptyOptions: IOptions<TOrString, TOrList<TChanelId>> = { origins: [], chanelId: [] };


export class SimpleWindowAdapter extends Adapter {

    public readonly ready: Promise<void>;
    private _ready: boolean = false;
    private dispatch: WindowProtocol<TMessageContent> | undefined;
    private readonly listen: WindowProtocol<TMessageContent>;
    private readonly options: SimpleWindowAdapter.IOptions<UniqPrimitiveCollection<string>, UniqPrimitiveCollection<TChanelId>>;
    private readonly callbacks: Array<IOneArgFunction<TMessageContent, void>> = [];


    constructor(iframe?: TContent, options?: IOptions<TOrList<string>, TOrList<TChanelId>>) {
        super();

        this.options = SimpleWindowAdapter.prepareOptions(options);

        this.listen = new WindowProtocol<TMessageContent>(window);
        this.listen.on('message', this.onMessage, this);

        this.ready = SimpleWindowAdapter.getIframeContent(iframe).then(win => {
            console.info('SimpleWindowAdapter: Iframe loaded', this.options);
            this.dispatch = new WindowProtocol<TMessageContent>(win);
        });
    }

    public addListener(cb: IOneArgFunction<TMessageContent, void>): this {
        this.callbacks.push(cb);
        console.info('SimpleWindowAdapter: Add iframe message listener');
        return this;
    }

    public send(data: TMessageContent): this {
        const send = () => {
            (this.dispatch as WindowProtocol<any>).dispatch(data);
            console.info('SimpleWindowAdapter: Send message', data);
        };
        if (this._ready) {
            send();
        } else {
            this.ready.then(send);
        }
        return this;
    }

    public destroy(): void {
        this.listen.destroy();
        const destroy = () => {
            (this.dispatch as WindowProtocol<any>).destroy();
            console.info('SimpleWindowAdapter: Destroy');
        };
        if (this.dispatch) {
            destroy();
        } else {
            this.ready.then(destroy);
        }
    }

    private onMessage(event: WindowProtocol.IMessageEvent<TMessageContent>): void {
        if (this.accessEvent(event)) {
            this.callbacks.forEach(cb => {
                try {
                    cb(event.data);
                } catch (e) {
                    console.warn('SimpleWindowAdapter: Unhandled exception!', e);
                }
            });
        }
    }

    private accessEvent(event: WindowProtocol.IMessageEvent<TMessageContent>): boolean {
        if (typeof event.data !== 'object' || event.data.type == null) {
            console.info('SimpleWindowAdapter: Block event. Wrong event format!', event.data);
            return false;
        }

        if (!this.options.origins.has('*') && !this.options.origins.has(event.origin)) {
            console.info(`IframeAdapter: Block event by origin "${event.origin}"`);
            return false;
        }

        if (!this.options.chanelId.size) {
            return true;
        }

        const access = !!(event.data.chanelId && this.options.chanelId.has(event.data.chanelId));

        if (!access) {
            console.info(`IframeAdapter: Block event by chanel id "${event.data.chanelId}"`);
        }

        return access;
    }

    private static prepareOptions(options: IOptions<TOrString, TOrList<TChanelId>> = emptyOptions): SimpleWindowAdapter.IOptions<UniqPrimitiveCollection<string>, UniqPrimitiveCollection<TChanelId>> {
        const concat = <T extends keyof any>(initialValue: UniqPrimitiveCollection<T>) => (list: Array<T>) => list.reduce((set, item) => set.add(item), initialValue);
        const getCollection = <T extends keyof any>(data: TOrList<T>, initial: UniqPrimitiveCollection<T>) => pipe<TOrList<T>, Array<T>, UniqPrimitiveCollection<T>>(toArray, concat(initial))(data);

        const origins = getCollection<string>(options.origins, new UniqPrimitiveCollection([window.location.origin]));
        const chanelId = getCollection<TChanelId>(options.chanelId, new UniqPrimitiveCollection());

        return { ...options, origins, chanelId };
    }

    private static getIframeContent(content?: TContent): Promise<IWindow> {
        if (!content) {
            return Promise.resolve(window.opener || window.parent);
        }
        if (!(content instanceof HTMLElement)) {
            return Promise.resolve(content);
        }
        if (content.contentWindow) {
            return Promise.resolve(content.contentWindow);
        }
        return new Promise((resolve, reject) => {
            content.addEventListener('load', () => resolve(content.contentWindow as IWindow), false);
            content.addEventListener('error', reject, false);
        });
    }
}


export namespace SimpleWindowAdapter {

    export interface IOptions<ORIGINS, CHANEL_ID> {
        origins: ORIGINS;
        chanelId: CHANEL_ID;
    }

}