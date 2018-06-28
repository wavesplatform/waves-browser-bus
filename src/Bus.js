"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_utils_1 = require("ts-utils");
var Bus = /** @class */ (function () {
    function Bus(adapter, defaultTimeout) {
        var _this = this;
        this.id = ts_utils_1.uniqueId('bus');
        this._timeout = defaultTimeout || 5000;
        this._adapter = adapter;
        this._adapter.addListener(function (data) { return _this._onMessage(data); });
        this._eventHandlers = Object.create(null);
        this._activeRequestHash = Object.create(null);
    }
    Bus.prototype.dispatchEvent = function (name) {
        this._adapter.send(Bus._createEvent(name));
        return this;
    };
    Bus.prototype.request = function (name, data, timeout) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var id = ts_utils_1.uniqueId(_this.id + "-action");
            _this._activeRequestHash[id] = { reject: reject, resolve: resolve };
            setTimeout(function () {
                delete _this._activeRequestHash[id];
                reject(new Error('Timeout error!'));
            }, timeout || _this._timeout);
            _this._adapter.send({ id: id, type: 1 /* Action */, name: name, data: data });
        });
    };
    Bus.prototype.on = function (name, handler, context) {
        return this._addEventHandler(name, handler, context, false);
    };
    Bus.prototype.once = function (name, handler, context) {
        return this._addEventHandler(name, handler, context, true);
    };
    Bus.prototype.off = function (name, handler) {
        var _this = this;
        if (!name) {
            Object.keys(this._eventHandlers).forEach(function (name) { return _this.off(name, handler); });
            return this;
        }
        if (!this._eventHandlers[name]) {
            return this;
        }
        if (!handler) {
            this._eventHandlers[name].slice().forEach(function (info) {
                _this.off(name, info.handler);
            });
            return this;
        }
        this._eventHandlers[name] = this._eventHandlers[name].filter(function (info) { return info.handler !== handler; });
        if (!this._eventHandlers[name].length) {
            delete this._eventHandlers[name];
        }
        return this;
    };
    Bus.prototype.registerRequestHandler = function (name, handler) {
        if (this._requestHandlers[name]) {
            throw new Error('Duplicate request handler!');
        }
        this._requestHandlers[name] = handler;
        return this;
    };
    Bus.prototype.changeAdapter = function (adapter) {
        var _this = this;
        var bus = new Bus(adapter, this._timeout);
        Object.keys(this._eventHandlers).forEach(function (name) {
            _this._eventHandlers[name].forEach(function (info) {
                if (info.once) {
                    bus.once(name, info.handler, info.context);
                }
                else {
                    bus.on(name, info.handler, info.context);
                }
            });
        });
        Object.keys(this._requestHandlers).forEach(function (name) {
            bus.registerRequestHandler(name, _this._requestHandlers[name]);
        });
        return bus;
    };
    Bus.prototype._addEventHandler = function (name, handler, context, once) {
        if (!this._eventHandlers[name]) {
            this._eventHandlers[name] = [];
        }
        this._eventHandlers[name].push({ handler: handler, once: once, context: context });
        return this;
    };
    Bus.prototype._onMessage = function (message) {
        switch (message.type) {
            case 0 /* Event */:
                this._fireEvent(message.name, message.data);
                break;
            case 1 /* Action */:
                this._createResponse(message);
                break;
            case 2 /* Response */:
                this._fireEndAction(message);
                break;
            default:
                throw new Error('Wrong message type!');
        }
    };
    Bus.prototype._createResponse = function (message) {
        var _this = this;
        var sendError = function (error) {
            _this._adapter.send({
                id: message.id,
                type: 2 /* Response */,
                status: 1 /* Error */,
                content: error
            });
        };
        if (!this._requestHandlers[message.name]) {
            sendError(new Error('Has no handler for this action!'));
            return null;
        }
        try {
            var result = this._requestHandlers[message.name](message.data);
            if (Bus._isPromise(result)) {
                result.then(function (data) {
                    _this._adapter.send({
                        id: message.id,
                        type: 2 /* Response */,
                        status: 0 /* Success */,
                        content: data
                    });
                }, sendError);
            }
            else {
                this._adapter.send({
                    id: message.id,
                    type: 2 /* Response */,
                    status: 0 /* Success */,
                    content: result
                });
            }
        }
        catch (e) {
            sendError(e);
        }
    };
    Bus.prototype._fireEndAction = function (message) {
        if (this._activeRequestHash[message.id]) {
            switch (message.status) {
                case 1 /* Error */:
                    this._activeRequestHash[message.id].reject(message.content);
                    break;
                case 0 /* Success */:
                    this._activeRequestHash[message.id].resolve(message.content);
                    break;
            }
            delete this._activeRequestHash[message.id];
        }
    };
    Bus.prototype._fireEvent = function (name, value) {
        if (!this._eventHandlers[name]) {
            return null;
        }
        this._eventHandlers[name] = this._eventHandlers[name]
            .slice()
            .filter(function (handlerInfo) {
            try {
                handlerInfo.handler.call(handlerInfo.context, value);
            }
            catch (e) {
                console.warn(e);
            }
            return !handlerInfo.once;
        });
        if (!this._eventHandlers[name].length) {
            delete this._eventHandlers[name];
        }
    };
    Bus._createEvent = function (eventName) {
        return {
            type: 0 /* Event */,
            name: eventName
        };
    };
    Bus._isPromise = function (some) {
        return some && some.then && typeof some.then === 'function';
    };
    return Bus;
}());
exports.Bus = Bus;
//# sourceMappingURL=Bus.js.map