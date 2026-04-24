export class Signal<T = void> {
    private readonly handlers: Array<(data: T) => void> = [];

    public on(handler: (data: T) => void): this {
        this.handlers.push(handler);
        return this;
    }

    public once(handler: (data: T) => void): this {
        const onceHandler = (data: T) => {
            this.off(onceHandler);
            handler(data);
        };

        return this.on(onceHandler);
    }

    public off(handler: (data: T) => void): this {
        const index = this.handlers.indexOf(handler);
        if (index !== -1) {
            this.handlers.splice(index, 1);
        }
        return this;
    }

    public dispatch(data: T): void {
        this.handlers.slice().forEach((handler) => handler(data));
    }
}
