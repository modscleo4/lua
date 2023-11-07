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

export type LuaNil = {
    type: LuaType.Nil;
    jsValue: null;
    metatable?: LuaTable;
};

export type LuaBoolean = {
    type: LuaType.Boolean;
    jsValue: boolean;
    metatable?: LuaTable;
};

export type LuaNumber = {
    type: LuaType.Number;
    jsValue: number;
    metatable?: LuaTable;
};

export type LuaString = {
    type: LuaType.String;
    jsValue: string;
    metatable?: LuaTable;
};

export type LuaTable = {
    type: LuaType.Table;
    jsValue: Map<LuaValue, LuaValue>;
    metatable?: LuaTable;
};

export type LuaFunction = {
    type: LuaType.Function;
    name?: string;
    arguments: string[];
    scope?: LuaScope;
    jsValue: LuaFunctionWrapper;
    metatable?: LuaTable;
};

export type LuaUserdata = {
    type: LuaType.Userdata;
    jsValue: unknown;
    metatable?: LuaTable;
};

export type LuaThread = {
    type: LuaType.Thread;
    jsValue: unknown;
    metatable?: LuaTable;
};

export class LuaScope extends Map<LuaValue, LuaValue> {
    #parent?: LuaScope;

    constructor(parent?: LuaScope) {
        super();
        this.#parent = parent;
    }

    get parent() {
        return this.#parent;
    }

    hasRecursive(key: LuaValue): boolean {
        if (this.has(key)) {
            return true;
        }

        if (this.#parent) {
            return this.#parent.hasRecursive(key);
        }

        return false;
    }

    getRecursive(key: LuaValue): LuaValue | undefined {
        if (this.has(key)) {
            return this.get(key);
        }

        if (this.#parent) {
            return this.#parent.getRecursive(key);
        }

        return undefined;
    }

    setRecursive(key: LuaValue, value: LuaValue): this {
        if (this.has(key)) {
            this.set(key, value);
            return this;
        }

        if (this.#parent) {
            return this.#parent.setRecursive(key, value) as this;
        }

        return this.set(key, value);
    }

    deleteRecursive(key: LuaValue): boolean {
        if (this.has(key)) {
            return this.delete(key);
        }

        if (this.#parent) {
            return this.#parent.deleteRecursive(key);
        }

        return false;
    }

    closeVariables() {
        const keys = [...this.keys()].reverse();
        // call __close metamethod for each variable in reverse order
        for (const key of keys) {
            const value = this.get(key)!;

            // Call __close metamethod
            const metatable = value.metatable;
            if (metatable) {
                const close = metatable.jsValue.get(toLuaValue('__close')) as LuaFunction | undefined;
                if (close) {
                    close.jsValue(this, new Map(), []);
                }
            }
        }
    }
};

export type LuaValue = LuaNil | LuaBoolean | LuaNumber | LuaString | LuaTable | LuaFunction | LuaUserdata | LuaThread;

export type LuaFunctionWrapper = (scope: LuaScope, args: Map<string, LuaValue>, varargs: LuaValue[]) => LuaValue;

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

const luaValueCache: Map<any, LuaValue> = new Map();

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
