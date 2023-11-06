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

import { readFileSync, writeFileSync } from "fs";

import { tokenizer } from "./tokenizer.js";
import { ParsingError, parser } from "./parser.js";
import { interpret } from "./interpreter.js";
import { LuaScope } from "./vm.js";

import luaStandardLibrary from "./stdlib.js";

if (process.argv.length < 3) {
    console.error('Usage: node dist/index.js <file>');
    process.exit(1);
}

const code = readFileSync(process.argv[2], 'utf8');

try {
    const resultTokens = tokenizer(code);
    const resultTokensFiltered = resultTokens.filter(token => token.type !== 'comment' && (token.type !== 'separator' || token.additional !== 'whitespace'));

    const globalScope = new LuaScope();
    for (const [key, value] of luaStandardLibrary) {
        globalScope.set(key, value); // Add standard library variables to global scope
    }

    //console.log(resultTokensFiltered);

    const parserResult = {
        type: 'script',
        line: 1,
        column: 1,
        body: parser(resultTokensFiltered),
    };

    writeFileSync('ast.json', JSON.stringify(parserResult, null, 2));
    //console.dir(parserResult, { depth: null });

    interpret(parserResult.body.tree, globalScope);
} catch (e) {
    if (e instanceof ParsingError) {
        console.error(e.message, e.grammarSymbol.toString(), e.token);
    } else {
        console.error(e);
    }
}
