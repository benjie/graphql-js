/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type ValidationContext from '../ValidationContext';
import { GraphQLError } from '../../error';
import type { ASTVisitor } from '../../language/visitor';
import { Kind } from '../../language';
import type { ExecutableDefinitionNode } from '../../language';

export function undefinedVarMessage(varName: string, opName: ?string): string {
  return opName
    ? `Variable "$${varName}" is not defined by operation "${opName}".`
    : `Variable "$${varName}" is not defined.`;
}

/**
 * No undefined variables
 *
 * A GraphQL definition is only valid if all variables encountered, both
 * directly and via fragment spreads, are defined by that definition.
 *
 * NOTE: if experimentalFragmentVariables are used, then fragments with
 * variables defined are considered independent "executable definitions".
 * If a fragment defines at least 1 variable, it must define all recursively
 * used variables, excluding other fragments with variables defined.
 */
export function NoUndefinedVariables(context: ValidationContext): ASTVisitor {
  let variableNameDefined = Object.create(null);

  const executableDefinitionVisitor = {
    enter() {
      variableNameDefined = Object.create(null);
    },
    leave(definition: ExecutableDefinitionNode) {
      if (
        definition.kind === Kind.FRAGMENT_DEFINITION &&
        Object.keys(variableNameDefined).length === 0
      ) {
        return;
      }
      const usages = context.getRecursiveVariableUsages(definition);

      usages.forEach(({ node }) => {
        const varName = node.name.value;
        if (variableNameDefined[varName] !== true) {
          context.reportError(
            new GraphQLError(
              undefinedVarMessage(
                varName,
                definition.name && definition.name.value,
              ),
              [node, definition],
            ),
          );
        }
      });
    },
  };

  return {
    OperationDefinition: executableDefinitionVisitor,
    FragmentDefinition: executableDefinitionVisitor,
    VariableDefinition(node) {
      variableNameDefined[node.variable.name.value] = true;
    },
  };
}
