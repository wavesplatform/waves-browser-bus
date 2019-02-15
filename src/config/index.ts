export namespace config {

    export namespace console {
        export type TConsoleMethods = 'log' | 'info' | 'warn' | 'error';

        export const LOG_LEVEL = {
            PRODUCTION: 0,
            ERRORS: 1,
            VERBOSE: 2
        };
        export let logLevel: number = LOG_LEVEL.PRODUCTION;

        export const methodsData: Record<TConsoleMethods, { save: boolean; logLevel: number }> = {
            log: { save: false, logLevel: LOG_LEVEL.VERBOSE },
            info: { save: false, logLevel: LOG_LEVEL.VERBOSE },
            warn: { save: false, logLevel: LOG_LEVEL.VERBOSE },
            error: { save: true, logLevel: LOG_LEVEL.ERRORS }
        };
    }
}


