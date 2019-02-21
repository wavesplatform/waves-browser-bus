import { IOneArgFunction, TMessageContent } from '../bus/Bus';


export abstract class Adapter {

    public abstract send(data: TMessageContent): this;
    public abstract addListener(cb: IOneArgFunction<TMessageContent, void>): this;
    public abstract destroy(): void;
}

export namespace Adapter {

    export interface IEvents {
        message: TMessageContent;
    }

}
