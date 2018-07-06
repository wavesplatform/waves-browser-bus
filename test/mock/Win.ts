import { IHash, Signal } from 'ts-utils';


class Win {

    public onPostMessageRun: Signal<any> = new Signal();
    private _handlers: IHash<Array<Function>> = Object.create(null);


    public postMessage(data: any, origin: string) {
        this.onPostMessageRun.dispatch({ data, origin });
    }

    public removeEventListener(event, handler) {
        if (!this._handlers[event]) {
            return null;
        }
        this._handlers[event] = this._handlers[event].filter(cb => cb !== handler);
    }

    public addEventListener(event: string, handler: Function) {
        if (!this._handlers[event]) {
            this._handlers[event] = [];
        }
        this._handlers[event].push(handler);
    }

    public runEventListeners(event: string, eventData: any) {
        if (!this._handlers[event]) {
            return null;
        }

        this._handlers[event].forEach(cb => cb(eventData));
    }

}

export function mockWindow<T>(): IMockWindow<T> {
    return new Win() as any;
}

export interface IMockWindow<T> extends Window {
    onPostMessageRun: Signal<IPostMessageEvent<T>>;
    runEventListeners(event: string, eventData: any);
}

export interface IPostMessageEvent<T> {
    data: T;
    origin: string;
}
