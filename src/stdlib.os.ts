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
    LuaScope,
    LuaValue,
    toLuaValue
} from "./vm.js";

const luaOSLibrary = new LuaScope();

function luaTime(scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) {
    return toLuaValue(Math.floor(Date.now() / 1000));
}

const timeFunction = toLuaValue(luaTime);
timeFunction.name = 'time';
timeFunction.arguments = [];
luaOSLibrary.set(toLuaValue(timeFunction.name), timeFunction);

export default luaOSLibrary;
