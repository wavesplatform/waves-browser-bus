type EventKey<T> = Extract<keyof T, string>;

interface IHandler<T> {
    cb: (payload: T) => void;
    context?: any;
}

export class EventEmitter<T extends Record<string, any>> {
    private readonly handlers: Partial<{ [K in EventKey<T>]: Array<IHandler<T[K]>> }> = {};

    public on<K extends EventKey<T>>(name: K, cb: (payload: T[K]) => void, context?: any): this {
        if (!this.handlers[name]) {
            this.handlers[name] = [];
        }
        this.handlers[name]!.push({ cb, context });
        return this;
    }

    public off(): this;
    public off<K extends EventKey<T>>(name: K): this;
    public off<K extends EventKey<T>>(name: K, cb: (payload: T[K]) => void): this;
    public off<K extends EventKey<T>>(name?: K, cb?: (payload: T[K]) => void): this {
        if (!name) {
            Object.keys(this.handlers).forEach((eventName) => {
                delete this.handlers[eventName as EventKey<T>];
            });
            return this;
        }

        if (!this.handlers[name]) {
            return this;
        }

        if (!cb) {
            delete this.handlers[name];
            return this;
        }

        this.handlers[name] = this.handlers[name]!.filter((handler) => handler.cb !== cb);
        if (!this.handlers[name]!.length) {
            delete this.handlers[name];
        }
        return this;
    }

    public trigger<K extends EventKey<T>>(name: K, payload: T[K]): this {
        if (!this.handlers[name]) {
            return this;
        }

        this.handlers[name]!.slice().forEach((handler) => {
            handler.cb.call(handler.context, payload);
        });

        return this;
    }
}
