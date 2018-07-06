import { Adapter } from './Adapter';
import { IOneArgFunction, TMessageContent } from './Bus';

export class WindowAdapter extends Adapter {

    private _availableDomains: Array<string>;
    private _dispatch: IWindowData;
    private _listen: IWindowData;
    private _listeners: Array<IOneArgFunction<TMessageContent, void>>;
    private _mainListener: (event: MessageEvent) => void;


    constructor(listen: IWindowData, dispatch: IWindowData, availableDomains?: Array<string>) {
        super();
        this._availableDomains = [listen.origin, dispatch.origin].concat(availableDomains || []);
        this._dispatch = dispatch;
        this._listen = listen;
        this._listeners = [];
        this._mainListener = (event: MessageEvent) => this._onEvent(event);

        this._listen.win.addEventListener('message', this._mainListener, false);
    }

    public send(data: TMessageContent): this {
        if (!this._dispatch) {
            return this;
        }

        this._dispatch.win.postMessage(data, this._dispatch.origin);
        return this;
    }

    public addListener(cb: IOneArgFunction<TMessageContent, void>): this {
        this._listeners.push(cb);
        return this;
    }

    public destroy(): void {
        this._listen.win.removeEventListener('message', this._mainListener, false);
        this._listeners = [];
        this._listen = null;
        this._dispatch = null;
    }

    private _onEvent(event: MessageEvent): void {
        if (this._availableDomains.indexOf(event.origin) !== -1) {
            this._listeners.forEach((handler) => {
                handler(event.data);
            });
        }
    }

}

export interface IWindowData {
    origin: string;
    win: Window;
}
