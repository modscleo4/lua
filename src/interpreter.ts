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
    arguments: LuaString[];
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

export type LuaFunctionWrapper = (args: LuaScope) => LuaValue;

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

function parseFunctionBody(name: string | undefined, functionbody: AbstractSyntaxTree, scope: LuaScope = new Map()): LuaValue {
    const args: LuaString[] = [];
    for (let i = 0; i < functionbody.children[0].children.length; i++) {
        args.push(toLuaValue(functionbody.children[0].children[i].parsed[0].token!.value));
    }

    const block = functionbody.children[1];

    const luaFunction = toLuaValue(function (args: LuaScope) { return runBlock(block, args); });
    luaFunction.name = name;
    luaFunction.arguments = args;

    return luaFunction;
}

function defineFunction(functiondef: AbstractSyntaxTree, scope: LuaScope = new Map()): LuaValue {
    return parseFunctionBody(undefined, functiondef.children[0]);
}

function retrieveFunctionName(funcname: AbstractSyntaxTree): string {
    let name = funcname.parsed[0].token!.value;

    for (let i = 1; i < funcname.parsed.length; i += 2) {
        name += funcname.parsed[i].token!.value;
        name += funcname.parsed[i + 1].token!.value;
    }

    return name;
}

function defineNamedFunction(funcname: AbstractSyntaxTree, funcbody: AbstractSyntaxTree, scope: LuaScope = new Map()): LuaValue {
    const name = retrieveFunctionName(funcname);
    debug(`Defining function '${name}'`);
    const func = parseFunctionBody(name, funcbody, scope);

    scope.set(toLuaValue(name), func);

    return func;
}

function constructTable(tableconstructor: AbstractSyntaxTree, scope: LuaScope = new Map()): LuaValue {
    const table: Map<LuaValue, LuaValue> = new Map();

    return toLuaValue(table);
}

function evaluateExpression(expression: AbstractSyntaxTree, scope: LuaScope = new Map()): LuaValue {
    debug(`Evaluating expression '${expression.parsed.map(p => p.grammarSymbol.toString())}'`);

    if (expression.children.length === 0) {
        if (expression.parsed[0].token?.type === 'reserved') {
            switch (expression.parsed[0].token!.value) {
                case 'NIL':
                    return toLuaValue(null);
                case 'TRUE':
                    return toLuaValue(true);
                case 'FALSE':
                    return toLuaValue(false);
            }
        } else if (expression.parsed[0].token?.type === 'constant') {
            const type = expression.parsed[0].token!.additional;
            return toLuaValue(type === 'number' ? parseInt(expression.parsed[0].token!.value) : expression.parsed[0].token!.value);
        } else if (expression.parsed[0].token?.type === 'operator') { // ...

        }
    } else if (expression.children.length === 1) {
        switch (expression.children[0].rule) {
            case 'functiondef':
                return defineFunction(expression.children[0], scope);
            case 'tableconstructor':
                return constructTable(expression.children[0], scope);
            case 'prefixexp':
                return evaluatePrefixedExpression(expression.children[0], scope);
        }
    } else if (expression.children.length === 3 && expression.children[1].rule === 'binop') {
        const lhs = evaluateExpression(expression.children[0], scope);
        const op = expression.children[1].parsed[0].token!.value;

        switch (op) {
            case 'AND':
                debug(`Evaluating 'and' expression and short-circuiting if necessary`);
                // Short-circuiting
                if (isFalsyLuaValue(lhs)) {
                    debug(`Short-circuiting 'and' expression`);
                    return toLuaValue(false);
                }

                return evaluateExpression(expression.children[2], scope);
            case 'OR':
                debug(`Evaluating 'or' expression and short-circuiting if necessary`);
                // Short-circuiting
                if (isTruthyLuaValue(lhs)) {
                    debug(`Short-circuiting 'or' expression`);
                    return lhs;
                }

                return evaluateExpression(expression.children[2], scope);
        }

        const rhs = evaluateExpression(expression.children[2], scope);

        if (lhs.type !== LuaType.Number || rhs.type !== LuaType.Number) {
            return toLuaValue(null);
        }

        switch (op) {
            case '+':
                return toLuaValue(lhs.jsValue + rhs.jsValue);
            case '-':
                return toLuaValue(lhs.jsValue - rhs.jsValue);
            case '*':
                return toLuaValue(lhs.jsValue * rhs.jsValue);
            case '/':
                return toLuaValue(lhs.jsValue / rhs.jsValue);
            case '^':
                return toLuaValue(lhs.jsValue ** rhs.jsValue);
            case '%':
                return toLuaValue(lhs.jsValue % rhs.jsValue);
            case '..':
                return toLuaValue(lhs.jsValue + rhs.jsValue);
            case '<':
                return toLuaValue(lhs.jsValue < rhs.jsValue);
            case '<=':
                return toLuaValue(lhs.jsValue <= rhs.jsValue);
            case '>':
                return toLuaValue(lhs.jsValue > rhs.jsValue);
            case '>=':
                return toLuaValue(lhs.jsValue >= rhs.jsValue);
            case '==':
                return toLuaValue(lhs.jsValue === rhs.jsValue);
            case '~=':
                return toLuaValue(lhs.jsValue !== rhs.jsValue);
            /*case 'and':
                return wrapLuaValue(lhs.jsValue && rhs.jsValue);
            case 'or':
                return wrapLuaValue(lhs.jsValue || rhs.jsValue);*/
        }
    } else if (expression.children.length === 1 && expression.children[1].rule === 'unop') {
        const op = expression.children[0].parsed[0].token!.value;
        const rhs = evaluateExpression(expression.children[1], scope);

        switch (op) {
            case '-':
                if (rhs.type !== LuaType.Number) {
                    return toLuaValue(null);
                }

                return toLuaValue(-rhs.jsValue);
            case 'not':
                return toLuaValue(!rhs.jsValue);
            case '#':
                if (rhs.type !== LuaType.String) {
                    return toLuaValue(null);
                }

                return toLuaValue(rhs.jsValue.length);
        }
    }

    return toLuaValue(null);
}

function fetchVariable(variable: AbstractSyntaxTree, scope: LuaScope = new Map()): LuaValue {
    if (variable.parsed.length === 1) {
        const varname = toLuaValue(variable.parsed[0].token!.value);
        debug(`Fetching variable '${varname.jsValue}'`);

        if (!scope.has(varname)) {
            debug(`variable '${varname.jsValue}' is not on the scope, returning nil`);
            return toLuaValue(null);
        }

        //debug(`Variable '${varname.jsValue}' has the value ${scope.get(varname)!.jsValue}`);

        return scope.get(varname)!;
    } else if (variable.parsed.length === 4) {
        const table = evaluatePrefixedExpression(variable.children[0], scope);
        const index = evaluateExpression(variable.children[2], scope);

        if (table.type === LuaType.Table) {
            if (index.type === LuaType.Nil) {
                throw new Error(`'index' cannot be nil`);
            }

            return toLuaValue(table.jsValue.get(index));
        }

        throw new Error(`'variable' is not a table`);
    } else if (variable.parsed.length === 3) {
        const table = evaluatePrefixedExpression(variable.children[0], scope);
        const index = evaluateExpression(variable.children[1], scope);

        if (table.type === LuaType.Table) {
            if (index.type === LuaType.Nil) {
                throw new Error(`'index' cannot be nil`);
            }

            return toLuaValue(table.jsValue.get(index));
        }
    }

    throw new Error(`Variable not defined`);
}

function evaluatePrefixedExpression(prefixexp: AbstractSyntaxTree, scope: LuaScope = new Map()): LuaValue {
    debug(`Evaluating prefixed expression '${prefixexp.parsed.map(p => p.grammarSymbol.toString())}'`);
    if (prefixexp.children.length === 1) {
        switch (prefixexp.children[0].rule) {
            case 'var':
                return fetchVariable(prefixexp.children[0], scope);
            case 'functioncall':
                return callFunction(prefixexp.children[0], scope);
        }
    } else if (prefixexp.children.length === 3) {
        const lhs = evaluateExpression(prefixexp.children[0], scope);
        const rhs = evaluateExpression(prefixexp.children[2], scope);

        if (lhs.type === LuaType.Table) {
            if (rhs.type === LuaType.Nil) {
                throw new Error(`'index' cannot be nil`);
            }

            return toLuaValue(lhs.jsValue.get(rhs));
        }
    }

    // Should never happen
    //throw new Error(`Unable to evaluate prefixed expression`);
    return toLuaValue(null);
}

function callFunction(functioncall: AbstractSyntaxTree, scope: LuaScope = new Map()): LuaValue {
    if (functioncall.children.length === 2) { // prefixexp args
        const func = evaluatePrefixedExpression(functioncall.children[0], scope);
        const args = functioncall.children[1];

        if (func.type === LuaType.Function) {
            const argValues = args.children[0].children.map(arg => evaluateExpression(arg, scope));
            debug(`Calling function '${func.name}' with arguments '${argValues.map(av => av.type).join(', ')}'`);

            const fnCallScope: LuaScope = new Map(scope);
            for (let i = 0; i < func.arguments.length; i++) {
                fnCallScope.set(func.arguments[i], argValues[i]);
            }

            const result = func.jsValue(fnCallScope);

            debug(`Function '${func.name}' returned '${JSON.stringify(result.jsValue)}'`);

            return result;
        }
    } else if (functioncall.children.length === 4) { // prefixexp ':' NAME args

    }

    return toLuaValue(null);
}

function defineLocalVariables(attnamelist: AbstractSyntaxTree, explist: AbstractSyntaxTree, scope: LuaScope = new Map()) {
    let exp = 0;
    for (let att = 0; att < attnamelist.parsed.length; att++) {
        if (!(attnamelist.parsed[att].grammarSymbol instanceof Terminal) || attnamelist.parsed[att].token!.type !== 'identifier') {
            continue;
        }

        const varname = attnamelist.parsed[att].token!.value;
        const expr = explist.children[exp++];

        debug(`Evaluating expression '${expr.parsed.map(p => p.grammarSymbol.toString())}' and assigning to variable '${varname}'`);

        const val = evaluateExpression(expr, scope);
        scope.set(toLuaValue(varname), val);

        debug(`Variable '${varname}' now has value '${val.jsValue}'`);
    }
}

function runForLoop(variableName: Token, assign: AbstractSyntaxTree, stopCondition: AbstractSyntaxTree, block: AbstractSyntaxTree, scope: LuaScope = new Map()) {
    debug(`Running for loop with variable '${variableName.value}'`);
    const variable = evaluateExpression(assign, scope);

    if (variable.type !== LuaType.Number) {
        throw new Error(`For loop variable '${variableName.value}' is not a number`);
    }

    let stopConditionValue = evaluateExpression(stopCondition, scope);
    if (stopConditionValue.type !== LuaType.Number) {
        throw new Error(`For loop stop condition is not a number`);
    }

    for (let i = variable.jsValue; i <= stopConditionValue.jsValue; i++) {
        scope.set(toLuaValue(variableName.value), toLuaValue(i));
        runBlock(block, scope);
        stopConditionValue = evaluateExpression(stopCondition, scope);
        if (stopConditionValue.type !== LuaType.Number) {
            throw new Error(`For loop stop condition is not a number`);
        }
    }

    scope.delete(toLuaValue(variableName.value));
}

function runForInLoop(namelist: AbstractSyntaxTree, explist: AbstractSyntaxTree, block: AbstractSyntaxTree, scope: LuaScope = new Map()) {
    debug(`Running for-in loop`);
}

function runStatement(statement: AbstractSyntaxTree, scope: LuaScope = new Map()) {
    if (statement.children[0].rule === 'varlist') { // assignment
        const varlist = statement.children[0];
        const explist = statement.children[1];

        for (let i = 0; i < varlist.children.length; i++) {
            const varname = varlist.children[i].parsed[0].token!.value;
            const exp = explist.children[i];

            debug(`Evaluating expression '${exp.parsed.map(p => p.grammarSymbol.toString())}' and assigning to variable '${varname}'`);

            const val = evaluateExpression(exp, scope);
            scope.set(toLuaValue(varname), val);

            debug(`Variable '${varname}' now has value '${val.jsValue}'`);
        }
    } else if (statement.children[0].rule === 'functioncall') {
        callFunction(statement.children[0], scope);
    } else if (statement.parsed[0].token) {
        switch (statement.parsed[0].token.type) {
            case 'separator':
                return;

            case 'reserved':
                switch (statement.parsed[0].token.value) {
                    case 'FOR':
                        if (statement.parsed[1].grammarSymbol instanceof Terminal && statement.parsed[1].token!.type === 'identifier') {
                            runForLoop(statement.parsed[1].token!, statement.children[0], statement.children[1], statement.children[2], scope);
                        } else {
                            runForInLoop(statement.children[0], statement.children[1], statement.children[2], scope);
                        }

                        break;
                    case 'FUNCTION':
                        defineNamedFunction(statement.children[0], statement.children[1], scope);
                        break;
                    case 'LOCAL':
                        if (statement.parsed[1].grammarSymbol instanceof Terminal && statement.parsed[1].token!.value === 'FUNCTION') {
                            //defineLocalFunction(statement.children[0], scope);
                        } else {
                            defineLocalVariables(statement.children[0], statement.children[1], scope);
                        }

                        break;
                }
                break;
        }
    }
}

function runReturnStatement(retstat: AbstractSyntaxTree, scope: LuaScope = new Map()): LuaValue {
    const returnValues: LuaValue[] = [];
    for (const exp of retstat.children[0].children) {
        returnValues.push(evaluateExpression(exp, scope));
    }

    return returnValues.length === 1 ? returnValues[0] : toLuaValue(returnValues);
}

function runBlock(block: AbstractSyntaxTree, scope: LuaScope = new Map()): LuaValue {
    for (const statement of block.children) {
        if (statement.rule === 'retstat') {
            return runReturnStatement(statement, scope);
        }

        runStatement(statement, scope);
    }

    return toLuaValue(null);
}

export function interpret(tree: AbstractSyntaxTree, scope: LuaScope = new Map()) {
    runBlock(tree.children[0], scope);
}

function debug(...args: any[]) {
    console.log("[DEBUG]", ...args);
}
