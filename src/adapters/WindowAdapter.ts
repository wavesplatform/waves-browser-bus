import { Adapter } from './Adapter';
import { IOneArgFunction, TChanelId, TMessageContent } from '../bus/Bus';
import { console, uniqueId } from '../utils';
import { WindowProtocol } from '../protocols/WindowProtocol';


export class WindowAdapter extends Adapter {

    public id: string = uniqueId('wa');
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
        console.info(`Create WindowAdapter with id "${this.id}"`);
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
        // TODO Refactor
        const empty = () => null;
        const fakeData = {
            origin: '',
            win: {
                postMessage: empty,
                addEventListener: empty,
                removeEventListener: empty,
                origin: ''
            }
        };

        this._listen.win.removeEventListener('message', this._mainListener, false);
        this._listeners = [];

        this._dispatch = fakeData;
        this._listen = fakeData;

        console.info('Destroy WindowAdapter');
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
            console.info(`Block event by origin "${event.origin}"`);
            return false;
        }

        if (!this._availableChanelId) {
            return true;
        }

        const access = !!(event.data.chanelId && this._availableChanelId.indexOf(event.data.chanelId) !== -1);

        if (!access) {
            console.info(`Block event by chanel id "${event.data.chanelId}"`);
        }

        return access;
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
        // TODO Refactor
        win: WindowProtocol.IWindow;
    }

    export interface IOptions {
        availableDomains?: Array<string> | undefined;
        availableChanelId?: Array<TChanelId>;
        chanelId?: TChanelId | undefined;
    }

}
