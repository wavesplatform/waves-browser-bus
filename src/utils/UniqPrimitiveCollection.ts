export class UniqPrimitiveCollection<T extends keyof any> {

    public size: number = 0;
    private hash: Record<keyof any, boolean> = Object.create(null);

    constructor(list?: Array<T>) {
        if (list) {
            list.forEach(this.add, this);
        }
    }

    public add(item: T): this {
        this.hash[item] = true;
        this.size = Object.keys(this.hash).length;
        return this;
    }

    public has(key: T): boolean {
        return key in this.hash;
    }
}