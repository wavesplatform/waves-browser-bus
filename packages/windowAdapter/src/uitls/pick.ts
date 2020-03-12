export default function <T extends Record<string, any>, K extends keyof T>(keys: Array<K>, target: T) {
    return keys.reduce((acc, key) => Object.assign(acc, { [key]: target[key] }), {});
}