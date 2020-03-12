import { Adapter } from '@waves/waves-browser-bus/dist/adapters/Adapter';
import { Listen } from './Listen';
import { Dispatch } from './Dispatch';
import uniqueId from './uitls/uniqueId';
import {
    CreateByWindowOptions,
    CreateChildOptions,
    CreateWindowAdapterOptions,
    LogLevel,
    TMessageEvent
} from './interface';
import { IConsole, makeConsole, makeOptions } from '@waves/client-logs';
import { EventType, IEventData, IRequestData, IResponseData, TMessageContent } from '@waves/waves-browser-bus';
import pick from './uitls/pick';


export class WindowAdapter extends Adapter {

    public readonly id: string = uniqueId('wa');
    private readonly _listen: Array<Listen>;
    private readonly _dispatch: Array<Dispatch>;
    private readonly _listeners: Array<(message: TMessageContent, event: TMessageEvent<unknown>) => void>;
    private readonly _channelId: string | undefined;
    private readonly _console: IConsole;
    private readonly _handler = (event: TMessageEvent<unknown>) => this._onMessage(event);


    constructor({ listen, dispatch, channelId, logLevel }: CreateWindowAdapterOptions) {
        super();
        this._listen = listen;
        this._dispatch = dispatch;
        this._listeners = [];
        this._channelId = channelId == null ? undefined : channelId;
        this._console = makeConsole(makeOptions(logLevel, 'WindowAdapter'));

        this._listen.forEach(item => item.on(this._handler));
        this._console.info('Window Adapter was created!', this.id);
    }

    public send(data: TMessageContent): this {
        const toSend = { ...data, chanelId: this._channelId };

        this._console.info('Send message', toSend);
        this._dispatch.forEach(item => item.send(toSend));
        return this;
    }

    public addListener(cb: (message: TMessageContent, event: TMessageEvent<unknown>) => void): this {
        this._console.info('Add Window Adapter Listener');
        this._listeners.push(cb);
        return this;
    }

    public destroy(): void {
        this._console.info('Destroy Window Adapter');
        this._listen.forEach(item => item.destroy());
        this._listeners.splice(0, this._listeners.length);
        this._dispatch.splice(0, this._dispatch.length);
    }

    private _onMessage(event: TMessageEvent<unknown>): void {
        const data = event.data;

        if (!WindowAdapter._isMessageContent(data)) {
            this._console.info('Wrong event format', event);
            return void 0;
        }

        if (this._channelId) {
            if (this._channelId !== data.chanelId) {
                this._console.warn('Wrong channel id', event);
                return void 0;
            }
        }

        this._console.info('Receive new message', event);
        this._listeners.forEach(item => item(data, event));
    }

    private static _isMessageContent(data: any): data is TMessageContent {
        if (typeof data !== 'object') {
            return false;
        }

        if (data == null) {
            return false;
        }

        if (!('type' in data) || typeof data.type !== 'number') {
            return false;
        }

        const check = <T extends TMessageContent>(check: Partial<Record<keyof T, (value: any) => boolean>>): boolean =>
            Object.entries(check).every(([prop, validate]) => validate(data[prop]));

        const isString = (some: any): some is string => typeof some === 'string';
        const isNumber = (some: any): some is number => typeof some === 'number';

        switch (data.type) {
            case EventType.Event:
                return check<IEventData>({
                    name: isString
                });
            case EventType.Action:
                return check<IRequestData>({
                    name: isString,
                    id: isString
                });
            case EventType.Response:
                return check<IResponseData>({
                    id: isString,
                    status: isNumber
                });
            default:
                return false;
        }
    }

    private static _getLogLevel(level?: LogLevel): LogLevel {
        return ['production', 'error', 'verbose'].includes(level || '') ? level! : 'production';
    }

    public static createByWindow(win: Window, options: CreateByWindowOptions): WindowAdapter {
        const logLevel = WindowAdapter._getLogLevel(options.logLevel);
        const listen = [new Listen(window, { [options.childOrigin]: true }, logLevel)];
        const dispatch = [new Dispatch(win, options.childOrigin)];

        return new WindowAdapter({
            listen,
            dispatch,
            logLevel,
            ...pick(['channelId'], options)
        });
    }

    public static createChildAdapter(options: CreateChildOptions): WindowAdapter {
        const logLevel = WindowAdapter._getLogLevel(options.logLevel);
        const listen = [new Listen(window, { [options.parentOrigin]: true }, logLevel)];
        const dispatch = [new Dispatch(window.parent || window.opener, options.parentOrigin)];

        return new WindowAdapter({
            listen,
            dispatch,
            logLevel,
            ...pick(['channelId'], options)
        });
    }
}
