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

import { ok, strictEqual, throws } from 'node:assert';
import { describe, it } from 'node:test';

import { NonTerminal, Optional, Repeating, Terminal } from './grammar.js';

await describe('Terminal', async () => {
    await it('should create a terminal with a token', () => {
        const terminal = new Terminal({ type: 'reserved', value: 'if' });
        strictEqual(terminal.token.type, 'reserved');
        strictEqual(terminal.token.value, 'if');
    });

    await it('should compare two terminals with same type and value as equal', () => {
        const terminal1 = new Terminal({ type: 'reserved', value: 'if' });
        const terminal2 = new Terminal({ type: 'reserved', value: 'if' });
        ok(terminal1.equals(terminal2));
    });

    await it('should compare two terminals with different types as not equal', () => {
        const terminal1 = new Terminal({ type: 'reserved', value: 'if' });
        const terminal2 = new Terminal({ type: 'identifier', value: 'if' });
        ok(!terminal1.equals(terminal2));
    });

    await it('should compare two terminals with different values as not equal', () => {
        const terminal1 = new Terminal({ type: 'reserved', value: 'if' });
        const terminal2 = new Terminal({ type: 'reserved', value: 'else' });
        ok(!terminal1.equals(terminal2));
    });

    await it('should compare terminal with non-terminal as not equal', () => {
        const terminal = new Terminal({ type: 'reserved', value: 'if' });
        const nonTerminal = new NonTerminal('block');
        ok(!terminal.equals(nonTerminal));
    });

    await it('should compare terminals with additional field', () => {
        const terminal1 = new Terminal({ type: 'operator', value: '+', additional: 'binary' });
        const terminal2 = new Terminal({ type: 'operator', value: '+', additional: 'binary' });
        ok(terminal1.equals(terminal2));
    });

    await it('should compare terminals with different additional fields as not equal', () => {
        const terminal1 = new Terminal({ type: 'operator', value: '-', additional: 'binary' });
        const terminal2 = new Terminal({ type: 'operator', value: '-', additional: 'unary' });
        ok(!terminal1.equals(terminal2));
    });

    await it('should convert terminal to string', () => {
        const terminal = new Terminal({ type: 'reserved', value: 'if' });
        const str = terminal.toString();
        ok(str.includes('reserved'));
        ok(str.includes('if'));
    });
});

await describe('NonTerminal', async () => {
    await it('should create a non-terminal with a rule', () => {
        const nonTerminal = new NonTerminal('block');
        strictEqual(nonTerminal.rule, 'block');
    });

    await it('should compare two non-terminals with same rule as equal', () => {
        const nonTerminal1 = new NonTerminal('block');
        const nonTerminal2 = new NonTerminal('block');
        ok(nonTerminal1.equals(nonTerminal2));
    });

    await it('should compare two non-terminals with different rules as not equal', () => {
        const nonTerminal1 = new NonTerminal('block');
        const nonTerminal2 = new NonTerminal('stat');
        ok(!nonTerminal1.equals(nonTerminal2));
    });

    await it('should compare non-terminal with terminal as not equal', () => {
        const nonTerminal = new NonTerminal('block');
        const terminal = new Terminal({ type: 'reserved', value: 'if' });
        ok(!nonTerminal.equals(terminal));
    });

    await it('should convert non-terminal to string', () => {
        const nonTerminal = new NonTerminal('block');
        strictEqual(nonTerminal.toString(), 'block');
    });
});

await describe('Optional', async () => {
    await it('should create an optional with symbols', () => {
        const optional = new Optional([
            new Terminal({ type: 'reserved', value: 'local' }),
            new NonTerminal('namelist')
        ]);
        strictEqual(optional.symbols.length, 2);
    });

    await it('should throw error when created with non-array', () => {
        throws(() => {
            // @ts-expect-error Testing invalid input
            new Optional('not an array');
        }, /symbols must be an array/);
    });

    await it('should compare two optionals with same symbols as equal', () => {
        const optional1 = new Optional([
            new Terminal({ type: 'reserved', value: 'local' }),
            new NonTerminal('namelist')
        ]);
        const optional2 = new Optional([
            new Terminal({ type: 'reserved', value: 'local' }),
            new NonTerminal('namelist')
        ]);
        ok(optional1.equals(optional2));
    });

    await it('should compare two optionals with different lengths as not equal', () => {
        const optional1 = new Optional([
            new Terminal({ type: 'reserved', value: 'local' })
        ]);
        const optional2 = new Optional([
            new Terminal({ type: 'reserved', value: 'local' }),
            new NonTerminal('namelist')
        ]);
        ok(!optional1.equals(optional2));
    });

    await it('should compare two optionals with different symbols as not equal', () => {
        const optional1 = new Optional([
            new Terminal({ type: 'reserved', value: 'local' })
        ]);
        const optional2 = new Optional([
            new Terminal({ type: 'reserved', value: 'function' })
        ]);
        ok(!optional1.equals(optional2));
    });

    await it('should compare optional with non-optional as not equal', () => {
        const optional = new Optional([new Terminal({ type: 'reserved', value: 'local' })]);
        const terminal = new Terminal({ type: 'reserved', value: 'local' });
        ok(!optional.equals(terminal));
    });

    await it('should convert optional to string with brackets', () => {
        const optional = new Optional([
            new Terminal({ type: 'reserved', value: 'local' }),
            new NonTerminal('namelist')
        ]);
        const str = optional.toString();
        ok(str.startsWith('['));
        ok(str.endsWith(']'));
        ok(str.includes('local'));
        ok(str.includes('namelist'));
    });
});

await describe('Repeating', async () => {
    await it('should create a repeating with symbols', () => {
        const repeating = new Repeating([
            new Terminal({ type: 'separator', value: ',' }),
            new NonTerminal('exp')
        ]);
        strictEqual(repeating.symbols.length, 2);
    });

    await it('should compare two repeatings with same symbols as equal', () => {
        const repeating1 = new Repeating([
            new Terminal({ type: 'separator', value: ',' }),
            new NonTerminal('exp')
        ]);
        const repeating2 = new Repeating([
            new Terminal({ type: 'separator', value: ',' }),
            new NonTerminal('exp')
        ]);
        ok(repeating1.equals(repeating2));
    });

    await it('should compare two repeatings with different lengths as not equal', () => {
        const repeating1 = new Repeating([
            new Terminal({ type: 'separator', value: ',' })
        ]);
        const repeating2 = new Repeating([
            new Terminal({ type: 'separator', value: ',' }),
            new NonTerminal('exp')
        ]);
        ok(!repeating1.equals(repeating2));
    });

    await it('should compare two repeatings with different symbols as not equal', () => {
        const repeating1 = new Repeating([
            new Terminal({ type: 'separator', value: ',' })
        ]);
        const repeating2 = new Repeating([
            new Terminal({ type: 'separator', value: ';' })
        ]);
        ok(!repeating1.equals(repeating2));
    });

    await it('should compare repeating with non-repeating as not equal', () => {
        const repeating = new Repeating([new Terminal({ type: 'separator', value: ',' })]);
        const terminal = new Terminal({ type: 'separator', value: ',' });
        ok(!repeating.equals(terminal));
    });

    await it('should convert repeating to string with curly braces', () => {
        const repeating = new Repeating([
            new Terminal({ type: 'separator', value: ',' }),
            new NonTerminal('exp')
        ]);
        const str = repeating.toString();
        ok(str.startsWith('{'));
        ok(str.endsWith('}'));
        ok(str.includes(','));
        ok(str.includes('exp'));
    });
});
