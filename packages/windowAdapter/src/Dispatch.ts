import { TMessageContent } from "@waves/waves-browser-bus";


export class Dispatch {

    private readonly _win: TDispatchWin;
    private readonly _origin: string;

    constructor(win: TDispatchWin, origin: string) {
        this._win = win;
        this._origin = origin;
    }

    public send(data: TMessageContent): void {
        this._win.postMessage(data, this._origin);
    }

}

type TDispatchWin = Pick<Window, 'postMessage'>;
