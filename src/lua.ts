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

import { readFileSync } from "fs";

import { tokenizer } from "./tokenizer.js";
import { ParsingError, parser } from "./parser.js";
import { LuaScope, interpret, toLuaValue } from "./interpreter.js";

const code = readFileSync('test.lua', 'utf8');

try {
    const resultTokens = tokenizer(code);
    const resultTokensFiltered = resultTokens.filter(token => token.type !== 'comment' && (token.type !== 'separator' || token.additional !== 'whitespace'));

    const globalScope: LuaScope = new Map();

    const printFunction = toLuaValue(function (args: LuaScope) { console.log(args.get(toLuaValue('v'))!.jsValue); return toLuaValue(null); });
    printFunction.name = 'print';
    printFunction.arguments = [toLuaValue('v')];
    globalScope.set(toLuaValue(printFunction.name), printFunction);

    //console.log(resultTokensFiltered);

    const parserResult = {
        type: 'script',
        line: 1,
        column: 1,
        body: parser(resultTokensFiltered),
    };

    //console.dir(parserResult, { depth: null });

    interpret(parserResult.body.tree, globalScope);
} catch (e) {
    if (e instanceof ParsingError) {
        console.error(e.message, e.grammarSymbol.toString(), e.token);
    } else {
        console.error(e);
    }
}
