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

import { ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { tokenizer } from './tokenizer.js';

await describe('Reserved', async () => {
    await it('should tokenize reserved keywords', () => {
        const tokens = tokenizer('if then else end');
        strictEqual(tokens[0].type, 'reserved');
        strictEqual(tokens[0].value, 'IF');
        strictEqual(tokens[1].type, 'reserved');
        strictEqual(tokens[1].value, 'THEN');
        strictEqual(tokens[2].type, 'reserved');
        strictEqual(tokens[2].value, 'ELSE');
        strictEqual(tokens[3].type, 'reserved');
        strictEqual(tokens[3].value, 'END');
    });

    await it('should tokenize all reserved words', () => {
        const code = 'and break do else elseif end false for function if in local nil not or repeat return then true until while';
        const tokens = tokenizer(code);
        const reserved = ['AND', 'BREAK', 'DO', 'ELSE', 'ELSEIF', 'END', 'FALSE', 'FOR', 'FUNCTION', 'IF', 'IN', 'LOCAL', 'NIL', 'NOT', 'OR', 'REPEAT', 'RETURN', 'THEN', 'TRUE', 'UNTIL', 'WHILE'];

        reserved.forEach((word, i) => {
            strictEqual(tokens[i].type, 'reserved');
            strictEqual(tokens[i].value, word);
        });
    });

    await it('should be case insensitive', () => {
        const tokens = tokenizer('IF If iF if');
        strictEqual(tokens[0].value, 'IF');
        strictEqual(tokens[1].value, 'IF');
        strictEqual(tokens[2].value, 'IF');
        strictEqual(tokens[3].value, 'IF');
    });
});

await describe('Identifiers', async () => {
    await it('should tokenize identifiers', () => {
        const tokens = tokenizer('foo bar _baz test123');
        strictEqual(tokens[0].type, 'identifier');
        strictEqual(tokens[0].value, 'foo');
        strictEqual(tokens[1].type, 'identifier');
        strictEqual(tokens[1].value, 'bar');
        strictEqual(tokens[2].type, 'identifier');
        strictEqual(tokens[2].value, '_baz');
        strictEqual(tokens[3].type, 'identifier');
        strictEqual(tokens[3].value, 'test123');
    });

    await it('should differentiate identifiers from reserved words', () => {
        const tokens = tokenizer('if x then');
        strictEqual(tokens[0].type, 'reserved');
        strictEqual(tokens[0].value, 'IF');
        strictEqual(tokens[1].type, 'identifier');
        strictEqual(tokens[1].value, 'x');
        strictEqual(tokens[2].type, 'reserved');
        strictEqual(tokens[2].value, 'THEN');
    });

    await it('should allow underscores and numbers in identifiers', () => {
        const tokens = tokenizer('_test test_123 test_abc_123');
        strictEqual(tokens[0].type, 'identifier');
        strictEqual(tokens[0].value, '_test');
        strictEqual(tokens[1].type, 'identifier');
        strictEqual(tokens[1].value, 'test_123');
        strictEqual(tokens[2].type, 'identifier');
        strictEqual(tokens[2].value, 'test_abc_123');
    });
});

await describe('Operators', async () => {
    await it('should tokenize arithmetic operators', () => {
        const tokens = tokenizer('+ - * / // % ^');
        const ops = ['+', '-', '*', '/', '//', '%', '^'];
        ops.forEach((op, i) => {
            strictEqual(tokens[i].type, 'operator');
            strictEqual(tokens[i].value, op.toUpperCase());
        });
    });

    await it('should tokenize comparison operators', () => {
        const tokens = tokenizer('== ~= < > <= >=');
        const ops = ['==', '~=', '<', '>', '<=', '>='];
        ops.forEach((op, i) => {
            strictEqual(tokens[i].type, 'operator');
            strictEqual(tokens[i].value, op.toUpperCase());
        });
    });

    await it('should tokenize bitwise operators', () => {
        const tokens = tokenizer('& | ~ >> <<');
        const ops = ['&', '|', '~', '>>', '<<'];
        ops.forEach((op, i) => {
            strictEqual(tokens[i].type, 'operator');
            strictEqual(tokens[i].value, op.toUpperCase());
        });
    });

    await it('should tokenize string concatenation operators', () => {
        const tokens = tokenizer('.. ...');
        strictEqual(tokens[0].type, 'operator');
        strictEqual(tokens[0].value, '..');
        strictEqual(tokens[1].type, 'operator');
        strictEqual(tokens[1].value, '...');
    });

    await it('should perform greedy matching on operators', () => {
        const tokens = tokenizer('a==b ... c .. d ~= e');
        strictEqual(tokens[1].type, 'operator');
        strictEqual(tokens[1].value, '==');
        strictEqual(tokens[3].type, 'operator');
        strictEqual(tokens[3].value, '...');
        strictEqual(tokens[5].type, 'operator');
        strictEqual(tokens[5].value, '..');
        strictEqual(tokens[7].type, 'operator');
        strictEqual(tokens[7].value, '~=');
    });

    await it('should tokenize length operator', () => {
        const tokens = tokenizer('#table');
        strictEqual(tokens[0].type, 'operator');
        strictEqual(tokens[0].value, '#');
    });
});

await describe('Separators', async () => {
    await it('should tokenize basic separators', () => {
        const tokens = tokenizer('( ) { } [ ]');
        const seps = ['(', ')', '{', '}', '[', ']'];
        seps.forEach((sep, i) => {
            strictEqual(tokens[i].type, 'separator');
            strictEqual(tokens[i].value, sep);
        });
    });

    await it('should tokenize punctuation separators', () => {
        const tokens = tokenizer(', ; . :');
        const seps = [',', ';', '.', ':'];
        seps.forEach((sep, i) => {
            strictEqual(tokens[i].type, 'separator');
            strictEqual(tokens[i].value, sep);
        });
    });

    await it('should perform greedy matching on double-colon', () => {
        const tokens = tokenizer(':: ( ) , ; .');
        strictEqual(tokens[0].type, 'separator');
        strictEqual(tokens[0].value, '::');
        strictEqual(tokens[1].value, '(');
        strictEqual(tokens[2].value, ')');
        strictEqual(tokens[3].value, ',');
        strictEqual(tokens[4].value, ';');
        strictEqual(tokens[5].value, '.');
    });

    await it('should filter out whitespace by default', () => {
        const tokens = tokenizer('a b');
        strictEqual(tokens.length, 3); // 'a', 'b', EOF
        strictEqual(tokens[0].type, 'identifier');
        strictEqual(tokens[1].type, 'identifier');

    });
});

await describe('Literals', async () => {
    await it('should tokenize integer numbers', () => {
        const tokens = tokenizer('123 456');
        strictEqual(tokens[0].type, 'constant');
        strictEqual(tokens[0].additional, 'number');
        strictEqual(tokens[0].value, '123');
        strictEqual(tokens[1].type, 'constant');
        strictEqual(tokens[1].additional, 'number');
        strictEqual(tokens[1].value, '456');
    });

    await it('should tokenize float numbers', () => {
        const tokens = tokenizer('45.6 78.90');
        strictEqual(tokens[0].type, 'constant');
        strictEqual(tokens[0].additional, 'number');
        strictEqual(tokens[0].value, '45.6');
        strictEqual(tokens[1].type, 'constant');
        strictEqual(tokens[1].additional, 'number');
    });

    await it('should tokenize exponential notation', () => {
        const tokens = tokenizer('1e10 2.5e-3');
        strictEqual(tokens[0].type, 'constant');
        strictEqual(tokens[0].additional, 'number');
        strictEqual(tokens[1].type, 'constant');
        strictEqual(tokens[1].additional, 'number');
    });

    await it('should tokenize hexadecimal numbers', () => {
        const tokens = tokenizer('0x1A 0xFF 0x1.fp3');
        strictEqual(tokens[0].type, 'constant');
        strictEqual(tokens[0].additional, 'number');
        strictEqual(tokens[1].type, 'constant');
        strictEqual(tokens[1].additional, 'number');
        strictEqual(tokens[2].type, 'constant');
        strictEqual(tokens[2].additional, 'number');
    });

    await it('should tokenize all number formats', () => {
        const tokens = tokenizer('123 45.6 1e10 0x1A 0x1.fp3');
        strictEqual(tokens.length, 6); // 5 numbers + EOF
        tokens.slice(0, 5).forEach(token => {
            strictEqual(token.type, 'constant');
            strictEqual(token.additional, 'number');
        });
    });

    await it('should tokenize single-quoted strings', () => {
        const tokens = tokenizer("'hello'");
        strictEqual(tokens[0].type, 'constant');
        strictEqual(tokens[0].additional, 'string');
        strictEqual(tokens[0].value, 'hello');
    });

    await it('should tokenize double-quoted strings', () => {
        const tokens = tokenizer('"world"');
        strictEqual(tokens[0].type, 'constant');
        strictEqual(tokens[0].additional, 'string');
        strictEqual(tokens[0].value, 'world');
    });

    await it('should tokenize long bracket strings', () => {
        const tokens = tokenizer('[[test]]');
        strictEqual(tokens[0].type, 'constant');
        strictEqual(tokens[0].additional, 'string');
        strictEqual(tokens[0].value, 'test');
    });

    await it('should tokenize all string formats', () => {
        const code = "'a' \"b\" [[c]]";
        const tokens = tokenizer(code);
        strictEqual(tokens[0].type, 'constant');
        strictEqual(tokens[0].additional, 'string');
        strictEqual(tokens[0].value, 'a');
        strictEqual(tokens[1].type, 'constant');
        strictEqual(tokens[1].additional, 'string');
        strictEqual(tokens[1].value, 'b');
        strictEqual(tokens[2].type, 'constant');
        strictEqual(tokens[2].additional, 'string');
        strictEqual(tokens[2].value, 'c');
    });
});

await describe('Comments', async () => {
    await it('should tokenize single-line comments', () => {
        const code = '-- hello\nif';
        const tokens = tokenizer(code);
        const comments = tokens.filter(t => t.type === 'comment');
        strictEqual(comments.length, 1);
        strictEqual(comments[0].value, ' hello');
    });

    await it('should tokenize long comments', () => {
        const code = '--[[\nworld\n]]';
        const tokens = tokenizer(code);
        const comments = tokens.filter(t => t.type === 'comment');
        strictEqual(comments.length, 1);
        ok(comments[0].value.includes('world'));
    });

    await it('should filter comments and continue parsing', () => {
        const code = '-- hello\n--[[\nworld\n]] if';
        const tokens = tokenizer(code);
        const comments = tokens.filter(t => t.type === 'comment');
        strictEqual(comments.length, 2);

        strictEqual(tokens[2].type, 'reserved');
        strictEqual(tokens[2].value, 'IF');
    });

    await it('should handle empty comments', () => {
        const code = '--\nif';
        const tokens = tokenizer(code);
        const comments = tokens.filter(t => t.type === 'comment');
        strictEqual(comments.length, 1);
    });
});

await describe('Line and Column Tracking', async () => {
    await it('should track line numbers', () => {
        const code = 'if\nfoo';
        const tokens = tokenizer(code);
        strictEqual(tokens[0].line, 1);
        strictEqual(tokens[1].line, 2);
    });

    await it('should track column numbers', () => {
        const code = 'if foo';
        const tokens = tokenizer(code);
        strictEqual(tokens[0].column, 1);
        strictEqual(tokens[1].column, 4);
    });

    await it('should track position for multi-line code', () => {
        const code = 'if\nfoo';
        const tokens = tokenizer(code);
        // 'IF' at line 1, col 1
        strictEqual(tokens[0].line, 1);
        strictEqual(tokens[0].column, 1);
        // 'foo' at line 2, col 1 (identifier)
        strictEqual(tokens[1].line, 2);
        strictEqual(tokens[1].column, 1);
    });

    await it('should handle multiple lines correctly', () => {
        const code = 'local x\nif x then\nend';
        const tokens = tokenizer(code);
        strictEqual(tokens[0].line, 1); // local
        strictEqual(tokens[1].line, 1); // x
        strictEqual(tokens[2].line, 2); // if
        strictEqual(tokens[3].line, 2); // x
        strictEqual(tokens[4].line, 2); // then
        strictEqual(tokens[5].line, 3); // end
    });
});

await describe('EOF Token', async () => {
    await it('should always end with EOF token', () => {
        const tokens = tokenizer('if');
        const lastToken = tokens[tokens.length - 1];
        strictEqual(lastToken.type, 'EOF');
    });

    await it('should have EOF for empty input', () => {
        const tokens = tokenizer('');
        strictEqual(tokens.length, 1);
        strictEqual(tokens[0].type, 'EOF');
    });
});
