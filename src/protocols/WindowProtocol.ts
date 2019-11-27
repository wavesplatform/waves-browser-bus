import { EventEmitter } from 'typed-ts-events';


export class WindowProtocol<T> extends EventEmitter<WindowProtocol.IEvents<T>> {

    private win: WindowProtocol.IWindow;
    private readonly handler: (event: WindowProtocol.IMessageEvent<T>) => any;
    private readonly type: WindowProtocol.TProtocolType;


    constructor(win: WindowProtocol.IWindow, type: WindowProtocol.TProtocolType) {
        super();

        this.win = win;
        this.type = type;

        this.handler = event => {
            this.trigger('message', event);
        };

        if (type === WindowProtocol.PROTOCOL_TYPES.LISTEN) {
            this.win.addEventListener('message', this.handler, false);
        }
    }

    public dispatch<R>(data: R): this {
        this.win.postMessage(data, '*');
        return this;
    }

    public destroy(): void {
        if (this.type === WindowProtocol.PROTOCOL_TYPES.LISTEN) {
            this.win.removeEventListener('message', this.handler, false);
        }
        this.win = WindowProtocol._fakeWin;
    }

    private static _fakeWin: WindowProtocol.IWindow = (function () {
        const empty = () => null;
        return {
            postMessage: empty,
            addEventListener: empty,
            removeEventListener: empty
        };
    })();
}

/* istanbul ignore next */
export namespace WindowProtocol {

    export const PROTOCOL_TYPES = {
        LISTEN: 'listen' as 'listen',
        DISPATCH: 'dispatch' as 'dispatch'
    };

    export interface IWindow {
        postMessage: typeof window['postMessage'];
        addEventListener: typeof window['addEventListener']
        removeEventListener: typeof window['removeEventListener'];
    }

    export interface IMessageEvent<T> extends MessageEvent {
        data: T;
    }

    export interface IEvents<T> {
        message: IMessageEvent<T>;
    }

    export type TProtocolType = 'listen' | 'dispatch';
}
