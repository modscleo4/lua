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

import { AbstractSyntaxTree, parser } from './parser.js';
import type { Token } from './tokenizer.js';

// Helper to create tokens manually
const t = {
    eof: (): Token => ({ type: 'EOF', match: '', value: 'EOF', additional: null, line: 1, column: 1 }),
    keyword: (value: string): Token => ({ type: 'reserved', match: value, value: value.toUpperCase(), additional: null, line: 1, column: 1 }),
    identifier: (value: string): Token => ({ type: 'identifier', match: value, value, additional: null, line: 1, column: 1 }),
    number: (value: string): Token => ({ type: 'constant', match: value, value, additional: 'number', line: 1, column: 1 }),
    string: (value: string): Token => ({ type: 'constant', match: `'${value}'`, value, additional: 'string', line: 1, column: 1 }),
    operator: (value: string): Token => ({ type: 'operator', match: value, value, additional: null, line: 1, column: 1 }),
    separator: (value: string): Token => ({ type: 'separator', match: value, value, additional: null, line: 1, column: 1 }),
};

const buildTokens = (...tokenList: Token[]): Token[] => [...tokenList, t.eof()];

await describe('Parser Basic Parsing', async () => {
    await it('should parse empty chunks', () => {
        const tokens = buildTokens();
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(Array.isArray(result.tree.children));
    });

    await it('should parse simple variable assignment', () => {
        const tokens = buildTokens(t.identifier('x'), t.operator('='), t.number('1'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse multiple statements', () => {
        const tokens = buildTokens(t.identifier('x'), t.operator('='), t.number('1'), t.separator(';'), t.identifier('y'), t.operator('='), t.number('2'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse local variable declaration', () => {
        const tokens = buildTokens(t.keyword('local'), t.identifier('x'), t.operator('='), t.number('1'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse if statement', () => {
        const tokens = buildTokens(t.keyword('if'), t.identifier('x'), t.keyword('then'), t.identifier('y'), t.operator('='), t.number('1'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse if-else statement', () => {
        const tokens = buildTokens(t.keyword('if'), t.identifier('x'), t.keyword('then'), t.identifier('y'), t.operator('='), t.number('1'), t.keyword('else'), t.identifier('z'), t.operator('='), t.number('2'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse if-elseif-else statement', () => {
        const tokens = buildTokens(t.keyword('if'), t.identifier('x'), t.keyword('then'), t.identifier('y'), t.operator('='), t.number('1'), t.keyword('elseif'), t.identifier('z'), t.keyword('then'), t.identifier('w'), t.operator('='), t.number('2'), t.keyword('else'), t.identifier('v'), t.operator('='), t.number('3'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });
});

await describe('Parser Functions', async () => {
    await it('should parse function definition', () => {
        const tokens = buildTokens(t.keyword('function'), t.identifier('foo'), t.separator('('), t.separator(')'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse function with parameters', () => {
        const tokens = buildTokens(t.keyword('function'), t.identifier('foo'), t.separator('('), t.identifier('a'), t.separator(','), t.identifier('b'), t.separator(')'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse function with varargs', () => {
        const tokens = buildTokens(t.keyword('function'), t.identifier('foo'), t.separator('('), t.operator('...'), t.separator(')'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse function with body', () => {
        const tokens = buildTokens(t.keyword('function'), t.identifier('foo'), t.separator('('), t.identifier('a'), t.separator(')'), t.keyword('return'), t.identifier('a'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse anonymous function', () => {
        const tokens = buildTokens(t.keyword('local'), t.identifier('f'), t.operator('='), t.keyword('function'), t.separator('('), t.separator(')'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse function call', () => {
        const tokens = buildTokens(t.identifier('foo'), t.separator('('), t.separator(')'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse function call with arguments', () => {
        const tokens = buildTokens(t.identifier('foo'), t.separator('('), t.number('1'), t.separator(','), t.number('2'), t.separator(','), t.number('3'), t.separator(')'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });;
});

await describe('Parser Loops', async () => {
    await it('should parse while loop', () => {
        const tokens = buildTokens(t.keyword('while'), t.identifier('x'), t.keyword('do'), t.identifier('y'), t.operator('='), t.number('1'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse repeat-until loop', () => {
        const tokens = buildTokens(t.keyword('repeat'), t.identifier('x'), t.operator('='), t.number('1'), t.keyword('until'), t.identifier('y'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse numeric for loop', () => {
        const tokens = buildTokens(t.keyword('for'), t.identifier('i'), t.operator('='), t.number('1'), t.separator(','), t.number('10'), t.keyword('do'), t.identifier('print'), t.separator('('), t.identifier('i'), t.separator(')'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse numeric for loop with step', () => {
        const tokens = buildTokens(t.keyword('for'), t.identifier('i'), t.operator('='), t.number('1'), t.separator(','), t.number('10'), t.separator(','), t.number('2'), t.keyword('do'), t.identifier('print'), t.separator('('), t.identifier('i'), t.separator(')'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse generic for loop', () => {
        const tokens = buildTokens(t.keyword('for'), t.identifier('k'), t.separator(','), t.identifier('v'), t.keyword('in'), t.identifier('ipairs'), t.separator('('), t.identifier('t'), t.separator(')'), t.keyword('do'), t.identifier('print'), t.separator('('), t.identifier('k'), t.separator(')'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse break statement', () => {
        const tokens = buildTokens(t.keyword('while'), t.keyword('true'), t.keyword('do'), t.keyword('break'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });
});

await describe('Parser Tables', async () => {
    await it('should parse empty table', () => {
        const tokens = buildTokens(t.identifier('t'), t.operator('='), t.separator('{'), t.separator('}'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse table with list fields', () => {
        const tokens = buildTokens(t.identifier('t'), t.operator('='), t.separator('{'), t.number('1'), t.separator(','), t.number('2'), t.separator(','), t.number('3'), t.separator('}'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse table with named fields', () => {
        const tokens = buildTokens(t.identifier('t'), t.operator('='), t.separator('{'), t.identifier('a'), t.operator('='), t.number('1'), t.separator(','), t.identifier('b'), t.operator('='), t.number('2'), t.separator('}'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse table with bracket fields', () => {
        const tokens = buildTokens(t.identifier('t'), t.operator('='), t.separator('{'), t.separator('['), t.number('1'), t.separator(']'), t.operator('='), t.string('a'), t.separator(','), t.separator('['), t.number('2'), t.separator(']'), t.operator('='), t.string('b'), t.separator('}'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse mixed table fields', () => {
        const tokens = buildTokens(t.identifier('t'), t.operator('='), t.separator('{'), t.number('1'), t.separator(','), t.number('2'), t.separator(','), t.identifier('a'), t.operator('='), t.number('3'), t.separator(','), t.separator('['), t.number('4'), t.separator(']'), t.operator('='), t.number('5'), t.separator('}'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse table with trailing separator', () => {
        const tokens = buildTokens(t.identifier('t'), t.operator('='), t.separator('{'), t.number('1'), t.separator(','), t.number('2'), t.separator(','), t.number('3'), t.separator(','), t.separator('}'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });
});

await describe('Parser Operators', async () => {
    await it('should parse arithmetic operations', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.number('1'), t.operator('+'), t.number('2'), t.operator('-'), t.number('3'), t.operator('*'), t.number('4'), t.operator('/'), t.number('5'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse comparison operations', () => {
        const tokens = buildTokens(t.keyword('if'), t.identifier('a'), t.operator('=='), t.identifier('b'), t.keyword('and'), t.identifier('c'), t.operator('~='), t.identifier('d'), t.keyword('then'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse logical operators', () => {
        const tokens = buildTokens(t.keyword('if'), t.identifier('a'), t.keyword('and'), t.identifier('b'), t.keyword('or'), t.identifier('c'), t.keyword('then'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse bitwise operators', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.number('1'), t.operator('&'), t.number('2'), t.operator('|'), t.number('3'), t.operator('~'), t.number('4'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse string concatenation', () => {
        const tokens = buildTokens(t.identifier('s'), t.operator('='), t.string('a'), t.operator('..'), t.string('b'), t.operator('..'), t.string('c'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse unary operators', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.operator('-'), t.identifier('x'), t.identifier('b'), t.operator('='), t.keyword('not'), t.identifier('y'), t.identifier('c'), t.operator('='), t.operator('#'), t.identifier('t'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse exponentiation operator', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.number('2'), t.operator('^'), t.number('3'), t.operator('^'), t.number('4'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });
});

await describe('Parser Expressions', async () => {
    await it('should parse numeric literals', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.number('123'), t.identifier('b'), t.operator('='), t.number('45.6'), t.identifier('c'), t.operator('='), t.number('1e10'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse string literals', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.string('hello'), t.identifier('b'), t.operator('='), t.string('world'), t.identifier('c'), t.operator('='), t.string('test'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse boolean literals', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.keyword('true'), t.identifier('b'), t.operator('='), t.keyword('false'), t.identifier('c'), t.operator('='), t.keyword('nil'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse table indexing', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.identifier('t'), t.separator('['), t.number('1'), t.separator(']'), t.identifier('b'), t.operator('='), t.identifier('t'), t.separator('['), t.string('key'), t.separator(']'), t.identifier('c'), t.operator('='), t.identifier('t'), t.separator('.'), t.identifier('field'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse nested table access', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.identifier('t'), t.separator('['), t.number('1'), t.separator(']'), t.separator('['), t.number('2'), t.separator(']'), t.separator('.'), t.identifier('field'), t.separator('['), t.number('3'), t.separator(']'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse parenthesized expressions', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.separator('('), t.number('1'), t.operator('+'), t.number('2'), t.separator(')'), t.operator('*'), t.number('3'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });
});

await describe('Parser Return Statements', async () => {
    await it('should parse return without values', () => {
        const tokens = buildTokens(t.keyword('function'), t.identifier('f'), t.separator('('), t.separator(')'), t.keyword('return'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse return with single value', () => {
        const tokens = buildTokens(t.keyword('function'), t.identifier('f'), t.separator('('), t.separator(')'), t.keyword('return'), t.number('1'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse return with multiple values', () => {
        const tokens = buildTokens(t.keyword('function'), t.identifier('f'), t.separator('('), t.separator(')'), t.keyword('return'), t.number('1'), t.separator(','), t.number('2'), t.separator(','), t.number('3'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });
});

await describe('Parser Labels and Goto', async () => {
    await it('should parse label definition', () => {
        const tokens = buildTokens(t.separator(':'), t.separator(':'), t.identifier('start'), t.separator(':'), t.separator(':'), t.identifier('x'), t.operator('='), t.number('1'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse goto statement', () => {
        const tokens = buildTokens(t.keyword('goto'), t.identifier('label'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });
});

await describe('Parser Do Block', async () => {
    await it('should parse do block', () => {
        const tokens = buildTokens(t.keyword('do'), t.identifier('x'), t.operator('='), t.number('1'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse nested do blocks', () => {
        const tokens = buildTokens(t.keyword('do'), t.keyword('do'), t.identifier('x'), t.operator('='), t.number('1'), t.keyword('end'), t.keyword('end'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });
});

await describe('Parser Multiple Assignments', async () => {
    await it('should parse multiple variable assignment', () => {
        const tokens = buildTokens(t.identifier('a'), t.separator(','), t.identifier('b'), t.separator(','), t.identifier('c'), t.operator('='), t.number('1'), t.separator(','), t.number('2'), t.separator(','), t.number('3'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse assignment with function call', () => {
        const tokens = buildTokens(t.identifier('a'), t.separator(','), t.identifier('b'), t.operator('='), t.identifier('foo'), t.separator('('), t.separator(')'), t.separator(','), t.identifier('bar'), t.separator('('), t.separator(')'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });
});

await describe('Parser Error Handling', async () => {
    await it('should throw error on unexpected EOF', () => {
        const tokens = buildTokens(t.keyword('if'), t.identifier('x'), t.keyword('then'));
        throws(() => {
            parser(tokens);
        });
    });

    await it('should throw error on invalid syntax', () => {
        const tokens = buildTokens(t.identifier('x'), t.operator('='), t.operator('='));
        throws(() => {
            parser(tokens);
        });
    });

    await it('should throw error on unmatched brackets', () => {
        const tokens = buildTokens(t.identifier('t'), t.operator('='), t.separator('{'), t.number('1'), t.separator(','), t.number('2'), t.separator(','), t.number('3'));
        throws(() => {
            parser(tokens);
        });
    });

    await it('should throw error on invalid identifier in assignment', () => {
        const tokens = buildTokens(t.number('1'), t.operator('='), t.identifier('x'));
        throws(() => {
            parser(tokens);
        });
    });
});

await describe('Parser Complex Expressions', async () => {
    await it('should parse complex expression with multiple operators', () => {
        const tokens = buildTokens(t.identifier('a'), t.operator('='), t.separator('('), t.number('1'), t.operator('+'), t.number('2'), t.separator(')'), t.operator('*'), t.number('3'), t.operator('-'), t.number('4'), t.operator('/'), t.number('5'), t.operator('%'), t.number('6'), t.operator('^'), t.number('7'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse expression with method call', () => {
        const tokens = buildTokens(t.identifier('obj'), t.separator(':'), t.identifier('method'), t.separator('('), t.number('1'), t.separator(','), t.number('2'), t.separator(')'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse function with table argument', () => {
        const tokens = buildTokens(t.identifier('f'), t.separator('{'), t.number('1'), t.separator(','), t.number('2'), t.separator(','), t.number('3'), t.separator('}'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });

    await it('should parse function with string argument', () => {
        const tokens = buildTokens(t.identifier('print'), t.string('hello'));
        const result = parser(tokens);
        strictEqual(result.tree.type, 'chunk');
        ok(result.tree.children);
    });
});

await describe('AST Structure', async () => {
    await it('should have correct tree structure for simple assignment', () => {
        const tokens = buildTokens(t.identifier('x'), t.operator('='), t.number('1'));
        const result = parser(tokens);

        strictEqual(result.tree.type, 'chunk');
        ok(Array.isArray(result.tree.children));
        ok(result.tree.children.length > 0);
    });

    await it('should have children array for all non-token nodes', () => {
        const tokens = buildTokens(t.keyword('if'), t.identifier('x'), t.keyword('then'), t.identifier('y'), t.operator('='), t.number('1'), t.keyword('end'));
        const result = parser(tokens);

        const checkNode = (node: AbstractSyntaxTree) => {
            if (node.type !== 'token') {
                ok(Array.isArray(node.children), `Node type ${node.type} should have children array`);
            }
        };

        const walk = (node: AbstractSyntaxTree) => {
            checkNode(node);
            if (node.type !== 'token' && node.children) {
                node.children.forEach(walk);
            }
        };

        walk(result.tree);
    });
});
