export function keys<T extends Record<keyof any, any>>(o: T): Array<keyof T> {
    return Object.keys(o) as Array<keyof T>;
}

const salt = Math.floor(Date.now() * Math.random());
let counter = 0;

export function uniqueId(prefix: string): string {
    return `${prefix}-${salt}-${counter++}`;
}

export function toArray<T>(some: T | T[]): T[] {
    return Array.isArray(some) ? some : [some];
}

export function pipe<T, R>(a: (data: T) => R): (data: T) => R;
export function pipe<T, U, R>(a: (data: T) => U, b: (data: U) => R): (data: T) => R;
export function pipe<T, U, E, R>(a: (data: T) => U, b: (data: U) => E, c: (data: E) => R): (data: T) => R;
export function pipe(...args: Array<(a: any) => any>): (data: any) => any {
    return data => args.reduce((acc, cb) => cb(acc), data);
}