/**
 * Copyright 2023 Dhiego Cassiano Fogaça Barbosa

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Dhiego Cassiano Fogaça Barbosa <modscleo4@outlook.com>
 */

import {
    LuaType,
    LuaNil,
    LuaBoolean,
    LuaNumber,
    LuaString,
    LuaTable,
    LuaFunction,
    LuaUserdata,
    LuaThread,
    LuaScope,
    LuaValue,
    LuaFunctionWrapper,
    convertToLuaValue,
    toLuaValue,
} from "./vm.js";

let emitWarning = true;

const luaStandardLibrary = new LuaScope();

luaStandardLibrary.set(toLuaValue('_VERSION'), toLuaValue('Lua 5.4'));

function luaAssert(scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) {
    const v = args.get('v') ?? toLuaValue(null);
    const message = args.get('message');

    if (v.type === LuaType.Nil || v.type === LuaType.Boolean && !v.jsValue) {
        let msg = 'assertion failed!';
        if (message && message.type === LuaType.String) {
            msg = message.jsValue;
        }

        throw new Error(msg);
    }

    return toLuaValue(null);
}

function luaPrintFn(scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) {
    const convertedVarargs: LuaString[] = [];
    for (const v of varargs) {
        convertedVarargs.push(luaToString(scope, new Map([['v', v]]), []));
    }

    console.log(convertedVarargs.map(v => v.jsValue).join(' '));

    return toLuaValue(null);
}

function luaToNumber(scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) {
    const e = args.get('e') ?? toLuaValue(null);
    const base = args.get('base') ?? toLuaValue(null);

    if (e.type !== LuaType.Number && e.type !== LuaType.String) {
        throw new Error('bad argument #1 to \'tonumber\' (number expected, got ' + e.type + ')');
    }

    if (base.type !== LuaType.Number && base.type !== LuaType.Nil) {
        throw new Error('bad argument #2 to \'tonumber\' (number expected, got ' + base.type + ')');
    }

    if (base.type === LuaType.Nil) {
        if (e.type === LuaType.Number) {
            return e;
        }

        const n = Number(e.jsValue);
        if (isNaN(n)) {
            return toLuaValue(null);
        }

        return toLuaValue(n);
    }

    if (e.type === LuaType.Number) {
        return e;
    }

    const n = parseInt(e.jsValue, base.jsValue);
    if (isNaN(n)) {
        return toLuaValue(null);
    }

    return toLuaValue(n);
}

function luaToString(scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) {
    const v = args.get('v') ?? toLuaValue(null);
    return toLuaValue('' + (v.jsValue ?? ''));
}

function luaType(scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) {
    const v = args.get('v') ?? toLuaValue(null);
    if (v.type === LuaType.Table) {
        return toLuaValue('table: ' + v.jsValue);
    }

    return toLuaValue(v.type);
}

function luaWarn(scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) {
    const message = args.get('msg1')?.jsValue ?? '';
    if (message === '@off') {
        emitWarning = false;
        return toLuaValue(null);
    } else if (message === '@on') {
        emitWarning = true;
        return toLuaValue(null);
    }

    if (!emitWarning) {
        return toLuaValue(null);
    }

    console.warn(message + ' ' + varargs.map(v => v.jsValue).join(' '));
    return toLuaValue(null);
}

const assertFunction = toLuaValue(luaAssert);
assertFunction.name = 'assert';
assertFunction.arguments = ['v', 'message'];
luaStandardLibrary.set(toLuaValue(assertFunction.name), assertFunction);

const printFunction = toLuaValue(luaPrintFn);
printFunction.name = 'print';
printFunction.arguments = ['...'];
luaStandardLibrary.set(toLuaValue(printFunction.name), printFunction);

const tonumberFunction = toLuaValue(luaToNumber);
tonumberFunction.name = 'tonumber';
tonumberFunction.arguments = ['e', 'base'];
luaStandardLibrary.set(toLuaValue(tonumberFunction.name), tonumberFunction);

const tostringFunction = toLuaValue(luaToString);
tostringFunction.name = 'tostring';
tostringFunction.arguments = ['v'];
luaStandardLibrary.set(toLuaValue(tostringFunction.name), tostringFunction);

const typeFunction = toLuaValue(luaType);
typeFunction.name = 'type';
typeFunction.arguments = ['v'];
luaStandardLibrary.set(toLuaValue(typeFunction.name), typeFunction);

const warnFunction = toLuaValue(luaWarn);
warnFunction.name = 'warn';
warnFunction.arguments = ['msg1', '...'];
luaStandardLibrary.set(toLuaValue(warnFunction.name), warnFunction);

export default luaStandardLibrary;
