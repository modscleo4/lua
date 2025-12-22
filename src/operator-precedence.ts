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

export const PRECEDENCE: Record<string, number> = {
  '^': 12,
  'NOT': 11,
  '#': 11,
  '~': 5,
  '*': 10,
  '/': 10,
  '//': 10,
  '%': 10,
  '+': 9,
  '-': 9,
  '..': 8,
  '<<': 7,
  '>>': 7,
  '&': 6,
  '|': 4,
  '<': 3,
  '>': 3,
  '<=': 3,
  '>=': 3,
  '~=': 3,
  '==': 3,
  'AND': 2,
  'OR': 1,
};

export function precedence(operator: Token): number {
  if (
    operator.type !== 'operator' &&
    !(operator.type === 'reserved' && (operator.value === 'AND' || operator.value === 'OR' || operator.value === 'NOT'))
  ) {
    throw new Error(`Expected operator, got ${operator.type}`);
  }

  return PRECEDENCE[operator.value] ?? 0;
}
