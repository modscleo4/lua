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

import assert from "node:assert";

import { AbstractSyntaxTree } from "./parser.js";
import { Token } from "./tokenizer.js";

import {
    isFalsyLuaValue,
    isTruthyLuaValue,
    LuaFunction,
    LuaScope,
    LuaType,
    LuaValue,
    toLuaValue
} from "./vm.js";

function parseParameterList(parlist: AbstractSyntaxTree): string[] {
    assert(parlist.type === 'parlist', `Expected a parlist, got ${parlist.type}`);

    const params: string[] = [];

    if (parlist.children.length === 0) {
        return params;
    }

    if (parlist.children[0].type === 'token') { // ...
        params.push('...');
        return params;
    }

    const namelist = parlist.children[0];
    for (let i = 0; i < namelist.children.length; i++) {
        params.push(fetchIdentifier(namelist.children[i]));
    }

    if (parlist.children.length === 3) { // namelist ',' '...'
        params.push('...');
    }

    return params;
}

function parseFunctionBody(name: string | undefined, funcbody: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    assert(funcbody.type === 'funcbody', `Expected a functionbody, got ${funcbody.type}`);

    const args = funcbody.children.length === 4 ? [] : parseParameterList(funcbody.children[1]);

    const block = funcbody.children[2 + args.length];

    const luaFunction: LuaFunction = toLuaValue(function (scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) {
        const fnLocalScope = new LuaScope(scope);
        for (const [k, v] of args) {
            fnLocalScope.set(toLuaValue(k), v);
        }

        return runBlock(block, fnLocalScope);
    });

    luaFunction.name = name;
    luaFunction.arguments = args;
    luaFunction.scope = new LuaScope(scope);

    return luaFunction;
}

function defineFunction(functiondef: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    assert(functiondef.type === 'functiondef', `Expected a functiondef, got ${functiondef.type}`);

    return parseFunctionBody(undefined, functiondef.children[1], scope);
}

function retrieveFunctionName(funcname: AbstractSyntaxTree): string {
    assert(funcname.type === 'funcname', `Expected a funcname, got ${funcname.type}`);

    let name = fetchIdentifier(funcname.children[0]);

    for (let i = 1; i < funcname.children.length; i += 2) {
        name += fetchSeparator(funcname.children[i]);
        name += fetchIdentifier(funcname.children[i + 1]);
    }

    return name;
}

function defineNamedFunction(funcname: AbstractSyntaxTree, funcbody: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    const name = retrieveFunctionName(funcname);
    debug(`Defining function '${name}'`);
    const func = parseFunctionBody(name, funcbody, scope);

    let globalScope = scope;
    while (globalScope.parent) {
        globalScope = globalScope.parent;
    }

    scope.set(toLuaValue(name), func);

    return func;
}

function constructTable(tableconstructor: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    assert(tableconstructor.type === 'tableconstructor', `Expected a tableconstructor, got ${tableconstructor.type}`);

    const table: Map<LuaValue, LuaValue> = new Map();
    if (tableconstructor.children.length === 2) {
        return toLuaValue(table);
    }

    const fieldlist = tableconstructor.children[1];
    assert(fieldlist.type === 'fieldlist', `Expected a fieldlist, got ${fieldlist.type}`);

    return toLuaValue(table);
}

function fetchOperator(operator: AbstractSyntaxTree): Token {
    assert(operator.type === 'binop' || operator.type === 'unop', `Expected a binop or unop, got ${operator.type}`);
    assert(operator.children[0].type === 'token', `Expected a token, got ${operator.children[0].type}`);

    return operator.children[0].token;
}

function fetchIdentifier(token: AbstractSyntaxTree): string {
    assert(token.type === 'token', `Expected a token, got ${token.type}`);
    assert(token.token.type === 'identifier', `Expected an identifier, got ${token.token.type}`);

    return token.token.value;
}

function fetchString(token: AbstractSyntaxTree): string {
    assert(token.type === 'token', `Expected a token, got ${token.type}`);
    assert(token.token.type === 'constant' && token.token.additional === 'string', `Expected a string, got ${token.token.type}`);

    return token.token.value;
}

function fetchSeparator(token: AbstractSyntaxTree): string {
    assert(token.type === 'token', `Expected a token, got ${token.type}`);
    assert(token.token.type === 'separator', `Expected a separator, got ${token.token.type}`);

    return token.token.value;
}

function fetchTokenValue(token: AbstractSyntaxTree): LuaValue {
    assert(token.type === 'token', `Expected a token, got ${token.type}`);

    function convertToNumber(value: string): number {
        return parseInt(value);
    }

    if (token.token.type === 'reserved') {
        switch (token.token.value) {
            case 'NIL':
                return toLuaValue(null);
            case 'TRUE':
                return toLuaValue(true);
            case 'FALSE':
                return toLuaValue(false);
        }
    } else if (token.token.type === 'constant') {
        const type = token.token.additional;
        return toLuaValue(type === 'number' ? convertToNumber(token.token.value) : token.token.value);
    }

    return toLuaValue(null);
}

function evaluateBinaryOperator(lhsExpression: AbstractSyntaxTree, operator: AbstractSyntaxTree, rhsExpression: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    const lhs = evaluateExpression(lhsExpression, scope);
    const op = fetchOperator(operator);

    switch (op.value) {
        case 'AND':
            debug(`Evaluating 'and' expression and short-circuiting if necessary`);
            // Short-circuiting
            if (isFalsyLuaValue(lhs)) {
                debug(`Short-circuiting 'and' expression`);
                return toLuaValue(false);
            }

            return evaluateExpression(rhsExpression, scope);
        case 'OR':
            debug(`Evaluating 'or' expression and short-circuiting if necessary`);
            // Short-circuiting
            if (isTruthyLuaValue(lhs)) {
                debug(`Short-circuiting 'or' expression`);
                return lhs;
            }

            return evaluateExpression(rhsExpression, scope);
    }

    const rhs = evaluateExpression(rhsExpression, scope);

    switch (op.value) {
        case '+':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) + (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
            }

            assert(lhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue + rhs.jsValue);
        case '-':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) - (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
            }

            assert(lhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue - rhs.jsValue);
        case '*':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) * (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
            }

            assert(lhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue * rhs.jsValue);
        case '/':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) / (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
            }

            assert(lhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue / rhs.jsValue);
        case '^':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) ** (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
            }

            assert(lhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue ** rhs.jsValue);
        case '%':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) % (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
            }

            assert(lhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform arithmetic on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue % rhs.jsValue);
        case '..':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && lhs.type === rhs.type) {
                return toLuaValue('' + lhs.jsValue + rhs.jsValue);
            }

            // TODO: call metatable __concat

            return toLuaValue(null);
        case '<':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && lhs.type === rhs.type) {
                return toLuaValue(lhs.jsValue < rhs.jsValue);
            }

            // TODO: call metatable __lt
            return toLuaValue(null);
        case '<=':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && lhs.type === rhs.type) {
                return toLuaValue(lhs.jsValue <= rhs.jsValue);
            }

            // TODO: call metatable __le
            return toLuaValue(null);
        case '>':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && lhs.type === rhs.type) {
                return toLuaValue(lhs.jsValue > rhs.jsValue);
            }

            // TODO: call metatable __lt (invert lhs and rhs)
            return toLuaValue(null);
        case '>=':
            if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && lhs.type === rhs.type) {
                return toLuaValue(lhs.jsValue >= rhs.jsValue);
            }

            // TODO: call metatable __le (invert lhs and rhs)
            return toLuaValue(null);
        case '==':
            if (lhs.type !== rhs.type) {
                return toLuaValue(false);
            }

            return toLuaValue(lhs.jsValue === rhs.jsValue);
        case '~=':
            if (lhs.type !== rhs.type) {
                return toLuaValue(true);
            }

            return toLuaValue(lhs.jsValue !== rhs.jsValue);
        case '&':
            assert(lhs.type === LuaType.Number, `Attempt to perform bitwise on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform bitwise on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue & rhs.jsValue);
        case '|':
            assert(lhs.type === LuaType.Number, `Attempt to perform bitwise on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform bitwise on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue | rhs.jsValue);
        case '~':
            assert(lhs.type === LuaType.Number, `Attempt to perform bitwise on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform bitwise on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue ^ rhs.jsValue);
        case '<<':
            assert(lhs.type === LuaType.Number, `Attempt to perform bitwise on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform bitwise on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue << rhs.jsValue);
        case '>>':
            assert(lhs.type === LuaType.Number, `Attempt to perform bitwise on a ${lhs.type} value`);
            assert(rhs.type === LuaType.Number, `Attempt to perform bitwise on a ${rhs.type} value`);

            return toLuaValue(lhs.jsValue >> rhs.jsValue);
    }

    throw new Error(`Unrecognized binary operator: ${op.value}`);
}

function evaluateUnaryOperator(operator: AbstractSyntaxTree, rhsExpression: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    const op = fetchOperator(operator);
    const rhs = evaluateExpression(rhsExpression, scope);

    switch (op.value) {
        case '-':
            if (rhs.type !== LuaType.Number) {
                return toLuaValue(null);
            }

            return toLuaValue(-rhs.jsValue);
        case 'not':
            return toLuaValue(isFalsyLuaValue(rhs));
        case '#':
            if (rhs.type !== LuaType.String) {
                return toLuaValue(null);
            }

            return toLuaValue(rhs.jsValue.length);
        case '~':
            assert(rhs.type === LuaType.Number, `Attempt to perform bitwise on a ${rhs.type} value`);

            return toLuaValue(~rhs.jsValue);
    }

    throw new Error(`Unrecognized binary operator: ${op.value}`);
}

function evaluateExpression(expression: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    assert(expression.type === 'exp', `Expected an exp, got ${expression.type}`);
    assert(expression.children.length > 0, `Invalid exp without children (how did we get here?)`);

    debug(`Evaluating expression '${expression.children.map(p => p.type)}'`);

    if (expression.children[0].type === 'token') {
        if (expression.children[0].token.type === 'operator') { // ...
            return scope.get(toLuaValue('...')) ?? toLuaValue(null);
        } else {
            return fetchTokenValue(expression.children[0]);
        }
    } else if (expression.children.length === 1) {
        switch (expression.children[0].type) {
            case 'functiondef':
                return defineFunction(expression.children[0], scope);
            case 'tableconstructor':
                return constructTable(expression.children[0], scope);
            case 'prefixexp':
                return evaluatePrefixedExpression(expression.children[0], scope);
        }
    } else if (expression.children.length === 3 && expression.children[1].type === 'binop') {
        return evaluateBinaryOperator(expression.children[0], expression.children[1], expression.children[2], scope);
    } else if (expression.children.length === 2 && expression.children[0].type === 'unop') {
        return evaluateUnaryOperator(expression.children[0], expression.children[1], scope);
    }

    return toLuaValue(null);
}

function evaluateExpressionList(explist: AbstractSyntaxTree, scope: LuaScope): LuaValue[] {
    assert(explist.type === 'explist', `Expected an explist, got ${explist.type}`);

    const values: LuaValue[] = [];
    for (const exp of explist.children) {
        if (exp.type === 'token') {
            // `,`
            continue;
        }

        values.push(evaluateExpression(exp, scope));
    }

    return values;
}

function fetchVariable(variable: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    assert(variable.type === 'var', `Expected a var, got ${variable.type}`);

    if (variable.children.length === 1) {
        const varname = toLuaValue(fetchIdentifier(variable.children[0]));
        debug(`Fetching variable '${varname.jsValue}' from closest scope`);

        const value = scope.getRecursive(varname);
        if (value) {
            debug(`Variable '${varname.jsValue}' has the value of type ${value.type}`);
            return value;
        }
    } else if (variable.children.length === 4) { // prefixexp '[' exp ']'
        const table = evaluatePrefixedExpression(variable.children[0], scope);
        const index = evaluateExpression(variable.children[2], scope);

        debug(`Fetching index '${index.jsValue}' from table '${table.jsValue}'`);

        if (table.type === LuaType.Table) {
            if (index.type === LuaType.Nil) {
                throw new Error(`'index' cannot be nil`);
            }

            return table.jsValue.get(index) ?? toLuaValue(null);
        }

        throw new Error(`'variable' is not a table`);
    } else if (variable.children.length === 3) { // prefixexp '.' NAME
        const table = evaluatePrefixedExpression(variable.children[0], scope);
        const index = fetchIdentifier(variable.children[2]);

        debug(`Fetching index '${index}' from table '${table.jsValue}'`);

        if (table.type === LuaType.Table) {
            return table.jsValue.get(toLuaValue(index)) ?? toLuaValue(null);
        }

        throw new Error(`'variable' is not a table`);
    }

    // All undefined variables are nil by default
    return toLuaValue(null);
}

function evaluatePrefixedExpression(prefixexp: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    assert(prefixexp.type === 'prefixexp', `Expected a prefixexp, got ${prefixexp.type}`);

    debug(`Evaluating prefixed expression '${prefixexp.children.map(p => p.type)}'`);
    if (prefixexp.children.length === 1) {
        switch (prefixexp.children[0].type) {
            case 'var':
                return fetchVariable(prefixexp.children[0], scope);
            case 'functioncall':
                return callFunction(prefixexp.children[0], scope);
        }
    } else if (prefixexp.children.length === 3) { // '(' exp ')'
        const exp = prefixexp.children[1];

        return evaluateExpression(exp, scope);
    }

    // Should never happen
    throw new Error(`Unable to evaluate prefixed expression`);
}

function callFunction(functioncall: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    assert(functioncall.type === 'functioncall', `Expected a functioncall, got ${functioncall.type}`);

    if (functioncall.children.length === 2) { // prefixexp args
        const func = evaluatePrefixedExpression(functioncall.children[0], scope);
        const args = functioncall.children[1];
        assert(args.type === 'args', `Expected an args, got ${args.type}`);

        if (func.type === LuaType.Function) {
            if (args.children.length === 1 && args.children[0].type === 'token') { // function 'string'
                const argValues = [args.children[0].token.value].map(av => toLuaValue(av.trim()));
                debug(`Calling function '${func.name}' with arguments '${argValues.map(av => av.type).join(', ')}'`);

                const fnArgs: Map<string, LuaValue> = new Map();
                const fnVarargs: LuaValue[] = [];
                for (let i = 0; i < func.arguments.length; i++) {
                    if (func.arguments[i] === '...') {
                        fnVarargs.push(...argValues.slice(i));
                        break;
                    }

                    fnArgs.set(func.arguments[i], i <= argValues.length - 1 ? argValues[i] : toLuaValue(null));
                }

                const result = func.jsValue(func.scope ?? scope, fnArgs, fnVarargs);

                debug(`Function '${func.name}' returned '${JSON.stringify(result)}'`);

                return result;
            } else if (args.children.length === 1 && args.children[0].type === 'tableconstructor') { // function tableconstructor
                const argValues = [args.children[0]].map(arg => constructTable(arg, scope));
                debug(`Calling function '${func.name}' with arguments '${argValues.map(av => av.type).join(', ')}'`);

                const fnArgs: Map<string, LuaValue> = new Map();
                const fnVarargs: LuaValue[] = [];
                for (let i = 0; i < func.arguments.length; i++) {
                    if (func.arguments[i] === '...') {
                        fnVarargs.push(...argValues.slice(i));
                        break;
                    }

                    fnArgs.set(func.arguments[i], i <= argValues.length - 1 ? argValues[i] : toLuaValue(null));
                }

                const result = func.jsValue(func.scope ?? scope, fnArgs, fnVarargs);

                debug(`Function '${func.name}' returned '${JSON.stringify(result)}'`);

                return result;
            } else if (args.children.length === 2) { // function '(' ')'
                debug(`Calling function '${func.name}' with no arguments`);

                const fnArgs: Map<string, LuaValue> = new Map();
                const fnVarargs: LuaValue[] = [];

                const result = func.jsValue(func.scope ?? scope, fnArgs, fnVarargs);

                debug(`Function '${func.name}' returned '${JSON.stringify(result)}'`);

                return result;
            }

            const argValues = evaluateExpressionList(args.children[1], scope);
            debug(`Calling function '${func.name}' with arguments '${argValues.map(av => av.type).join(', ')}'`);

            const fnArgs: Map<string, LuaValue> = new Map();
            const fnVarargs: LuaValue[] = [];
            for (let i = 0; i < func.arguments.length; i++) {
                if (func.arguments[i] === '...') {
                    fnVarargs.push(...argValues.slice(i));
                    break;
                }

                fnArgs.set(func.arguments[i], i <= argValues.length - 1 ? argValues[i] : toLuaValue(null));
            }

            const result = func.jsValue(func.scope ?? scope, fnArgs, fnVarargs);

            debug(`Function '${func.name}' returned '${JSON.stringify(result)}'`);

            return result;
        }
    } else if (functioncall.children.length === 4) { // prefixexp ':' NAME args

    }

    return toLuaValue(null);
}

function defineVariables(varlist: AbstractSyntaxTree, explist: AbstractSyntaxTree, scope: LuaScope) {
    assert(varlist.type === 'varlist', `Expected a varlist, got ${varlist.type}`);

    const expValues = evaluateExpressionList(explist, scope);

    debug(`Defining ${varlist.children.length} variables`);

    for (let i = 0; i < varlist.children.length; i++) {
        const v = varlist.children[i];
        if (v.type !== 'var') {
            throw new Error(`Expected a var, got ${v.type}`);
        }

        if (v.children.length === 4) { // prefixexp '[' exp ']'
            const table = evaluatePrefixedExpression(v.children[0], scope);
            const index = evaluateExpression(v.children[2], scope);

            if (table.type === LuaType.Table) {
                assert(index.type !== LuaType.Nil, `'index' cannot be nil`);

                debug(`Assigning expression ${i} type ${expValues[i].type} to table index '${index.jsValue}'`);

                const val = expValues[i];
                table.jsValue.set(index, val);
            }

            continue;
        } else if (v.children.length === 3) { // prefixexp '.' NAME
            const table = evaluatePrefixedExpression(v.children[0], scope);
            const index = fetchTokenValue(v.children[2]);

            if (table.type === LuaType.Table) {
                debug(`Assigning expression ${i} to table index '${index.jsValue}'`);

                const val = expValues[i];
                table.jsValue.set(index, val);
            }

            continue;
        }

        const varname = fetchIdentifier(v.children[0]);

        debug(`Assigning expression ${i} to variable '${varname}'`);

        const val = expValues[i];
        if (val.type === LuaType.Nil) {
            scope.deleteRecursive(toLuaValue(varname));
        } else {
            scope.setRecursive(toLuaValue(varname), val);
        }

        debug(`Variable '${varname}' now has value '${val.jsValue}'`);
    }
}

function defineLocalVariables(attnamelist: AbstractSyntaxTree, explist: AbstractSyntaxTree, scope: LuaScope) {
    assert(attnamelist.type === 'attnamelist', `Expected an attnamelist, got ${attnamelist.type}`);

    const expValues = evaluateExpressionList(explist, scope);

    debug(`Defining ${attnamelist.children.length} local variables`);
    let exp = 0;
    for (let att = 0; att < attnamelist.children.length; att++) {
        const attName = attnamelist.children[att];
        if (attName.type !== 'token' || attName.token!.type !== 'identifier') {
            continue;
        }

        const varname = fetchIdentifier(attName);

        debug(`Assigning expression ${exp} to variable '${varname}' in closest scope`);

        const val = expValues[exp];
        scope.set(toLuaValue(varname), val);

        debug(`Variable '${varname}' now has value '${val.jsValue}'`);
    }
}

function defineLocalFunction(funcname: AbstractSyntaxTree, funcbody: AbstractSyntaxTree, scope: LuaScope) {
    const name = fetchIdentifier(funcname);
    const func = parseFunctionBody(name, funcbody, scope);

    debug(`Defining local function '${name}'`);
    scope.set(toLuaValue(name), func);
}

function runWhileLoop(condition: AbstractSyntaxTree, block: AbstractSyntaxTree, scope: LuaScope) {
    assert(condition.type === 'exp', `Expected an exp, got ${condition.type}`);

    debug(`Running while loop`);

    const whileScope = new LuaScope(scope);
    while (isTruthyLuaValue(evaluateExpression(condition, scope))) {
        runBlock(block, whileScope, true);
    }

    whileScope.closeVariables();
}

function runRepeatLoop(block: AbstractSyntaxTree, condition: AbstractSyntaxTree, scope: LuaScope) {
    assert(condition.type === 'exp', `Expected an exp, got ${condition.type}`);

    debug(`Running repeat loop`);

    const repeatScope = new LuaScope(scope);
    do {
        runBlock(block, repeatScope, true);
    } while (isFalsyLuaValue(evaluateExpression(condition, repeatScope)));

    repeatScope.closeVariables();
}

function runIfStatement(ifstat: AbstractSyntaxTree, scope: LuaScope) {
    assert(ifstat.type === 'stat', `Expected a stat, got ${ifstat.type}`);
    assert(ifstat.children[0].type === 'token' && ifstat.children[0].token.type === 'reserved' && ifstat.children[0].token.value === 'IF', `Expected an IF statement, got ${ifstat.children[0].type}`);

    debug(`Running if statement`);

    for (let currIndex = 0; currIndex < ifstat.children.length; currIndex += 4) {
        // IF exp THEN block
        // ELSEIF exp THEN block
        // ELSE block
        // END
        const currToken = ifstat.children[currIndex];
        if (currToken.type === 'token' && currToken.token.type === 'reserved' && currToken.token.value === 'END') {
            break;
        }

        assert(currToken.type === 'token', `Expected a token, got ${currToken.type}`);
        assert(currToken.token.type === 'reserved', `Expected a reserved token, got ${currToken.token.type}`);
        assert(currToken.token.value === 'IF' || currToken.token.value === 'ELSEIF' || currToken.token.value === 'ELSE', `Expected an IF, ELSEIF or ELSE statement, got ${currToken.token.value}`);

        if (currToken.token.value === 'ELSE') {
            runBlock(ifstat.children[currIndex + 1], new LuaScope(scope));
            break;
        }

        const condition = evaluateExpression(ifstat.children[currIndex + 1], scope);
        if (isTruthyLuaValue(condition)) {
            runBlock(ifstat.children[currIndex + 3], new LuaScope(scope));
            break;
        }
    }
}

function runForLoop(variableName: AbstractSyntaxTree, initalValue: AbstractSyntaxTree, limit: AbstractSyntaxTree, step: AbstractSyntaxTree | null, block: AbstractSyntaxTree, scope: LuaScope) {
    assert(variableName.type === 'token', `Expected a token, got ${variableName.type}`);

    debug(`Running for loop with variable '${variableName.token.value}'`);
    const variable = evaluateExpression(initalValue, scope);

    assert(variable.type === LuaType.Number, `For loop variable '${variableName.token.value}' is not a number`);

    let stopConditionValue = evaluateExpression(limit, scope);
    assert(stopConditionValue.type === LuaType.Number, `For loop stop condition is not a number`);

    const stepValue = step ? evaluateExpression(step, scope) : toLuaValue(1);
    assert(stepValue.type === LuaType.Number, `For loop step is not a number`);
    assert(stepValue.jsValue !== 0, `For loop step cannot be zero`);

    for (let i = variable.jsValue; stepValue.jsValue > 0 ? i <= stopConditionValue.jsValue : i >= stopConditionValue.jsValue; i += stepValue.jsValue) {
        const forScope = new LuaScope(scope);
        forScope.set(toLuaValue(variableName.token.value), toLuaValue(i));
        runBlock(block, forScope, true);
        forScope.closeVariables();
        stopConditionValue = evaluateExpression(limit, forScope);
        assert(stopConditionValue.type === LuaType.Number, `For loop stop condition is not a number`);
    }
}

function runForInLoop(namelist: AbstractSyntaxTree, explist: AbstractSyntaxTree, block: AbstractSyntaxTree, scope: LuaScope) {
    assert(namelist.type === 'namelist', `Expected a namelist, got ${namelist.type}`);

    const expValues = evaluateExpressionList(explist, scope);

    debug(`Running for-in loop`);
}

function runDoBlock(block: AbstractSyntaxTree, scope: LuaScope) {
    const doScope = new LuaScope(scope);
    runBlock(block, doScope);

    doScope.closeVariables();
}

function runStatement(statement: AbstractSyntaxTree, scope: LuaScope) {
    assert(statement.type === 'stat', `Expected a statement, got ${statement.type}`);

    if (statement.children[0].type === 'varlist') { // assignment
        const varlist = statement.children[0];
        const explist = statement.children[2];

        defineVariables(varlist, explist, scope);
    } else if (statement.children[0].type === 'functioncall') {
        callFunction(statement.children[0], scope);
    } else if (statement.children[0].type === 'token') {
        switch (statement.children[0].token.type) {
            case 'separator':
                return;

            case 'reserved':
                switch (statement.children[0].token.value) {
                    case 'DO':
                        runDoBlock(statement.children[1], scope);
                        break;
                    case 'WHILE':
                        runWhileLoop(statement.children[1], statement.children[3], scope);
                        break;
                    case 'REPEAT':
                        runRepeatLoop(statement.children[1], statement.children[3], scope);
                        break;
                    case 'IF':
                        runIfStatement(statement, scope);
                        break;
                    case 'FOR':
                        if (statement.children[1].type === 'token' && statement.children[1].token.type === 'identifier') {
                            runForLoop(statement.children[1], statement.children[3], statement.children[5], statement.children.length === 9 ? null : statement.children[7], statement.children[statement.children.length === 9 ? 7 : 9], scope);
                        } else {
                            runForInLoop(statement.children[1], statement.children[3], statement.children[5], scope);
                        }

                        break;
                    case 'FUNCTION':
                        defineNamedFunction(statement.children[1], statement.children[2], scope);
                        break;
                    case 'LOCAL':
                        if (statement.children[1].type === 'token' && statement.children[1].token.value === 'FUNCTION') {
                            defineLocalFunction(statement.children[2], statement.children[3], scope);
                        } else {
                            defineLocalVariables(statement.children[1], statement.children[3], scope);
                        }

                        break;
                }

                break;
        }
    }
}

function runReturnStatement(retstat: AbstractSyntaxTree, scope: LuaScope): LuaValue {
    assert(retstat.type === 'retstat', `Expected a return statement, got ${retstat.type}`);

    const returnValues = evaluateExpressionList(retstat.children[1], scope);

    return returnValues.length === 1 ? returnValues[0] : toLuaValue(returnValues);
}

function runBlock(block: AbstractSyntaxTree, scope: LuaScope, allowBreak = false): LuaValue {
    assert(block.type === 'block', `Expected a block, got ${block.type}`);

    for (const statement of block.children) {
        assert(statement.type === 'stat' || statement.type === 'retstat', `Expected a statement or a return statement, got ${statement.type}`);

        if (statement.type === 'retstat') {
            return runReturnStatement(statement, scope);
        } else if (statement.type === 'stat' && statement.children.length === 1 && statement.children[0].type === 'token' && statement.children[0].token.type === 'reserved' && statement.children[0].token.value === 'BREAK') {
            assert(allowBreak, `'break' statement outside loop`);

            return toLuaValue(null);
        }

        runStatement(statement, scope);
    }

    return toLuaValue(null);
}

export function runChunk(tree: AbstractSyntaxTree, globalScope: LuaScope): LuaValue {
    assert(tree.type === 'chunk', `Expected a chunk, got ${tree.type}`);

    return runBlock(tree.children[0], new LuaScope(globalScope));
}

function debug(...args: any[]) {
    if (true) {
        return;
    }

    console.log("[DEBUG]", ...args);
}

export function stringifyLuaValue(value: LuaValue): string {
    if (value.type === LuaType.Nil) {
        return `<nil>`;
    }

    return `<${value.type}>(${JSON.stringify(value.jsValue)})`;
}
