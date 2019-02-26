import { Signal } from 'ts-utils';
import { WindowProtocol } from '../../src/protocols/WindowProtocol';


class Win {

    public onPostMessageRun: Signal<any> = new Signal();
    private _handlers: Record<string, Array<Function>> = Object.create(null);


    public postMessage(data: any, origin: string): void {
        this.onPostMessageRun.dispatch({ data, origin });
    }

    public removeEventListener(event: string, handler: any): void {
        if (!this._handlers[event]) {
            return void 0;
        }
        this._handlers[event] = this._handlers[event].filter(cb => cb !== handler);
    }

    public addEventListener(event: string, handler: Function): void {
        if (!this._handlers[event]) {
            this._handlers[event] = [];
        }
        this._handlers[event].push(handler);
    }

    public runEventListeners(event: string, eventData: any): void {
        if (!this._handlers[event]) {
            return void 0;
        }

        this._handlers[event].forEach(cb => cb(eventData));
    }

}

export function mockWindow<T>(): IMockWindow<T> {
    return new Win() as any;
}

export interface IMockWindow<T> extends WindowProtocol.IWindow {
    onPostMessageRun: Signal<IPostMessageEvent<T>>;
    runEventListeners(event: string, eventData: any): void;
}

export interface IPostMessageEvent<T> {
    data: T;
    origin: string;
}
