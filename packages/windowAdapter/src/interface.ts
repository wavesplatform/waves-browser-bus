import { Listen } from './Listen';
import { Dispatch } from './Dispatch';

export type TMessageEvent<T> = MessageEvent & {
    data: T;
}

export type LogLevel = 'production' | 'error' | 'verbose';

export type Options = {
    channelId: string;
    logLevel: LogLevel;
}

type _CreateByWindowOptions = Options & {
    childOrigin: string;
}

type _CreateChildOptions = Options & {
    parentOrigin: string;
}

type OptionalOptionFields = 'channelId' | 'logLevel';

type MakeOptional<T extends Record<string, any>, K extends keyof T> = {
    [Key in Exclude<keyof T, K>]: T[Key]
} & {
    [Key in K]?: T[Key];
}

export type CreateByWindowOptions = MakeOptional<_CreateByWindowOptions, OptionalOptionFields>;
export type CreateChildOptions = MakeOptional<_CreateChildOptions, OptionalOptionFields>;
export type CreateWindowAdapterOptions = MakeOptional<Options, 'channelId'> & {
    listen: Array<Listen>;
    dispatch: Array<Dispatch>;
};
