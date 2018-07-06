import { Adapter, TMessageContent, IOneArgFunction } from '../../src';
import { Signal } from 'ts-utils';


export class MockAdapter extends Adapter {

    public onSend: Signal<TMessageContent> = new Signal();
    public onDestroy: Signal<{}> = new Signal();
    private listeners: Array<Function> = [];


    public send(data: TMessageContent): this {
        this.onSend.dispatch(data);
    }

    public addListener(cb: IOneArgFunction<TMessageContent, void>): this {
        this.listeners.push(cb);
    }

    public dispatchAdapterEvent(e: TMessageContent) {
        this.listeners.forEach(cb => cb(e));
    }

    public destroy(): void {
        this.onDestroy.dispatch({});
    }

}
