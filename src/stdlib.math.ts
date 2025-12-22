/**
 * Copyright 2024 Dhiego Cassiano Fogaça Barbosa

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
    LuaError,
    LuaScope,
    LuaType,
    LuaValue,
    toLuaValue
} from "./vm.js";

const luaMathLibrary = new LuaScope();

let randomseed = 0xDEADBEEF;

function luaRandomseed(scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) {
    const x0 = args.get('x0') ?? toLuaValue(null);
    if (x0.type !== LuaType.Number) {
        throw new LuaError(`bad argument #1 to 'randomseed' (number expected, got ${x0.type})`);
    }

    randomseed = x0.jsValue;

    return toLuaValue(randomseed);
}

function luaRandom(scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) {
    const min = args.get('min') ?? toLuaValue(null);
    if (min.type !== LuaType.Number) {
        throw new LuaError(`bad argument #1 to 'random' (number expected, got ${min.type})`);
    }

    const max = args.get('max') ?? toLuaValue(null);
    if (max.type !== LuaType.Number) {
        throw new LuaError(`bad argument #2 to 'random' (number expected, got ${max.type})`);
    }

    if (min.jsValue > max.jsValue) {
        throw new LuaError(`bad argument #1 to 'random' (interval is empty)`);
    }

    randomseed = ((randomseed * 1103515245) + 12345) & 0x7fffffff;

    return toLuaValue(min.jsValue + (randomseed % (max.jsValue - min.jsValue + 1)));
}

const randomseedFunction = toLuaValue(luaRandomseed);
randomseedFunction.name = 'randomseed';
randomseedFunction.arguments = ['x0'];
luaMathLibrary.set(toLuaValue(randomseedFunction.name), randomseedFunction);

const randomFunction = toLuaValue(luaRandom);
randomFunction.name = 'random';
randomFunction.arguments = ['min', 'max'];
luaMathLibrary.set(toLuaValue(randomFunction.name), randomFunction);

export default luaMathLibrary;
