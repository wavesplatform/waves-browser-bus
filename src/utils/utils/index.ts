export function keys<T extends Record<keyof any, any>>(o: T): Array<keyof T> {
    return Object.keys(o) as Array<keyof T>;
}

const salt = Math.floor(Date.now() * Math.random());
let counter = 0;

export function uniqueId(prefix: string): string {
    return `${prefix}-${salt}-${counter++}`;
}
