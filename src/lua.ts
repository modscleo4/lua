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
