import { Adapter } from './Adapter';
import { IOneArgFunction, TChanelId, TMessageContent } from './Bus';


export class WindowAdapter extends Adapter {

    private _listen: WindowAdapter.IWindowData;
    private _listeners: Array<IOneArgFunction<TMessageContent, void>>;
    private _dispatch: WindowAdapter.IWindowData;
    private readonly _availableChanelId: Array<TChanelId> | null;
    private readonly _chanelId: TChanelId | undefined;
    private readonly _availableDomains: Record<string, boolean>;
    private readonly _mainListener: (event: MessageEvent) => void;


    constructor(listen: WindowAdapter.IWindowData, dispatch: WindowAdapter.IWindowData, options?: WindowAdapter.IOptions) {
        super();
        this._availableDomains = WindowAdapter._originsToHash([
            listen.origin,
            dispatch.origin,
            ...(options && options.availableDomains || [])
        ]);
        this._dispatch = dispatch;
        this._listen = listen;
        this._listeners = [];
        this._mainListener = (event: MessageEvent) => this._onEvent(event);
        this._chanelId = options && options.chanelId || undefined;
        this._availableChanelId = options && options.availableChanelId || null;

        this._listen.win.addEventListener('message', this._mainListener, false);
    }

    public send(data: TMessageContent): this {
        this._dispatch.win.postMessage({ ...data, chanelId: this._chanelId }, this._dispatch.origin);
        return this;
    }

    public addListener(cb: IOneArgFunction<TMessageContent, void>): this {
        this._listeners.push(cb);
        return this;
    }

    public destroy(): void {

        const empty = () => null;
        const fakeData = {
            origin: '',
            win: {
                postMessage: empty,
                addEventListener: empty,
                removeEventListener: empty
            }
        };

        this._listen.win.removeEventListener('message', this._mainListener, false);
        this._listeners = [];

        this._dispatch = fakeData;
        this._listen = fakeData;
    }

    private _onEvent(event: IMessage): void {
        if (this.accessEvent(event)) {
            this._listeners.forEach(handler => {
                handler(event.data);
            });
        }
    }

    private accessEvent(event: IMessage): boolean {
        if (!this._availableDomains['*'] && !this._availableDomains[event.origin]) {
            return false;
        }

        if (!this._availableChanelId) {
            return true;
        }

        return !!(event.data.chanelId && this._availableChanelId.indexOf(event.data.chanelId) !== -1);
    }

    private static _originsToHash(list: Array<string>): Record<string, boolean> {
        return list.reduce((hash, item) => (hash[item] = true, hash), Object.create(null));
    }

}

interface IMessage extends MessageEvent {
    data: Readonly<TMessageContent>;
}

export namespace WindowAdapter {

    export interface IWindowData {
        origin: string;
        win: IWindowPart;
    }

    export interface IWindowPart {
        postMessage: typeof window['postMessage'];
        addEventListener: typeof window['addEventListener']
        removeEventListener: typeof window['removeEventListener'];
    }

    export interface IOptions {
        availableDomains?: Array<string> | undefined;
        availableChanelId?: Array<TChanelId>;
        chanelId?: TChanelId | undefined;
    }

}
