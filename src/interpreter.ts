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

import { AbstractSyntaxTree, Terminal } from "./parser.js";
import { Token } from "./tokenizer.js";

export enum LuaType {
    Nil = 'nil',
    Boolean = 'boolean',
    Number = 'number',
    String = 'string',
    Table = 'table',
    Function = 'function',
    Userdata = 'userdata',
    Thread = 'thread',
}

type LuaNil = {
    type: LuaType.Nil;
    jsValue: null;
};

type LuaBoolean = {
    type: LuaType.Boolean;
    jsValue: boolean;
};

type LuaNumber = {
    type: LuaType.Number;
    jsValue: number;
};

type LuaString = {
    type: LuaType.String;
    jsValue: string;
};

type LuaTable = {
    type: LuaType.Table;
    jsValue: LuaScope;
};

type LuaFunction = {
    type: LuaType.Function;
    name?: string;
    arguments: string[];
    jsValue: LuaFunctionWrapper;
};

type LuaUserdata = {
    type: LuaType.Userdata;
    jsValue: unknown;
};

type LuaThread = {
    type: LuaType.Thread;
    jsValue: unknown;
};

export type LuaScope = Map<LuaValue, LuaValue>;

export type LuaValue = LuaNil | LuaBoolean | LuaNumber | LuaString | LuaTable | LuaFunction | LuaUserdata | LuaThread;

export type LuaFunctionWrapper = (globalScope: LuaScope, args: LuaScope) => LuaValue;

const luaValueCache: Map<any, LuaValue> = new Map();

export function convertToLuaValue(value: null): LuaNil;
export function convertToLuaValue(value: boolean): LuaBoolean;
export function convertToLuaValue(value: number): LuaNumber;
export function convertToLuaValue(value: string): LuaString;
export function convertToLuaValue(value: LuaScope): LuaTable;
export function convertToLuaValue(value: LuaFunctionWrapper): LuaFunction;
export function convertToLuaValue(value: unknown): LuaUserdata;
export function convertToLuaValue(value: unknown): LuaThread;
export function convertToLuaValue(value: any): LuaValue {
    if (value === null) {
        return { type: LuaType.Nil, jsValue: null };
    } else if (typeof value === 'boolean') {
        return { type: LuaType.Boolean, jsValue: value };
    } else if (typeof value === 'number') {
        return { type: LuaType.Number, jsValue: value };
    } else if (typeof value === 'string') {
        return { type: LuaType.String, jsValue: value };
    } else if (typeof value === 'function') {
        return { type: LuaType.Function, arguments: [], jsValue: value };
    } else if (value instanceof Map) {
        return { type: LuaType.Table, jsValue: value };
    }

    return { type: LuaType.Nil, jsValue: null };
}

export function toLuaValue(value: null): LuaNil;
export function toLuaValue(value: boolean): LuaBoolean;
export function toLuaValue(value: number): LuaNumber;
export function toLuaValue(value: string): LuaString;
export function toLuaValue(value: LuaScope): LuaTable;
export function toLuaValue(value: LuaFunctionWrapper): LuaFunction;
export function toLuaValue(value: unknown): LuaUserdata;
export function toLuaValue(value: unknown): LuaThread;
export function toLuaValue(value: any) {
    if (luaValueCache.has(value)) {
        return luaValueCache.get(value)!;
    }

    const luaValue = convertToLuaValue(value);
    luaValueCache.set(value, luaValue);
    return luaValue;
}

function isFalsyLuaValue(value: LuaValue): boolean {
    return value.type === LuaType.Nil || value.type === LuaType.Boolean && value.jsValue === false;
}

function isTruthyLuaValue(value: LuaValue): boolean {
    return !isFalsyLuaValue(value);
}

function parseParameterList(parlist: AbstractSyntaxTree): string[] {
    if (parlist.type !== 'parlist') {
        throw new Error(`Expected a parlist, got ${parlist.type}`);
    }

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

function parseFunctionBody(name: string | undefined, funcbody: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue {
    if (funcbody.type !== 'funcbody') {
        throw new Error(`Expected a functionbody, got ${funcbody.type}`);
    }

    const args = funcbody.children.length === 4 ? [] : parseParameterList(funcbody.children[1]);

    const block = funcbody.children[2 + args.length];

    const luaFunction = toLuaValue(function (globalScope: LuaScope, args: LuaScope) { return runBlock(block, globalScope, args); });
    luaFunction.name = name;
    luaFunction.arguments = args;

    return luaFunction;
}

function defineFunction(functiondef: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue {
    if (functiondef.type !== 'functiondef') {
        throw new Error(`Expected a functiondef, got ${functiondef.type}`);
    }

    return parseFunctionBody(undefined, functiondef.children[1], globalScope, localScope);
}

function retrieveFunctionName(funcname: AbstractSyntaxTree): string {
    if (funcname.type !== 'funcname') {
        throw new Error(`Expected a funcname, got ${funcname.type}`);
    }

    let name = fetchIdentifier(funcname.children[0]);

    for (let i = 1; i < funcname.children.length; i += 2) {
        name += fetchSeparator(funcname.children[i]);
        name += fetchIdentifier(funcname.children[i + 1]);
    }

    return name;
}

function defineNamedFunction(funcname: AbstractSyntaxTree, funcbody: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue {
    const name = retrieveFunctionName(funcname);
    debug(`Defining function '${name}'`);
    const func = parseFunctionBody(name, funcbody, globalScope, localScope);

    globalScope.set(toLuaValue(name), func);

    return func;
}

function constructTable(tableconstructor: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue {
    const table: Map<LuaValue, LuaValue> = new Map();

    return toLuaValue(table);
}

function fetchOperator(operator: AbstractSyntaxTree): Token {
    if (operator.type !== 'binop' && operator.type !== 'unop') {
        throw new Error(`Expected a binop or unop, got ${operator.type}`);
    }

    if (operator.children[0].type !== 'token') {
        throw new Error(`Expected a token, got ${operator.children[0].type}`);
    }

    return operator.children[0].token;
}

function fetchIdentifier(token: AbstractSyntaxTree): string {
    if (token.type !== 'token') {
        throw new Error(`Expected a token, got ${token.type}`);
    }

    if (token.token.type !== 'identifier') {
        throw new Error(`Expected an identifier, got ${token.token.type}`);
    }

    return token.token.value;
}

function fetchString(token: AbstractSyntaxTree): string {
    if (token.type !== 'token') {
        throw new Error(`Expected a token, got ${token.type}`);
    }

    if (token.token.type !== 'constant' || token.token.additional !== 'string') {
        throw new Error(`Expected a string, got ${token.token.type}`);
    }

    return token.token.value;
}

function fetchSeparator(token: AbstractSyntaxTree): string {
    if (token.type !== 'token') {
        throw new Error(`Expected a token, got ${token.type}`);
    }

    if (token.token.type !== 'separator') {
        throw new Error(`Expected a separator, got ${token.token.type}`);
    }

    return token.token.value;
}

function fetchTokenValue(token: AbstractSyntaxTree): LuaValue {
    if (token.type !== 'token') {
        throw new Error(`Expected a token, got ${token.type}`);
    }

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

function evaluateExpression(expression: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue {
    if (expression.type !== 'exp') {
        throw new Error(`Expected an exp, got ${expression.type}`);
    }

    debug(`Evaluating expression '${expression.children.map(p => p.type)}'`);

    if (expression.children[0].type === 'token') {
        if (expression.children[0].token?.type === 'operator') { // ...

        } else {
            return fetchTokenValue(expression.children[0]);
        }
    } else if (expression.children.length === 1) {
        switch (expression.children[0].type) {
            case 'functiondef':
                return defineFunction(expression.children[0], globalScope, localScope);
            case 'tableconstructor':
                return constructTable(expression.children[0], globalScope, localScope);
            case 'prefixexp':
                return evaluatePrefixedExpression(expression.children[0], globalScope, localScope);
        }
    } else if (expression.children.length === 3 && expression.children[1].type === 'binop') {
        const lhs = evaluateExpression(expression.children[0], globalScope, localScope);
        const op = fetchOperator(expression.children[1]).value;

        switch (op) {
            case 'AND':
                debug(`Evaluating 'and' expression and short-circuiting if necessary`);
                // Short-circuiting
                if (isFalsyLuaValue(lhs)) {
                    debug(`Short-circuiting 'and' expression`);
                    return toLuaValue(false);
                }

                return evaluateExpression(expression.children[2], globalScope, localScope);
            case 'OR':
                debug(`Evaluating 'or' expression and short-circuiting if necessary`);
                // Short-circuiting
                if (isTruthyLuaValue(lhs)) {
                    debug(`Short-circuiting 'or' expression`);
                    return lhs;
                }

                return evaluateExpression(expression.children[2], globalScope, localScope);
        }

        const rhs = evaluateExpression(expression.children[2], globalScope, localScope);

        switch (op) {
            case '+':
                if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                    return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) + (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
                }

                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${rhs.type} value`);
                }

                return toLuaValue(lhs.jsValue + rhs.jsValue);
            case '-':
                if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                    return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) - (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
                }

                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${rhs.type} value`);
                }

                return toLuaValue(lhs.jsValue - rhs.jsValue);
            case '*':
                if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                    return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) * (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
                }

                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${rhs.type} value`);
                }

                return toLuaValue(lhs.jsValue * rhs.jsValue);
            case '/':
                if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                    return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) / (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
                }

                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${rhs.type} value`);
                }

                return toLuaValue(lhs.jsValue / rhs.jsValue);
            case '^':
                if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                    return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) ** (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
                }

                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${rhs.type} value`);
                }

                return toLuaValue(lhs.jsValue ** rhs.jsValue);
            case '%':
                if ((lhs.type === LuaType.String || lhs.type === LuaType.Number) && (rhs.type === LuaType.String || rhs.type === LuaType.Number)) {
                    return toLuaValue((lhs.type === LuaType.String ? parseFloat(lhs.jsValue) : lhs.jsValue) % (rhs.type === LuaType.String ? parseFloat(rhs.jsValue) : rhs.jsValue));
                }

                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform arithmetic on a ${rhs.type} value`);
                }

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
                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${rhs.type} value`);
                }

                return toLuaValue(lhs.jsValue & rhs.jsValue);
            case '|':
                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${rhs.type} value`);
                }

                return toLuaValue(lhs.jsValue | rhs.jsValue);
            case '~':
                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${rhs.type} value`);
                }

                return toLuaValue(lhs.jsValue ^ rhs.jsValue);
            case '<<':
                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${rhs.type} value`);
                }

                return toLuaValue(lhs.jsValue << rhs.jsValue);
            case '>>':
                if (lhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${lhs.type} value`);
                }

                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${rhs.type} value`);
                }

                return toLuaValue(lhs.jsValue >> rhs.jsValue);
        }
    } else if (expression.children.length === 2 && expression.children[0].type === 'unop') {
        const op = fetchOperator(expression.children[0]).value;
        const rhs = evaluateExpression(expression.children[1], globalScope, localScope);

        switch (op) {
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
                if (rhs.type !== LuaType.Number) {
                    throw new Error(`Attempt to perform bitwise on a ${rhs.type} value`);
                }

                return toLuaValue(~rhs.jsValue);
        }
    }

    return toLuaValue(null);
}

function evaluateExpressionList(explist: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue[] {
    if (explist.type !== 'explist') {
        throw new Error(`Expected an explist, got ${explist.type}`);
    }

    const values: LuaValue[] = [];
    for (const exp of explist.children) {
        values.push(evaluateExpression(exp, globalScope, localScope));
    }

    return values;
}

function fetchVariable(variable: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue {
    if (variable.type !== 'var') {
        throw new Error(`Expected a var, got ${variable.type}`);
    }

    if (variable.children.length === 1) {
        const varname = toLuaValue(fetchIdentifier(variable.children[0]));
        debug(`Fetching variable '${varname.jsValue}' from localScope`);
        if (localScope.has(varname)) {
            debug(`Variable '${varname.jsValue}' has the value ${localScope.get(varname)!.jsValue}`);
            return localScope.get(varname)!;
        }

        debug(`Fetching variable '${varname.jsValue}' from globalScope`);

        if (!globalScope.has(varname)) {
            debug(`variable '${varname.jsValue}' is not on the globalScope, returning nil`);
        }

        //debug(`Variable '${varname.jsValue}' has the value ${globalScope.get(varname)!.jsValue}`);

        return globalScope.get(varname)!;
    } else if (variable.children.length === 4) {
        const table = evaluatePrefixedExpression(variable.children[0], globalScope, localScope);
        const index = evaluateExpression(variable.children[2], globalScope, localScope);

        if (table.type === LuaType.Table) {
            if (index.type === LuaType.Nil) {
                throw new Error(`'index' cannot be nil`);
            }

            return toLuaValue(table.jsValue.get(index));
        }

        throw new Error(`'variable' is not a table`);
    } else if (variable.children.length === 3) {
        const table = evaluatePrefixedExpression(variable.children[0], globalScope, localScope);
        const index = evaluateExpression(variable.children[1], globalScope, localScope);

        if (table.type === LuaType.Table) {
            if (index.type === LuaType.Nil) {
                throw new Error(`'index' cannot be nil`);
            }

            return toLuaValue(table.jsValue.get(index));
        }

        throw new Error(`'variable' is not a table`);
    }

    // All undefined variables are nil by default
    return toLuaValue(null);
}

function evaluatePrefixedExpression(prefixexp: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue {
    if (prefixexp.type !== 'prefixexp') {
        throw new Error(`Expected a prefixexp, got ${prefixexp.type}`);
    }

    debug(`Evaluating prefixed expression '${prefixexp.children.map(p => p.type)}'`);
    if (prefixexp.children.length === 1) {
        switch (prefixexp.children[0].type) {
            case 'var':
                return fetchVariable(prefixexp.children[0], globalScope, localScope);
            case 'functioncall':
                return callFunction(prefixexp.children[0], globalScope, localScope);
        }
    } else if (prefixexp.children.length === 3) { // '(' exp ')'
        const exp = prefixexp.children[1];

        return evaluateExpression(exp, globalScope, localScope);
    }

    // Should never happen
    //throw new Error(`Unable to evaluate prefixed expression`);
    return toLuaValue(null);
}

function callFunction(functioncall: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue {
    if (functioncall.type !== 'functioncall') {
        throw new Error(`Expected a functioncall, got ${functioncall.type}`);
    }

    if (functioncall.children.length === 2) { // prefixexp args
        const func = evaluatePrefixedExpression(functioncall.children[0], globalScope, localScope);
        const args = functioncall.children[1];
        if (args.type !== 'args') {
            throw new Error(`Expected an args, got ${args.type}`);
        }

        if (func.type === LuaType.Function) {
            if (args.children.length === 1 && args.children[0].type === 'token') { // function 'string'
                const argValues = [args.children[0].token!.value].map(av => toLuaValue(av.trim()));
                debug(`Calling function '${func.name}' with arguments '${argValues.map(av => av.type).join(', ')}'`);

                const fnCallScope: LuaScope = new Map(localScope);
                for (let i = 0; i < func.arguments.length; i++) {
                    if (func.arguments[i] === '...') {
                        continue;
                    }

                    fnCallScope.set(toLuaValue(func.arguments[i]), argValues[i]);
                }

                const result = func.jsValue(globalScope, fnCallScope);

                debug(`Function '${func.name}' returned '${JSON.stringify(result)}'`);

                return result;
            } else if (args.children.length === 1 && args.children[0].type === 'tableconstructor') {
                const argValues = [args.children[0]].map(arg => constructTable(arg.children[0], globalScope, localScope));
                debug(`Calling function '${func.name}' with arguments '${argValues.map(av => av.type).join(', ')}'`);

                const fnCallScope: LuaScope = new Map(localScope);
                for (let i = 0; i < func.arguments.length; i++) {
                    if (func.arguments[i] === '...') {
                        continue;
                    }

                    fnCallScope.set(toLuaValue(func.arguments[i]), argValues[i]);
                }

                const result = func.jsValue(globalScope, fnCallScope);

                debug(`Function '${func.name}' returned '${JSON.stringify(result)}'`);

                return result;
            }

            const argValues = evaluateExpressionList(args.children[1], globalScope, localScope);
            debug(`Calling function '${func.name}' with arguments '${argValues.map(av => av.type).join(', ')}'`);

            const fnCallScope: LuaScope = new Map(localScope);
            for (let i = 0; i < func.arguments.length; i++) {
                if (func.arguments[i] === '...') {
                    continue;
                }

                fnCallScope.set(toLuaValue(func.arguments[i]), argValues[i]);
            }

            const result = func.jsValue(globalScope, fnCallScope);

            debug(`Function '${func.name}' returned '${JSON.stringify(result)}'`);

            return result;
        }
    } else if (functioncall.children.length === 4) { // prefixexp ':' NAME args

    }

    return toLuaValue(null);
}

function defineVariables(varlist: AbstractSyntaxTree, explist: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope) {
    if (varlist.type !== 'varlist') {
        throw new Error(`Expected a varlist, got ${varlist.type}`);
    }

    const expValues = evaluateExpressionList(explist, globalScope, localScope);

    debug(`Defining ${varlist.children.length} variables`);

    for (let i = 0; i < varlist.children.length; i++) {
        const v = varlist.children[i];
        if (v.type !== 'var') {
            throw new Error(`Expected a var, got ${v.type}`);
        }

        if (v.children.length === 4) { // prefixexp '[' exp ']'
            const table = evaluatePrefixedExpression(v.children[0], globalScope, localScope);
            const index = evaluateExpression(v.children[2], globalScope, localScope);

            if (table.type === LuaType.Table) {
                if (index.type === LuaType.Nil) {
                    throw new Error(`'index' cannot be nil`);
                }

                debug(`Assigning expression ${i} to table index '${index.jsValue}'`);

                const val = expValues[i];
                table.jsValue.set(index, val);
            }

            continue;
        } else if (v.children.length === 3) { // prefixexp '.' NAME
            const table = evaluatePrefixedExpression(v.children[0], globalScope, localScope);
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
        const scope = localScope.has(toLuaValue(varname)) ? localScope : globalScope;
        if (val.type === LuaType.Nil) {
            scope.delete(toLuaValue(varname));
        } else {
            scope.set(toLuaValue(varname), val);
        }

        debug(`Variable '${varname}' now has value '${val.jsValue}'`);
    }
}

function defineLocalVariables(attnamelist: AbstractSyntaxTree, explist: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope) {
    if (attnamelist.type !== 'attnamelist') {
        throw new Error(`Expected an attnamelist, got ${attnamelist.type}`);
    }

    const expValues = evaluateExpressionList(explist, globalScope, localScope);

    debug(`Defining ${attnamelist.children.length} local variables`);
    let exp = 0;
    for (let att = 0; att < attnamelist.children.length; att++) {
        const attName = attnamelist.children[att];
        if (attName.type !== 'token' || attName.token!.type !== 'identifier') {
            continue;
        }

        const varname = fetchIdentifier(attName);

        debug(`Assigning expression ${exp} to variable '${varname}' in localScope`);

        const val = expValues[exp];
        localScope.set(toLuaValue(varname), val);

        debug(`Variable '${varname}' now has value '${val.jsValue}'`);
    }
}

function defineLocalFunction(funcname: AbstractSyntaxTree, funcbody: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope) {
    const name = fetchIdentifier(funcname);
    const func = parseFunctionBody(name, funcbody, globalScope, localScope);

    debug(`Defining local function '${name}'`);
    localScope.set(toLuaValue(name), func);
}

function runForLoop(variableName: AbstractSyntaxTree, assign: AbstractSyntaxTree, stopCondition: AbstractSyntaxTree, block: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope) {
    if (variableName.type !== 'token') {
        throw new Error(`Expected a token, got ${variableName.type}`);
    }

    debug(`Running for loop with variable '${variableName.token.value}'`);
    const variable = evaluateExpression(assign, globalScope, localScope);

    if (variable.type !== LuaType.Number) {
        throw new Error(`For loop variable '${variableName.token.value}' is not a number`);
    }

    let stopConditionValue = evaluateExpression(stopCondition, globalScope, localScope);
    if (stopConditionValue.type !== LuaType.Number) {
        throw new Error(`For loop stop condition is not a number`);
    }

    const forScope: LuaScope = localScope;//new Map(localScope);
    for (let i = variable.jsValue; i <= stopConditionValue.jsValue; i++) {
        forScope.set(toLuaValue(variableName.token.value), toLuaValue(i));
        runBlock(block, globalScope, forScope);
        stopConditionValue = evaluateExpression(stopCondition, globalScope, forScope);
        if (stopConditionValue.type !== LuaType.Number) {
            throw new Error(`For loop stop condition is not a number`);
        }
    }

    forScope.delete(toLuaValue(variableName.token.value));
}

function runForInLoop(namelist: AbstractSyntaxTree, explist: AbstractSyntaxTree, block: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope) {
    if (namelist.type !== 'namelist') {
        throw new Error(`Expected a namelist, got ${namelist.type}`);
    }

    if (explist.type !== 'explist') {
        throw new Error(`Expected an explist, got ${explist.type}`);
    }

    debug(`Running for-in loop`);
}

function runStatement(statement: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope) {
    if (statement.type !== 'stat') {
        throw new Error(`Expected a statement, got ${statement.type}`);
    }

    if (statement.children[0].type === 'varlist') { // assignment
        const varlist = statement.children[0];
        const explist = statement.children[2];

        defineVariables(varlist, explist, globalScope, localScope);
    } else if (statement.children[0].type === 'functioncall') {
        callFunction(statement.children[0], globalScope, localScope);
    } else if (statement.children[0].type === 'token') {
        switch (statement.children[0].token.type) {
            case 'separator':
                return;

            case 'reserved':
                switch (statement.children[0].token.value) {
                    case 'DO':
                        runBlock(statement.children[1], globalScope, new Map(localScope));
                        break;
                    case 'FOR':
                        if (statement.children[1].type === 'token' && statement.children[1].token!.type === 'identifier') {
                            runForLoop(statement.children[1]!, statement.children[3], statement.children[5], statement.children[7], globalScope, localScope);
                        } else {
                            runForInLoop(statement.children[1], statement.children[3], statement.children[5], globalScope, localScope);
                        }

                        break;
                    case 'FUNCTION':
                        defineNamedFunction(statement.children[1], statement.children[2], globalScope, localScope);
                        break;
                    case 'LOCAL':
                        if (statement.children[1].type === 'token' && statement.children[1].token!.value === 'FUNCTION') {
                            defineLocalFunction(statement.children[2], statement.children[3], globalScope, localScope);
                        } else {
                            defineLocalVariables(statement.children[1], statement.children[3], globalScope, localScope);
                        }

                        break;
                }
                break;
        }
    }
}

function runReturnStatement(retstat: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue {
    if (retstat.type !== 'retstat') {
        throw new Error(`Expected a return statement, got ${retstat.type}`);
    }

    const returnValues = evaluateExpressionList(retstat.children[1], globalScope, localScope);

    return returnValues.length === 1 ? returnValues[0] : toLuaValue(returnValues);
}

function runBlock(block: AbstractSyntaxTree, globalScope: LuaScope, localScope: LuaScope): LuaValue {
    if (block.type !== 'block') {
        throw new Error(`Expected a chunk, got ${block.type}`);
    }

    for (const statement of block.children) {
        if (statement.type !== 'stat' && statement.type !== 'retstat') {
            throw new Error(`Expected a statement or a return statement, got ${statement.type}`);
        }

        if (statement.type === 'retstat') {
            return runReturnStatement(statement, globalScope, localScope);
        }

        runStatement(statement, globalScope, localScope);
    }

    return toLuaValue(null);
}

export function interpret(tree: AbstractSyntaxTree, globalScope: LuaScope) {
    if (tree.type !== 'chunk') {
        throw new Error(`Expected a chunk, got ${tree.type}`);
    }

    runBlock(tree.children[0], globalScope, new Map());
}

function debug(...args: any[]) {
    console.log("[DEBUG]", ...args);
}
