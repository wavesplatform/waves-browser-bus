import { config } from '../../config';
import { keys } from '../utils';

/* istanbul ignore next */
const consoleModule = (function (root: { console: Console }) {
    return root.console;
})(typeof self !== 'undefined' ? self : global);

const storage: Record<string, Array<Array<any>>> = Object.create(null);

function addNamespace(type: string) {
    if (!storage[type]) {
        storage[type] = [];
    }
}

function saveEvent(type: string, args: Array<any>) {
    storage[type].push(args);
}

function generateConsole(): Record<config.console.TConsoleMethods, (...args: Array<any>) => void> {
    return keys(config.console.methodsData).reduce((api, method) => {
        api[method] = (...args: Array<any>) => {
            if (config.console.logLevel < config.console.methodsData[method].logLevel) {
                if (config.console.methodsData[method].save) {
                    addNamespace(method);
                    saveEvent(method, args);
                }
            } else {
                consoleModule[method](...args);
            }
        };
        return api;
    }, Object.create(null));
}

export const console = {
    ...generateConsole(),
    getSavedMessages(type: config.console.TConsoleMethods): Array<Array<any>> {
        return storage[type] || [];
    }
};

