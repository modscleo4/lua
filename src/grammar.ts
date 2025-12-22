/**
 * Copyright 2025 Dhiego Cassiano Fogaça Barbosa

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

import type { Token } from './tokenizer.js';

export interface GrammarSymbol {
    equals(other: GrammarSymbol): boolean;
}

/**
 * A terminal is a token that is expected to be found in the code.
 */
export class Terminal implements GrammarSymbol {
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

        // Fast compare for common fields
        const a = this.#token;
        const b = other.#token;
        if (a.type !== undefined && a.type !== b.type) return false;
        if (a.value !== undefined && a.value !== b.value) return false;
        if (a.additional !== undefined && a.additional !== b.additional) return false;

        return true;
    }

    toString() {
        return '‘' + JSON.stringify(this.token) + '’';
    }
}

/**
 * A non-terminal is a rule that is expected to be found in the code.
 */
export class NonTerminal implements GrammarSymbol {
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
        return this.rule as string;
    }
}

/**
 * A repeating is a list of symbols that are expected to be found in the code.
 */
export class Repeating implements GrammarSymbol {
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
        return `{${this.symbols.join(', ')}}`;
    }
}

/**
 * An optional is a list of symbols that are expected to be found in the code.
 */
export class Optional implements GrammarSymbol {
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

// Re-export type used in NonTerminal without importing Syntax here.
// TypeScript will resolve keyof Syntax at usage site.
export type Syntax = {
    chunk: any;
    block: any;
    stat: any;
    attnamelist: any;
    attrib: any;
    retstat: any;
    label: any;
    funcname: any;
    varlist: any;
    var: any;
    namelist: any;
    explist: any;
    exp: any;
    prefixexp: any;
    functioncall: any;
    args: any;
    functiondef: any;
    funcbody: any;
    parlist: any;
    tableconstructor: any;
    fieldlist: any;
    field: any;
    fieldsep: any;
    binop: any;
    unop: any;
};
