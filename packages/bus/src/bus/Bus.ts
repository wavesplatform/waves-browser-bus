import { Adapter } from '../adapters/Adapter';
import { uniqueId } from '../utils';


export const enum EventType {
    Event,
    Action,
    Response
}

export const enum ResponseStatus {
    Success,
    Error
}

export class Bus<T extends Record<string, any> = any, H extends Record<string, (data: any) => any> = any> {

    public id: string = uniqueId('bus');
    private _adapter: Adapter;
    private readonly _activeRequestHash: Record<string, ISentActionData>;
    private readonly _timeout: number;
    private readonly _eventHandlers: Record<string, IEventHandlerData[]>;
    private readonly _requestHandlers: H;


    constructor(adapter: Adapter, defaultTimeout?: number) {
        this._timeout = defaultTimeout || 5000;
        this._adapter = adapter;
        this._adapter.addListener((data) => this._onMessage(data));
        this._eventHandlers = Object.create(null);
        this._activeRequestHash = Object.create(null);
        this._requestHandlers = Object.create(null);

        console.info(`Create Bus with id "${this.id}"`);
    }

    public dispatchEvent<K extends keyof T>(name: K, data: T[K]): this {
        this._adapter.send(Bus._createEvent(name as string, data));
        console.info(`Dispatch event "${name}"`, data);
        return this;
    }

    public request<E extends keyof H>(name: E, data?: Parameters<H[E]>[0], timeout?: number): Promise<ReturnType<H[E]> extends Promise<infer P> ? P : ReturnType<H[E]>> {
        return new Promise<any>((resolve, reject) => {
            const id = uniqueId(`${this.id}-action`);
            const wait = timeout || this._timeout;

            let timer: number | NodeJS.Timeout;

            if ((timeout || this._timeout) !== -1) {
                timer = setTimeout(() => {
                    delete this._activeRequestHash[id];
                    const error = new Error(`Timeout error for request with name "${name}" and timeout ${wait}!`);
                    console.error(error);
                    reject(error);
                }, wait);
            }

            const cancelTimeout = () => {
                if (timer) {
                    clearTimeout(timer as number);
                }
            };

            this._activeRequestHash[id] = {
                reject: (error: any) => {
                    cancelTimeout();
                    console.error(`Error request with name "${name}"`, error);
                    reject(error);
                },
                resolve: (data: T) => {
                    cancelTimeout();
                    console.info(`Request with name "${name}" success resolved!`, data);
                    resolve(data);
                }
            };

            this._adapter.send({ id, type: EventType.Action, name, data });
            console.info(`Request with name "${name}"`, data);
        });
    }

    public on<K extends keyof T>(name: K, handler: IOneArgFunction<T[K], void>, context?: any): this {
        return this._addEventHandler(name as string, handler, context, false);
    }

    public once<K extends keyof T>(name: K, handler: IOneArgFunction<T[K], void>, context?: any): this {
        return this._addEventHandler(name as string, handler, context, true);
    }

    public off(name?: string, handler?: IOneArgFunction<T[keyof T], void>): this
    public off<K extends keyof T>(name?: K, handler?: IOneArgFunction<T[K], void>): this
    public off(name?: string, handler?: IOneArgFunction<T[keyof T], void>): this {
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

    public registerRequestHandler<E extends keyof H>(name: E, handler: H[E]): this {
        if (this._requestHandlers[name]) {
            throw new Error('Duplicate request handler!');
        }

        this._requestHandlers[name] = handler;

        return this;
    }

    public unregisterHandler<E extends keyof H>(name: E): this {
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

    public destroy(): void {
        console.info('Destroy Bus');
        this.off();
        this._adapter.destroy();
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
                console.info(`Has event with name "${String(message.name)}"`, message.data);
                this._fireEvent(String(message.name), message.data);
                break;
            case EventType.Action:
                console.info(`Start action with id "${message.id}" and name "${String(message.name)}"`, message.data);
                this._createResponse(message);
                break;
            case EventType.Response:
                console.info(`Start response with name "${message.id}" and status "${message.status}"`, message.content);
                this._fireEndAction(message);
                break;
        }
    }

    private _createResponse(message: IRequestData): void {
        const sendError = (error: Error) => {
            console.error(error);
            this._adapter.send({
                id: message.id,
                type: EventType.Response,
                status: ResponseStatus.Error,
                content: String(error)
            });
        };

        if (!this._requestHandlers[String(message.name)]) {
            sendError(new Error(`Has no handler for "${String(message.name)}" action!`));
            return void 0;
        }

        try {
            const result = this._requestHandlers[String(message.name)](message.data);

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

    private _fireEvent(name: string, value: any): void {
        if (!this._eventHandlers[name]) {
            return void 0;
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
    name: keyof any;
    data?: any;
}

export interface IRequestData {
    id: string | number;
    type: EventType.Action;
    name: keyof any;
    data?: any;
}

export interface IResponseData {
    id: string | number;
    type: EventType.Response;
    status: ResponseStatus;
    content: any;
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
