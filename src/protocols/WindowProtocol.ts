import { EventEmitter } from 'typed-ts-events';


export class WindowProtocol<T> extends EventEmitter<WindowProtocol.IEvents<T>> {

    private win: WindowProtocol.IWindow;
    private readonly handler: (event: WindowProtocol.IMessageEvent<T>) => any;
    private readonly origin: string;

    constructor(win: WindowProtocol.IWindow) {
        super();

        this.win = win;
        this.origin = win.origin;
        this.handler = event => {
            this.trigger('message', event);
        };

        this.win.addEventListener('message', this.handler, false);
    }

    public dispatch<R>(data: R): this {
        this.win.postMessage(data, this.origin);
        return this;
    }

    public destroy(): void {
        this.win.removeEventListener('message', this.handler, false);
        this.win = WindowProtocol._fakeWin;
    }

    private static _fakeWin: WindowProtocol.IWindow = (function () {
        const empty = () => null;
        return {
            postMessage: empty,
            addEventListener: empty,
            removeEventListener: empty,
            origin: '*'
        };
    })();
}

export namespace WindowProtocol {

    export interface IWindow {
        postMessage: typeof window['postMessage'];
        addEventListener: typeof window['addEventListener']
        removeEventListener: typeof window['removeEventListener'];
        origin: string;
    }

    export interface IMessageEvent<T> extends MessageEvent {
        data: T;
    }

    export interface IEvents<T> {
        message: IMessageEvent<T>;
    }

}
