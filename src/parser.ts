'use strict';

import { Token } from "./tokenizer.js";

type Syntax = {
    chunk: GrammarSymbol[][];
    block: GrammarSymbol[][];
    stat: GrammarSymbol[][];
    attnamelist: GrammarSymbol[][];
    attrib: GrammarSymbol[][];
    retstat: GrammarSymbol[][];
    label: GrammarSymbol[][];
    funcname: GrammarSymbol[][];
    varlist: GrammarSymbol[][];
    var: GrammarSymbol[][];
    namelist: GrammarSymbol[][];
    explist: GrammarSymbol[][];
    exp: GrammarSymbol[][];
    prefixexp: GrammarSymbol[][];
    functioncall: GrammarSymbol[][];
    args: GrammarSymbol[][];
    functiondef: GrammarSymbol[][];
    funcbody: GrammarSymbol[][];
    parlist: GrammarSymbol[][];
    tableconstructor: GrammarSymbol[][];
    fieldlist: GrammarSymbol[][];
    field: GrammarSymbol[][];
    fieldsep: GrammarSymbol[][];
    binop: GrammarSymbol[][];
    unop: GrammarSymbol[][];
};

interface GrammarSymbol {
    equals(other: GrammarSymbol): boolean;
}

/**
 * A terminal is a token that is expected to be found in the code.
 */
class Terminal implements GrammarSymbol {
    #token: Partial<Token>;

    constructor(token: Partial<Token>) {
        this.#token = token;
    }

    get token() {
        return this.#token;
    }

    equals(other: GrammarSymbol): boolean {
        if (!(other instanceof Terminal)) {
            return false;
        }

        for (const prop in this.token) {
            if (!other.token.hasOwnProperty(prop) || this.token[prop as keyof typeof this.token] !== other.token[prop as keyof typeof other.token]) {
                return false;
            }
        }

        return true;
    }

    toString() {
        return JSON.stringify(this.token);
    }
}

/**
 * A non-terminal is a rule that is expected to be found in the code.
 */
class NonTerminal implements GrammarSymbol {
    #rule: keyof Syntax;

    constructor(rule: keyof Syntax) {
        this.#rule = rule;
    }

    get rule() {
        return this.#rule;
    }

    equals(other: GrammarSymbol): boolean {
        if (!(other instanceof NonTerminal)) {
            return false;
        }

        return this.rule === other.rule;
    }

    toString() {
        return '<' + this.rule + '>';
    }
}

/**
 * A repeating is a list of symbols that are expected to be found in the code.
 */
class Repeating implements GrammarSymbol {
    #symbols: GrammarSymbol[];

    constructor(symbols: GrammarSymbol[]) {
        this.#symbols = symbols;
    }

    get symbols() {
        return this.#symbols;
    }

    equals(other: GrammarSymbol): boolean {
        if (!(other instanceof Repeating)) {
            return false;
        }

        if (this.symbols.length !== other.symbols.length) {
            return false;
        }

        for (let i = 0; i < this.symbols.length; i++) {
            if (!this.symbols[i].equals(other.symbols[i])) {
                return false;
            }
        }

        return true;
    }

    toString() {
        return `[${this.symbols.join(', ')}]`;
    }
}

/**
 * An optional is a list of symbols that are expected to be found in the code.
 */
class Optional implements GrammarSymbol {
    #symbols: GrammarSymbol[];

    constructor(symbols: GrammarSymbol[]) {
        if (!Array.isArray(symbols)) {
            throw new Error('symbols must be an array');
        }

        this.#symbols = symbols;
    }

    get symbols() {
        return this.#symbols;
    }

    equals(other: GrammarSymbol): boolean {
        if (!(other instanceof Optional)) {
            return false;
        }

        if (this.symbols.length !== other.symbols.length) {
            return false;
        }

        for (let i = 0; i < this.symbols.length; i++) {
            if (!this.symbols[i].equals(other.symbols[i])) {
                return false;
            }
        }

        return true;
    }

    toString() {
        return `[${this.symbols.join(', ')}]`;
    }
}

export class ParsingError extends Error {
    #grammarSymbol: GrammarSymbol;
    #token: Token;

    constructor(message: string, grammarSymbol: GrammarSymbol, token: Token) {
        super(message);

        this.#grammarSymbol = grammarSymbol;
        this.#token = token;
    }

    get grammarSymbol() {
        return this.#grammarSymbol;
    }

    get token() {
        return this.#token;
    }
}

const syntax: Syntax = {
    /**
     * chunk ::= block
     */
    chunk: [
        [new NonTerminal('block'), new Terminal({ type: 'EOF' })],
    ],

    /**
     * block ::= {stat} [retstat]
     */
    block: [
        [new Repeating([new NonTerminal('stat')]), new Optional([new NonTerminal('retstat')])],
    ],

    /**
     * stat ::=  ‘;’ |
     *  varlist ‘=’ explist |
     *  functioncall |
     *  label |
     *  ‘break’ |
     *  ‘goto’ Name |
     *  ‘do’ block ‘end’ |
     *  ‘while’ exp ‘do’ block ‘end’ |
     *  ‘repeat’ block ‘until’ exp |
     *  ‘if’ exp ‘then’ block {‘elseif’ exp ‘then’ block} [‘else’ block] ‘end’ |
     *  ‘for’ Name ‘=’ exp ‘,’ exp [‘,’ exp] ‘do’ block ‘end’ |
     *  ‘for’ namelist ‘in’ explist ‘do’ block ‘end’ |
     *  ‘function’ funcname funcbody |
     *  ‘local’ ‘function’ Name funcbody |
     *  ‘local’ attnamelist [‘=’ explist]
     */
    stat: [
        [new Terminal({ type: 'separator', value: ';' })],
        [new NonTerminal('varlist'), new Terminal({ type: 'operator', value: '=' }), new NonTerminal('explist')],
        [new NonTerminal('functioncall')],
        [new NonTerminal('label')],
        [new Terminal({ type: 'reserved', value: 'BREAK' })],
        [new Terminal({ type: 'reserved', value: 'GOTO' }), new Terminal({ type: 'identifier' })],
        [new Terminal({ type: 'reserved', value: 'DO' }), new NonTerminal('block'), new Terminal({ type: 'reserved', value: 'END' })],
        [new Terminal({ type: 'reserved', value: 'WHILE' }), new NonTerminal('exp'), new Terminal({ type: 'reserved', value: 'DO' }), new NonTerminal('block'), new Terminal({ type: 'reserved', value: 'END' })],
        [new Terminal({ type: 'reserved', value: 'REPEAT' }), new NonTerminal('block'), new Terminal({ type: 'reserved', value: 'UNTIL' }), new NonTerminal('exp')],
        [new Terminal({ type: 'reserved', value: 'IF' }), new NonTerminal('exp'), new Terminal({ type: 'reserved', value: 'THEN' }), new NonTerminal('block'), new Repeating([new Terminal({ type: 'reserved', value: 'ELSEIF' }), new NonTerminal('exp'), new Terminal({ type: 'reserved', value: 'THEN' }), new NonTerminal('block')]), new Optional([new Terminal({ type: 'reserved', value: 'ELSE' }), new NonTerminal('block')]), new Terminal({ type: 'reserved', value: 'END' })],
        [new Terminal({ type: 'reserved', value: 'FOR' }), new Terminal({ type: 'identifier' }), new Terminal({ type: 'operator', value: '=' }), new NonTerminal('exp'), new Terminal({ type: 'separator', value: ',' }), new NonTerminal('exp'), new Optional([new Terminal({ type: 'separator', value: ',' }), new NonTerminal('exp')]), new Terminal({ type: 'reserved', value: 'DO' }), new NonTerminal('block'), new Terminal({ type: 'reserved', value: 'END' })],
        [new Terminal({ type: 'reserved', value: 'FOR' }), new NonTerminal('namelist'), new Terminal({ type: 'reserved', value: 'IN' }), new NonTerminal('explist'), new Terminal({ type: 'reserved', value: 'DO' }), new NonTerminal('block'), new Terminal({ type: 'reserved', value: 'END' })],
        [new Terminal({ type: 'reserved', value: 'FUNCTION' }), new NonTerminal('funcname'), new NonTerminal('funcbody')],
        [new Terminal({ type: 'reserved', value: 'LOCAL' }), new Terminal({ type: 'reserved', value: 'FUNCTION' }), new Terminal({ type: 'identifier' }), new NonTerminal('funcbody')],
        [new Terminal({ type: 'reserved', value: 'LOCAL' }), new NonTerminal('namelist'), new Optional([new Terminal({ type: 'operator', value: '=' }), new NonTerminal('explist')])],
    ],

    /**
     * attnamelist ::= Name attrib {‘,’ Name attrib}
     */
    attnamelist: [
        [new Terminal({ type: 'identifier' }), new NonTerminal('attrib'), new Repeating([new Terminal({ type: 'separator', value: ',' }), new Terminal({ type: 'identifier' }), new NonTerminal('attrib')])],
    ],

    /**
     * attrib ::= [‘<’ Name ‘>’]
     */
    attrib: [
        [new Terminal({ type: 'operator', value: '<' }), new Terminal({ type: 'identifier' }), new Terminal({ type: 'operator', value: '>' })],
    ],

    /**
     * retstat ::= ‘return’ [explist] [‘;’]
     */
    retstat: [
        [new Terminal({ type: 'reserved', value: 'RETURN' }), new Optional([new NonTerminal('explist')]), new Optional([new Terminal({ type: 'separator', value: ';' })])],
    ],

    /**
     * label ::= ‘::’ Name ‘::’
     */
    label: [
        [new Terminal({ type: 'separator', value: '::' }), new Terminal({ type: 'identifier' }), new Terminal({ type: 'separator', value: '::' })],
    ],

    /**
     * funcname ::= Name {‘.’ Name} [‘:’ Name]
     */
    funcname: [
        [new Terminal({ type: 'identifier' }), new Repeating([new Terminal({ type: 'separator', value: '.' }), new Terminal({ type: 'identifier' })]), new Optional([new Terminal({ type: 'separator', value: ':' }), new Terminal({ type: 'identifier' })])],
    ],

    /**
     * varlist ::= var {‘,’ var}
     */
    varlist: [
        [new NonTerminal('var'), new Repeating([new Terminal({ type: 'separator', value: ',' }), new NonTerminal('var')])],
    ],

    /**
     * var ::= Name | prefixexp ‘[’ exp ‘]’ | prefixexp ‘.’ Name
     */
    var: [
        [new Terminal({ type: 'identifier' })],
        [new NonTerminal('prefixexp'), new Terminal({ type: 'separator', value: '[' }), new NonTerminal('exp'), new Terminal({ type: 'separator', value: ']' })],
        [new NonTerminal('prefixexp'), new Terminal({ type: 'separator', value: '.' }), new Terminal({ type: 'identifier' })],
    ],

    /**
     * namelist ::= Name {‘,’ Name}
     */
    namelist: [
        [new Terminal({ type: 'identifier' }), new Repeating([new Terminal({ type: 'separator', value: ',' }), new Terminal({ type: 'identifier' })])],
    ],

    /**
     * explist ::= exp {‘,’ exp}
     */
    explist: [
        [new NonTerminal('exp'), new Repeating([new Terminal({ type: 'separator', value: ',' }), new NonTerminal('exp')])],
    ],

    /**
     * exp ::= ‘nil’ | ‘false’ | ‘true’ | Numeral | LiteralString | ‘...’ | functiondef |
     *  prefixexp | tableconstructor | exp binop exp | unop exp
     */
    exp: [
        [new Terminal({ type: 'reserved', value: 'NIL' })],
        [new Terminal({ type: 'reserved', value: 'FALSE' })],
        [new Terminal({ type: 'reserved', value: 'TRUE' })],
        [new Terminal({ type: 'constant', additional: 'number' })],
        [new Terminal({ type: 'constant', additional: 'string' })],
        [new Terminal({ type: 'operator', value: '...' })],
        [new NonTerminal('functiondef')],
        [new NonTerminal('prefixexp')],
        [new NonTerminal('tableconstructor')],
        [new NonTerminal('exp'), new NonTerminal('binop'), new NonTerminal('exp')],
        [new NonTerminal('unop'), new NonTerminal('exp')],
    ],

    /**
     * prefixexp ::= var | functioncall | ‘(’ exp ‘)’
     */
    prefixexp: [
        [new NonTerminal('var')],
        [new NonTerminal('functioncall')],
        [new Terminal({ type: 'separator', value: '(' }), new NonTerminal('exp'), new Terminal({ type: 'separator', value: ')' })],
    ],

    /**
     * functioncall ::=  prefixexp args | prefixexp ‘:’ Name args
     */
    functioncall: [
        [new NonTerminal('prefixexp'), new NonTerminal('args')],
        [new NonTerminal('prefixexp'), new Terminal({ type: 'separator', value: ':' }), new Terminal({ type: 'identifier' }), new NonTerminal('args')],
    ],

    /**
     * args ::=  ‘(’ [explist] ‘)’ | tableconstructor | LiteralString
     */
    args: [
        [new Terminal({ type: 'separator', value: '(' }), new Optional([new NonTerminal('explist')]), new Terminal({ type: 'separator', value: ')' })],
        [new NonTerminal('tableconstructor')],
        [new Terminal({ type: 'constant', additional: 'string' })],
    ],

    /**
     * functiondef ::= ‘function’ funcbody
     */
    functiondef: [
        [new Terminal({ type: 'reserved', value: 'FUNCTION' }), new NonTerminal('funcbody')],
    ],

    /**
     * funcbody ::= ‘(’ [parlist] ‘)’ block ‘end’
     */
    funcbody: [
        [new Terminal({ type: 'separator', value: '(' }), new Optional([new NonTerminal('parlist')]), new Terminal({ type: 'separator', value: ')' }), new NonTerminal('block'), new Terminal({ type: 'reserved', value: 'END' })],
    ],

    /**
     * parlist ::= namelist [‘,’ ‘...’] | ‘...’
     */
    parlist: [
        [new NonTerminal('namelist'), new Optional([new Terminal({ type: 'separator', value: ',' }), new Terminal({ type: 'operator', value: '...' })])],
        [new Terminal({ type: 'operator', value: '...' })],
    ],

    /**
     * tableconstructor ::= ‘{’ [fieldlist] ‘}’
     */
    tableconstructor: [
        [new Terminal({ type: 'separator', value: '{' }), new Optional([new NonTerminal('fieldlist')]), new Terminal({ type: 'separator', value: '}' })],
    ],

    /**
     * fieldlist ::= field {fieldsep field} [fieldsep]
     */
    fieldlist: [
        [new NonTerminal('field'), new Repeating([new NonTerminal('fieldsep'), new NonTerminal('field')]), new Optional([new NonTerminal('fieldsep')])],
    ],

    /**
     * field ::= ‘[’ exp ‘]’ ‘=’ exp | Name ‘=’ exp | exp
     */
    field: [
        [new Terminal({ type: 'separator', value: '[' }), new NonTerminal('exp'), new Terminal({ type: 'separator', value: ']' }), new Terminal({ type: 'operator', value: '=' }), new NonTerminal('exp')],
        [new Terminal({ type: 'identifier' }), new Terminal({ type: 'operator', value: '=' }), new NonTerminal('exp')],
        [new NonTerminal('exp')],
    ],

    /**
     * fieldsep ::= ‘,’ | ‘;’
     */
    fieldsep: [
        [new Terminal({ type: 'separator', value: ',' })],
        [new Terminal({ type: 'separator', value: ';' })],
    ],

    /**
     * binop ::=  ‘+’ | ‘-’ | ‘*’ | ‘/’ | ‘//’ | ‘^’ | ‘%’ |
     *  ‘&’ | ‘~’ | ‘|’ | ‘>>’ | ‘<<’ | ‘..’ |
     *  ‘<’ | ‘<=’ | ‘>’ | ‘>=’ | ‘==’ | ‘~=’ |
     *  ‘and’ | ‘or’
     */
    binop: [
        [new Terminal({ type: 'operator', value: '+' })],
        [new Terminal({ type: 'operator', value: '-' })],
        [new Terminal({ type: 'operator', value: '*' })],
        [new Terminal({ type: 'operator', value: '/' })],
        [new Terminal({ type: 'operator', value: '//' })],
        [new Terminal({ type: 'operator', value: '^' })],
        [new Terminal({ type: 'operator', value: '%' })],

        [new Terminal({ type: 'operator', value: '&' })],
        [new Terminal({ type: 'operator', value: '~' })],
        [new Terminal({ type: 'operator', value: '|' })],
        [new Terminal({ type: 'operator', value: '>>' })],
        [new Terminal({ type: 'operator', value: '<<' })],

        [new Terminal({ type: 'operator', value: '..' })],

        [new Terminal({ type: 'operator', value: '<' })],
        [new Terminal({ type: 'operator', value: '<=' })],
        [new Terminal({ type: 'operator', value: '>' })],
        [new Terminal({ type: 'operator', value: '>=' })],
        [new Terminal({ type: 'operator', value: '==' })],
        [new Terminal({ type: 'operator', value: '~=' })],
        [new Terminal({ type: 'reserved', value: 'AND' })],
        [new Terminal({ type: 'reserved', value: 'OR' })],
    ],

    /**
     * unop ::= ‘-’ | ‘not’ | ‘#’ | ‘~’
     */
    unop: [
        [new Terminal({ type: 'operator', value: '-' })],
        [new Terminal({ type: 'reserved', value: 'NOT' })],
        [new Terminal({ type: 'operator', value: '#' })],
        [new Terminal({ type: 'operator', value: '~' })],
    ],
};

type ParseToken = Token & { __matches__: string[]; };

function precedence(operator: ParseToken): number {
    if (operator.type !== 'operator') {
        throw new Error('Expected operator');
    }

    switch (operator.value) {
        case '^':
            return 12;
        case 'NOT':
        case '#':
        case '~':
            return 11;
        case '*':
        case '/':
        case '//':
        case '%':
            return 10;
        case '+':
        case '-':
            return 9;
        case '..':
            return 8;
        case '<<':
        case '>>':
            return 7;
        case '&':
            return 6;
        case '~':
            return 5;
        case '|':
            return 4;
        case '<':
        case '>':
        case '<=':
        case '>=':
        case '~=':
        case '==':
            return 3;
        case 'AND':
            return 2;
        case 'OR':
            return 1;
    }

    return 0;
}

type AbstractSyntaxTree = {
    rule: keyof Syntax;
    parsed: {
        grammarSymbol: GrammarSymbol;
        token?: Token;
    }[];
    children: AbstractSyntaxTree[];
};

function tokensMatchSymbols(symbols: GrammarSymbol[], tokens: Token[], i: number = 0, stack: { rule: keyof Syntax; i: number; j: number; }[] = []): {
    matches: false;
    error: string;
} | {
    matches: true;
    parsedTokens: number;
    parsed: { grammarSymbol: GrammarSymbol; token?: Token; children?: AbstractSyntaxTree[]; }[];
} {
    let j = i;
    const parsed: { grammarSymbol: GrammarSymbol; token?: Token; children?: AbstractSyntaxTree[]; }[] = [];

    for (const grammarSymbol of symbols) {
        if (grammarSymbol instanceof Terminal) {
            // Terminal, check if the token matches
            for (const property in grammarSymbol.token) {
                if (grammarSymbol.token[property as keyof typeof grammarSymbol.token] !== tokens[j][property as keyof Token]) {
                    return { matches: false, error: `Expected token ${JSON.stringify(grammarSymbol.token)} but got ${JSON.stringify(tokens[j])}` };
                }
            }

            parsed.push({ grammarSymbol, token: tokens[j] });

            j++;
        } else if (grammarSymbol instanceof NonTerminal) {
            // Non-terminal, check if the rule matches
            const matchingResult = ruleMatches(grammarSymbol.rule, tokens, j, stack);
            if (!matchingResult.matches) {
                return { matches: false, error: `No rule matches for ${grammarSymbol.rule}` };
            }

            j += matchingResult.parsedTokens; // Skip the tokens that were matched

            parsed.push({ grammarSymbol, children: [matchingResult.tree] });
        } else if (grammarSymbol instanceof Optional) {
            const matchingResult = tokensMatchSymbols(grammarSymbol.symbols, tokens, j, stack);
            if (!matchingResult.matches) {
                continue;
            }

            j += matchingResult.parsedTokens; // Skip the tokens that were matched

            for (const p of matchingResult.parsed) {
                parsed.push(p);
            }
        } else if (grammarSymbol instanceof Repeating) {
            while (true) {
                const matchingResult = tokensMatchSymbols(grammarSymbol.symbols, tokens, j, stack);
                if (!matchingResult.matches) {
                    break;
                }

                j += matchingResult.parsedTokens; // Skip the tokens that were matched

                for (const p of matchingResult.parsed) {
                    parsed.push(p);
                }
            }

            continue;
        } else {
            throw new Error('Unknown grammar symbol');
        }
    }

    return { matches: true, parsedTokens: j - i, parsed };
}

function ruleMatches(rule: keyof Syntax, tokens: Token[], i: number = 0, stack: { rule: keyof Syntax; i: number; j: number; }[] = []): {
    matches: false;
    error: string;
} | {
    matches: true;
    parsedTokens: number;
    tree: AbstractSyntaxTree,
} {
    // TODO: fix operator precedence

    const tree: AbstractSyntaxTree = {
        rule,
        parsed: [],
        children: [],
    };
    let maxI = -1;

    const parserRules = syntax[rule];
    for (let j = 0; j < parserRules.length; j++) {
        if (stack.find(r => r.rule === rule && r.i === i && r.j === j)) {
            // Avoid left recursion, we already are in this rule
            continue;
        }

        stack.push({ rule, i, j });

        try {
            const symbols = parserRules[j];
            const matchingResult = tokensMatchSymbols(symbols, tokens, i, stack);
            if (!matchingResult.matches) {
                continue;
            }

            const newI = i + matchingResult.parsedTokens;
            const parsed = matchingResult.parsed;

            if (newI > maxI) {
                maxI = newI;
                tree.parsed = parsed;
            }
        } finally {
            stack.pop();
        }
    }

    if (maxI === -1) {
        return { matches: false, error: `No rule matches for ${rule}` };
    }

    const parsedTokens = maxI - i;

    return { matches: true, parsedTokens, tree };
}

export function parser(tokens: Token[]): {
    tree: AbstractSyntaxTree,
} {
    const parsed = ruleMatches('chunk', tokens);
    if (!parsed.matches) {
        throw new Error(parsed.error);
    }

    return parsed; // Check if the tokens are a valid chunk
}
