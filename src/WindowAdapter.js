"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Adapter_1 = require("./Adapter");
var WindowAdapter = /** @class */ (function (_super) {
    __extends(WindowAdapter, _super);
    function WindowAdapter(listen, dispatch, availableDomains) {
        var _this = _super.call(this) || this;
        _this._availableDomains = [listen.origin, dispatch.origin].concat(availableDomains || []);
        _this._dispatch = dispatch;
        _this._listen = listen;
        _this._listeners = [];
        _this._mainListener = function (event) { return _this._onEvent(event); };
        _this._listen.win.addEventListener('message', _this._mainListener, false);
        return _this;
    }
    WindowAdapter.prototype.send = function (data) {
        this._dispatch.win.postMessage(data, this._dispatch.origin);
        return this;
    };
    WindowAdapter.prototype.addListener = function (cb) {
        this._listeners.push(cb);
        return this;
    };
    WindowAdapter.prototype.destroy = function () {
        this._listen.win.removeEventListener('message', this._mainListener, false);
        this._listeners = [];
        this._listen = null;
        this._dispatch = null;
    };
    WindowAdapter.prototype._onEvent = function (event) {
        if (this._availableDomains.indexOf(event.origin) !== -1) {
            this._listeners.forEach(function (handler) {
                handler(event.data);
            });
        }
    };
    return WindowAdapter;
}(Adapter_1.Adapter));
exports.WindowAdapter = WindowAdapter;
//# sourceMappingURL=WindowAdapter.js.map