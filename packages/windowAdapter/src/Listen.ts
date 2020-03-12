import { LogLevel, TMessageEvent } from './interface';
import makeConsole, { IConsole, makeOptions } from '@waves/client-logs';


export class Listen {
    private readonly _win: TListenWin;
    private readonly _listeners: Array<(event: TMessageEvent<unknown>) => void> = [];
    private readonly _origins: Record<string, boolean>;
    private readonly _console: IConsole;
    private readonly _handler: <T>(event: TMessageEvent<T>) => void =
        <T>(event: TMessageEvent<T>) => this._onMessage(event);

    constructor(win: TListenWin, origins: Record<string, boolean>, logLevel: LogLevel) {
        this._win = win;
        this._origins = origins;
        this._console = makeConsole(makeOptions(logLevel, 'Listen'));
        this._win.addEventListener('message', this._handler, false);
    }

    public on<T>(callback: (event: TMessageEvent<T>) => void): void {
        this._listeners.push(callback);
    }

    public off(callback: (event: TMessageEvent<unknown>) => void): void {
        const index = this._listeners.indexOf(callback);
        if (index !== -1) {
            this._listeners.splice(index, 1);
        }
    }

    public destroy(): void {
        this._win.removeEventListener('message', this._handler, false);
        this._listeners.splice(0, this._listeners.length);
    }

    private _onMessage<T>(event: TMessageEvent<T>): void {
        if (this._origins['*'] || this._origins[event.origin]) {
            this._listeners.forEach(item => item(event));
        } else {
            this._console.warn(
                `Wrong origin! ${event.origin}, allowed: ${Object.keys(this._origins).join(', ')}`
            );
        }
    }
}

type TListenWin = Pick<Window, 'addEventListener' | 'removeEventListener'>;
