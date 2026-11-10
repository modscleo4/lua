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

/**
 * Tokens for Lua
 */
const tokens = {
    reserved: new Set([
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
    ]),
    identifiers: [
        /([a-zA-Z_][a-zA-Z0-9_]*)/y,
    ],
    operators: new Set([
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
    ]),
    whitespace: new Set([
        ' ',
        '\t',
        '\n',
        '\r',
    ]),
    separators: new Set([
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
    ]),
    constants: [
        { regex: /'(.+?)?(?=')'/y, type: 'string', },
        { regex: /"(.+?)?(?=")"/y, type: 'string', },
        { regex: /\[(=*)\[\n?(.+?)?(?=\n?\]\1\])\n?\]\1\]/sy, type: 'string', },

        { regex: /(0x[0-9a-fA-F]+(\.[0-9a-fA-F]+)?[pP][+-]?[0-9a-fA-F]+)/y, type: 'number', },
        { regex: /(0x[0-9a-fA-F]+(?:\.[0-9a-fA-F]+)?)/y, type: 'number', },
        { regex: /(\d+(\.\d+)?[eE][+-]?\d+)/y, type: 'number', },
        { regex: /(\d+(?:\.\d+)?)/y, type: 'number', },
    ],
    comments: [
        /--\[(=*)\[\n?(.+?)?(?=\n?\]\1\])\n?\]\1\]/sy,
        /--(?!\[=*\[)([^\n]*)\n/y,
    ],
};

// Precompute operator greedy matcher (3 -> 2 -> 1 chars) without regex
const operatorSet = tokens.operators;
const operatorMaxLen = 3;
function matchOperatorAt(code: string, pos: number): string | null {
    for (let len = operatorMaxLen; len >= 1; len--) {
        if (pos + len > code.length) continue;
        const slice = code.substring(pos, pos + len);
        if (operatorSet.has(slice.toUpperCase())) return slice;
    }
    return null;
}

// Greedy separator matcher: currently supports multi-char '::' plus single-char set.
const separatorSet = tokens.separators;
function matchSeparatorAt(code: string, pos: number): string | null {
    if (pos + 2 <= code.length) {
        const two = code.substring(pos, pos + 2);
        if (separatorSet.has(two)) return two;
    }

    const one = code[pos];
    if (separatorSet.has(one)) return one;
    return null;
}

export type Token = {
    type: 'comment' | 'operator' | 'constant' | 'reserved' | 'identifier' | 'separator' | 'EOF',
    // The actual matched string from source
    match: string,
    // The normalized/processed value
    value: string,
    // Extra info like 'whitespace' for separators or type for constants
    additional: string | null,
    line?: number,
    column?: number,
};

export function tokenizer(code: string, includeWhitespace: boolean = false, includeComments: boolean = true): Token[] {
    // Ensure code ends with newline for patterns relying on trailing \n (e.g., single-line comments)
    code += `\n`;

    const resultTokens: Token[] = [];
    let line = 1;
    let column = 0; // column of last processed char (0-based internal)

    // Helper: execute a sticky regex at current position
    const execSticky = (r: RegExp, pos: number): RegExpExecArray | null => {
        r.lastIndex = pos;
        const m = r.exec(code);
        return m && m.index === pos ? m : null;
    };

    // Helper: push token and advance position/line/column
    let i = 0;
    let wasCR = false;
    const pushToken = (t: Omit<Token, 'line' | 'column'>, match: string) => {
        const token: Token = { ...t, line: line, column: column + 1 };
        // Apply filters
        const isWhitespaceSep = token.type === 'separator' && token.additional === 'whitespace';
        const isComment = token.type === 'comment';
        if (!(isWhitespaceSep && !includeWhitespace) && !(isComment && !includeComments)) {
            resultTokens.push(token);
        }

        // Advance accounting
        for (let k = 0; k < match.length; k++) {
            const ch = match[k];
            if (ch === '\n') {
                if (!wasCR) {
                    line++;
                }

                column = 0;
                wasCR = false;
            } else if (ch === '\r') {
                line++;
                column = 0;
                wasCR = true;
            } else {
                column++;
                wasCR = false;
            }
        }
        i += match.length;
    };

    const isWhitespace = (ch: string) => tokens.whitespace.has(ch);
    const isSeparator = (ch: string) => tokens.separators.has(ch);

    while (i < code.length - 1) {
        const startLine = line;
        const startCol = column + 1;

        // 1) Comments (sticky exec at current index)
        let matched = false;
        for (const r of tokens.comments) {
            const m = execSticky(r, i);
            if (m) {
                const matchStr = m[0];
                const value = (m[2] ?? m[1]) ?? '';
                const additional = m[2] === undefined ? null : (m[1] ?? null);
                pushToken({ type: 'comment', match: matchStr, value, additional }, matchStr);
                matched = true;
                break;
            }
        }
        if (matched) continue;

        const ch = code[i];

        // 2) Whitespace separators (single char)
        if (isWhitespace(ch)) {
            pushToken({ type: 'separator', match: ch, value: ch, additional: 'whitespace' }, ch);
            continue;
        }

        // 3) Operators (longest-first)
        const op = matchOperatorAt(code, i);
        if (op) {
            pushToken({ type: 'operator', match: op, value: op.toUpperCase(), additional: null }, op);
            continue;
        }

        // 4) Constants (numbers/strings)
        for (const { regex, type } of tokens.constants) {
            const m = execSticky(regex, i);
            if (m) {
                const matchStr = m[0];
                const value = (m[2] ?? m[1]) ?? '';
                pushToken({ type: 'constant', match: matchStr, value, additional: type }, matchStr);
                matched = true;
                break;
            }
        }
        if (matched) continue;

        // 5) Identifiers / Reserved words
        for (const r of tokens.identifiers) {
            const m = execSticky(r, i);
            if (m) {
                const matchStr = m[0];
                const id = m[1];
                const upper = id.toUpperCase();
                if (tokens.reserved.has(upper)) {
                    pushToken({ type: 'reserved', match: matchStr, value: upper, additional: null }, matchStr);
                } else {
                    pushToken({ type: 'identifier', match: matchStr, value: id, additional: null }, matchStr);
                }
                matched = true;
                break;
            }
        }
        if (matched) continue;

        // 6) Separators (punctuation/brackets; greedy for multi-char like '::')
        const sep = matchSeparatorAt(code, i);
        if (sep) {
            pushToken({ type: 'separator', match: sep, value: sep, additional: tokens.whitespace.has(sep) ? 'whitespace' : null }, sep);
            continue;
        }

        // Unknown token at this position
        throw new Error(`Token unknown at line ${startLine}, column ${startCol}: '${code[i]}'`);
    }

    // EOF marker
    resultTokens.push({ type: 'EOF', match: '', value: 'EOF', additional: null, line, column });
    return resultTokens;
}
