import { Adapter } from './Adapter';
import { IHash } from 'ts-utils/src/utils';


export const enum EventType {
    Event,
    Action,
    Response
}

export const enum ResponseStatus {
    Success,
    Error
}

let counter = 0;

function uniqueId(prefix: string): string {
    return `${prefix}-${counter++}`;
}


export class Bus {

    public id: string = uniqueId('bus');
    private _adapter: Adapter;
    private readonly _activeRequestHash: IHash<ISentActionData>;
    private readonly _timeout: number;
    private readonly _eventHandlers: IHash<IEventHandlerData[]>;
    private readonly _requestHandlers: IHash<IOneArgFunction<any, any>>;


    constructor(adapter: Adapter, defaultTimeout?: number) {
        this._timeout = defaultTimeout || 5000;
        this._adapter = adapter;
        this._adapter.addListener((data) => this._onMessage(data));
        this._eventHandlers = Object.create(null);
        this._activeRequestHash = Object.create(null);
        this._requestHandlers = Object.create(null);
    }

    public dispatchEvent(name: string, data?: unknown): this {
        this._adapter.send(Bus._createEvent(name, data));
        return this;
    }

    public request<T>(name: string, data?: any, timeout?: number): Promise<T> {
        return new Promise<any>((resolve, reject) => {
            const id = uniqueId(`${this.id}-action`);

            let timer: number;

            if ((timeout || this._timeout) !== -1) {
                timer = setTimeout(() => {
                    delete this._activeRequestHash[id];
                    reject(new Error('Timeout error!'));
                }, timeout || this._timeout);
            }

            this._activeRequestHash[id] = {
                reject,
                resolve: (data: any) => {
                    if (timer) {
                        window.clearTimeout(timer);
                    }
                    resolve(data);
                }
            };

            this._adapter.send({ id, type: EventType.Action, name, data });
        });
    }

    public on(name: string, handler: IOneArgFunction<any, void>, context?: any): this {
        return this._addEventHandler(name, handler, context, false);
    }

    public once(name: string, handler: IOneArgFunction<any, void>, context?: any): this {
        return this._addEventHandler(name, handler, context, true);
    }

    public off(name?: string, handler?: IOneArgFunction<any, void>): this {
        if (!name) {
            Object.keys(this._eventHandlers).forEach((name) => this.off(name, handler));
            return this;
        }

        if (!this._eventHandlers[name]) {
            return this;
        }

        if (!handler) {
            this._eventHandlers[name].slice().forEach((info) => {
                this.off(name, info.handler);
            });
            return this;
        }

        this._eventHandlers[name] = this._eventHandlers[name].filter((info) => info.handler !== handler);

        if (!this._eventHandlers[name].length) {
            delete this._eventHandlers[name];
        }

        return this;
    }

    public registerRequestHandler(name: string, handler: IOneArgFunction<any, any>): this {
        if (this._requestHandlers[name]) {
            throw new Error('Duplicate request handler!');
        }

        this._requestHandlers[name] = handler;

        return this;
    }

    public unregisterHandler(name: string): this {
        if (this._requestHandlers[name]) {
            delete this._requestHandlers[name];
        }
        return this;
    }

    public changeAdapter(adapter: Adapter): Bus {
        const bus = new Bus(adapter, this._timeout);

        Object.keys(this._eventHandlers).forEach((name) => {
            this._eventHandlers[name].forEach((info) => {
                if (info.once) {
                    bus.once(name, info.handler, info.context);
                } else {
                    bus.on(name, info.handler, info.context);
                }
            });
        });

        Object.keys(this._requestHandlers).forEach((name) => {
            bus.registerRequestHandler(name, this._requestHandlers[name]);
        });

        return bus;
    }

    private _addEventHandler(name: string, handler: IOneArgFunction<any, void>, context: any, once: boolean): this {
        if (!this._eventHandlers[name]) {
            this._eventHandlers[name] = [];
        }

        this._eventHandlers[name].push({ handler, once, context });

        return this;
    }

    private _onMessage(message: TMessageContent): void {
        switch (message.type) {
            case EventType.Event:
                this._fireEvent(message.name, message.data);
                break;
            case EventType.Action:
                this._createResponse(message);
                break;
            case EventType.Response:
                this._fireEndAction(message);
                break;
        }
    }

    private _createResponse(message: IRequestData) {
        const sendError = (error: Error) => {
            this._adapter.send({
                id: message.id,
                type: EventType.Response,
                status: ResponseStatus.Error,
                content: error
            });
        };

        if (!this._requestHandlers[message.name]) {
            sendError(new Error('Has no handler for this action!'));
            return null;
        }

        try {
            const result = this._requestHandlers[message.name](message.data);

            if (Bus._isPromise(result)) {
                result.then((data) => {
                    this._adapter.send({
                        id: message.id,
                        type: EventType.Response,
                        status: ResponseStatus.Success,
                        content: data
                    });
                }, sendError);
            } else {
                this._adapter.send({
                    id: message.id,
                    type: EventType.Response,
                    status: ResponseStatus.Success,
                    content: result
                });
            }
        } catch (e) {
            sendError(e);
        }
    }

    private _fireEndAction(message: IResponseData) {
        if (this._activeRequestHash[message.id]) {
            switch (message.status) {
                case ResponseStatus.Error:
                    this._activeRequestHash[message.id].reject(message.content);
                    break;
                case ResponseStatus.Success:
                    this._activeRequestHash[message.id].resolve(message.content);
                    break;
            }
            delete this._activeRequestHash[message.id];
        }
    }

    private _fireEvent(name: string, value: any) {
        if (!this._eventHandlers[name]) {
            return null;
        }

        this._eventHandlers[name] = this._eventHandlers[name]
            .slice()
            .filter((handlerInfo) => {
                try {
                    handlerInfo.handler.call(handlerInfo.context, value);
                } catch (e) {
                    console.warn(e);
                }
                return !handlerInfo.once;
            });

        if (!this._eventHandlers[name].length) {
            delete this._eventHandlers[name];
        }
    }

    static _createEvent(eventName: string, data: any): IEventData {
        return {
            type: EventType.Event,
            name: eventName,
            data
        };
    }

    static _isPromise(some: any): some is Promise<any> {
        return some && some.then && typeof some.then === 'function';
    }

}

export interface IOneArgFunction<T, R> {
    (data: T): R;
}

export type TMessageContent = IEventData | IRequestData | IResponseData;

export interface IEventData {
    type: EventType.Event;
    name: string;
    data?: any;
}

export interface IRequestData {
    id: string | number;
    type: EventType.Action;
    name: string;
    data?: object | Array<object>;
}

export interface IResponseData {
    id: string | number;
    type: EventType.Response;
    status: ResponseStatus;
    content: object | Array<object>;
}

interface ISentActionData {
    resolve: Function;
    reject: Function;
}

interface IEventHandlerData {
    context: any;
    once: boolean;
    handler: IOneArgFunction<any, void>;
}
