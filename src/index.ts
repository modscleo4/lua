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

import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { runChunk, stringifyLuaValue } from "./interpreter.js";
import { ParsingError, parser } from "./parser.js";
import luaStandardLibrary from "./stdlib.js";
import { tokenizer } from "./tokenizer.js";
import { LuaScope } from "./vm.js";

const { positionals, values } = parseArgs({
    options: {
        help: {
            type: 'boolean',
            short: 'h',
        },
        output: {
            type: 'string',
            short: 'o',
        },
    },
    allowPositionals: true,
});

if (values.help || positionals.length === 0) {
    console.log(`Usage: ${process.argv[1]} [options] <file>

Options:
  -h, --help            Show this help message
  -o, --output <dir>    Output directory for tokens.json and ast.json
`);
    process.exit(positionals.length === 0 ? 1 : 0);
}

const filename = positionals[0];
const outputDir = values.output ?? '.';

const code = await readFile(filename, 'utf8');

try {
    const tokenizationStart = performance.now();
    const resultTokens = tokenizer(code);
    const resultTokensFiltered = resultTokens.filter(token => token.type !== 'comment' && (token.type !== 'separator' || token.additional !== 'whitespace'));
    console.log(`Tokenization took ${performance.now() - tokenizationStart}ms`);

    writeFile(`${outputDir}/tokens.json`, JSON.stringify(resultTokensFiltered, null, 2), 'utf8');

    const parsingStart = performance.now();
    const parserResult = {
        type: 'script',
        line: 1,
        column: 1,
        body: parser(resultTokensFiltered),
    };
    console.log(`Parsing took ${performance.now() - parsingStart}ms`);

    writeFile(`${outputDir}/ast.json`, JSON.stringify(parserResult, null, 2), 'utf8');

    const globalScope = new LuaScope();
    for (const [key, value] of luaStandardLibrary) {
        globalScope.set(key, value); // Add standard library variables to global scope
    }

    console.log('Interpreting...');
    const interpretingStart = performance.now();
    const ret = runChunk(parserResult.body.tree, globalScope);
    console.log(`File ${filename} returned ${stringifyLuaValue(ret)} after ${performance.now() - interpretingStart}ms`);
} catch (e) {
    if (e instanceof ParsingError) {
        console.error(e.message, e.grammarSymbol.toString(), e.token);
    } else {
        console.error(e);
    }
}
