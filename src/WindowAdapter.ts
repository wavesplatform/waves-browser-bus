import { Adapter } from './Adapter';
import { IOneArgFunction, TMessageContent } from './Bus';


export class WindowAdapter extends Adapter {

    private _listen: IWindowData;
    private _listeners: Array<IOneArgFunction<TMessageContent, void>>;
    private _dispatch: IWindowData;
    private readonly _availableDomains: Record<string, boolean>;
    private readonly _mainListener: (event: MessageEvent) => void;


    constructor(listen: IWindowData, dispatch: IWindowData, availableDomains?: Array<string>) {
        super();
        this._availableDomains = WindowAdapter._originsToHash([
            listen.origin,
            dispatch.origin,
            ...(availableDomains || [])
        ]);
        this._dispatch = dispatch;
        this._listen = listen;
        this._listeners = [];
        this._mainListener = (event: MessageEvent) => this._onEvent(event);

        this._listen.win.addEventListener('message', this._mainListener, false);
    }

    public send(data: TMessageContent): this {
        this._dispatch.win.postMessage(data, this._dispatch.origin);
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

    private _onEvent(event: MessageEvent): void {
        if (this._availableDomains['*'] || this._availableDomains[event.origin]) {
            this._listeners.forEach((handler) => {
                handler(event.data);
            });
        }
    }

    private static _originsToHash(list: Array<string>): Record<string, boolean> {
        return list.reduce((hash, item) => (hash[item] = true, hash), Object.create(null));
    }

}

export interface IWindowData {
    origin: string;
    win: IWindowPart;
}

export interface IWindowPart {
    postMessage: typeof window['postMessage'];
    addEventListener: typeof window['addEventListener']
    removeEventListener: typeof window['removeEventListener'];
}
