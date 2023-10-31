'use strict';

import { tokenizer } from "./tokenizer.js";
import { ParsingError, parser } from "./parser.js";
import { readFileSync } from "fs";

const code = readFileSync('test.lua', 'utf8');

try {
    const resultTokens = tokenizer(code);
    const resultTokensFiltered = resultTokens.filter(token => token.type !== 'comment' && (token.type !== 'separator' || token.additional !== 'whitespace'));

    const knownIdentifiers = {};

    console.log(resultTokensFiltered);

    const abstractSyntaxTree = {
        type: 'script',
        line: 1,
        column: 1,
        body: parser(resultTokensFiltered),
    };

    console.dir(abstractSyntaxTree, { depth: null });
} catch (e) {
    if (e instanceof ParsingError) {
        console.error(e.message, e.grammarSymbol.toString(), e.token);
    } else {
        console.error(e);
    }
}
