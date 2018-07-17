/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *  strict
 */
import { GraphQLError } from '../../error';
export function unusedVariableMessage(varName, opName) {
  return opName ? "Variable \"$".concat(varName, "\" is never used in operation \"").concat(opName, "\".") : "Variable \"$".concat(varName, "\" is never used.");
}
/**
 * No unused variables
 *
 * A GraphQL definition is only valid if all variables defined by that
 * definition are used, either directly or within a spread fragment.
 *
 * NOTE: if experimentalFragmentVariables are used, then fragments with
 * variables defined are considered independent "executable definitions".
 * So `query Foo` must not define `$a` when `$a` is only used inside
 * `fragment FragA($a: Type)`
 */

export function NoUnusedVariables(context) {
  var variableDefs = [];
  var executableDefinitionVisitor = {
    enter: function enter(definition) {
      if (!context.isExecutableDefinitionWithVariables(definition)) {
        return;
      }

      variableDefs = [];
    },
    leave: function leave(definition) {
      if (!context.isExecutableDefinitionWithVariables(definition)) {
        return;
      }

      var variableNameUsed = Object.create(null);
      var usages = context.getRecursiveVariableUsages(definition);
      var opName = definition.name ? definition.name.value : null;
      usages.forEach(function (_ref) {
        var node = _ref.node;
        variableNameUsed[node.name.value] = true;
      });
      variableDefs.forEach(function (variableDef) {
        var variableName = variableDef.variable.name.value;

        if (variableNameUsed[variableName] !== true) {
          context.reportError(new GraphQLError(unusedVariableMessage(variableName, opName), [variableDef]));
        }
      });
    }
  };
  return {
    OperationDefinition: executableDefinitionVisitor,
    FragmentDefinition: executableDefinitionVisitor,
    VariableDefinition: function VariableDefinition(def) {
      variableDefs.push(def);
    }
  };
}