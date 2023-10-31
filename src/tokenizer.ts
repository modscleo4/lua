'use strict';

/**
 * Tokens for Lua
 */
const tokens = {
    reserved: [
        'AND',
        'BREAK',
        'DO',
        'ELSE',
        'ELSEIF',
        'END',
        'FALSE',
        'FOR',
        'FUNCTION',
        'IF',
        'IN',
        'LOCAL',
        'NIL',
        'NOT',
        'OR',
        'REPEAT',
        'RETURN',
        'THEN',
        'TRUE',
        'UNTIL',
        'WHILE',
    ],
    identifiers: [
        /^([a-zA-Z_][a-zA-Z0-9_]*)$/,
    ],
    operators: [
        '=',

        '~=',
        '==',
        '<',
        '>',
        '<=',
        '>=',

        '+',
        '-',
        '*',
        '/',
        '//',
        '%',
        '^',

        '&',
        '|',
        '~',
        '>>',
        '<<',
        '~',

        '#',
        '..',

        '...',
    ],
    whitespace: [
        ' ',
        '\t',
        '\n',
        '\r',
    ],
    separators: [
        ' ',
        '\t',
        '\n',
        '\r',

        ':',
        '::',
        ';',
        ',',
        '.',
        '(',
        ')',
        '{',
        '}',
        '[',
        ']',
    ],
    constants: [
        /^'(.+?)?(?=')'$/,
        /^"(.+?)?(?=")"$/,
        /^\[(=*)\[\n?(.+?)?(?=\n?\]\1\])\n?\]\1\]$/s,

        /^(\d+(?:\.\d+)?)$/,
        /^(\d+(\.\d+)?[eE][+-]?\d+)$/,
        /^(0x[0-9a-fA-F]+(?:\.[0-9a-fA-F]+)?)$/,
        /^(0x[0-9a-fA-F]+(\.[0-9a-fA-F]+)?[pP][+-]?[0-9a-fA-F]+)$/,
    ],
    comments: [
        /^--\[(=*)\[\n?(.+?)?(?=\n?\]\1\])\n?\]\1\]$/s,
        /^--(?!\[=*\[)([^\n]*)\n$/,
    ],
};

function constantType(str: string): string | null {
    const types = {
        'string': [
            /^'(.+?)?(?=')'$/,
            /^"(.+?)?(?=")"$/,
            /^\[(=*)\[\n?(.+?)?(?=\n?\]\1\])\n?\]\1\]$/s,
        ],
        'number': [
            /^([-]?\d+(?:\.\d+)?)$/,
            /^(\d+(\.\d+)?[eE][-]?\d+)$/,
            /^(0x[0-9a-fA-F]+)$/,
        ],
    };

    for (const type in types) {
        for (const regex of types[type as keyof typeof types]) {
            if (regex.test(str)) {
                return type;
            }
        }
    }

    return null;
}

export type Token = {
    type: string,
    match: string,
    value: string,
    additional: string | null,
    line?: number,
    column?: number,
};

function tokenize(str: string, { comments = true, operators = true, constants = true, reserved = true, identifiers = true, separators = true } = {}): Token | null {
    if (comments && tokens.comments.some(regex => regex.test(str))) {
        const regex = tokens.comments.find(regex => regex.test(str))!;
        const regexMatch = str.match(regex)!;

        return {
            type: 'comment',
            match: str,
            value: regexMatch[2] ?? regexMatch[1],
            additional: regexMatch[2] === undefined ? null : regexMatch[1],
        };
    } else if (operators && tokens.operators.includes(str.toUpperCase())) {
        return {
            type: 'operator',
            match: str,
            value: str.toUpperCase(),
            additional: null,
        };
    } else if (constants && tokens.constants.some(regex => regex.test(str))) {
        const regex = tokens.constants.find(regex => regex.test(str))!;
        const regexMatch = str.match(regex)!;

        return {
            type: 'constant',
            match: str,
            value: regexMatch[2] ?? regexMatch[1],
            additional: constantType(str),
        };
    } else if (reserved && tokens.reserved.includes(str.toUpperCase())) {
        return {
            type: 'reserved',
            match: str,
            value: str.toUpperCase(),
            additional: null,
        };
    } else if (identifiers && tokens.identifiers.some(regex => regex.test(str))) {
        const regex = tokens.identifiers.find(regex => regex.test(str))!;
        const regexMatch = str.match(regex)!;

        return {
            type: 'identifier',
            match: str,
            value: regexMatch[1],
            additional: null,
        };
    } else if (separators && tokens.separators.includes(str)) {
        return {
            type: 'separator',
            match: str,
            value: str,
            additional: tokens.whitespace.includes(str) ? 'whitespace' : null,
        };
    } else {
        return null;
    }
}

function tryTokenize(code: string, lastI: number, i: number, k: number = 1, tokenizerOptions = {}): { result: Token | null, search: string, k: number; } {
    let search = code.substring(lastI, i + k);
    let result;

    while (!(result = tokenize(search, tokenizerOptions)) && (i + k + 1) <= code.length) {
        k++;
        search = code.substring(lastI, i + k);
    }

    if (result) {
        while ((result = tokenize(search, tokenizerOptions)) && (i + k + 1) <= code.length) {
            k++;
            search = code.substring(lastI, i + k);
        }

        k--;
        search = code.substring(lastI, i + k);
        result = tokenize(search, tokenizerOptions);
    }

    return { result, search, k };
}

export function tokenizer(code: string): Token[] {
    code += `\n`;

    const resultTokens: Token[] = [];

    let includeWhitespace = false;
    let includeComments = true;
    let line = 1;
    let column = 0;
    let toProcess = 0;

    let lastI = 0;

    for (let i = 0; i < code.length - 1; i++) {
        if (code[i] === '\n' || code[i] === '\r') {
            line++;
            column = -1;
        }

        column++;

        if (toProcess > 0) {
            toProcess--;
            continue;
        }

        let result;
        let search = '';
        let k = 1;

        ({ result, search, k } = tryTokenize(code, lastI, i, k, { comments: true, operators: false, constants: false, reserved: false, identifiers: false, separators: false }));

        if (!result) {
            k = 1;
            ({ result, search, k } = tryTokenize(code, lastI, i, k, { comments: false, operators: true, constants: true, reserved: true, identifiers: false, separators: false }));
        }

        if (!result || result.type === 'reserved') {
            let oldResult = result;
            let oldK = k;

            k = (!result) ? 1 : k + 1;

            ({ result, search, k } = tryTokenize(code, lastI, i, k, { comments: false, operators: false, constants: false, reserved: false, identifiers: true, separators: false }));

            if (!result) {
                result = oldResult;
            }
        }

        if (!result) {
            k = 1;
            ({ result, search, k } = tryTokenize(code, lastI, i, k, { comments: false, operators: false, constants: false, reserved: false, identifiers: false, separators: true }));
        }

        if (!result) {
            console.error(resultTokens);
            throw new Error(`Token unknown at line ${line}, column ${column}: '${search}'`);
        } else {
            if (!includeWhitespace && result.type === 'separator' && result.additional === 'whitespace') {
                // continue;
            } else if (!includeComments && result.type === 'comment') {
                // continue;
            } else {
                resultTokens.push({ ...result, line, column });
            }

            toProcess = result.match.length - 1;

            lastI = i + result.match.length;
        }
    }

    resultTokens.push({ type: 'EOF', match: '', value: 'EOF', additional: null, line, column });

    return resultTokens;
}
