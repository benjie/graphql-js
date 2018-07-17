"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.undefinedVarMessage = undefinedVarMessage;
exports.NoUndefinedVariables = NoUndefinedVariables;

var _error = require("../../error");

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *  strict
 */
function undefinedVarMessage(varName, opName) {
  return opName ? "Variable \"$".concat(varName, "\" is not defined by operation \"").concat(opName, "\".") : "Variable \"$".concat(varName, "\" is not defined.");
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
 * vused ariables, excluding other fragments with variables defined.
 */


function NoUndefinedVariables(context) {
  var variableNameDefined = Object.create(null);
  var executableDefinitionVisitor = {
    enter: function enter(definition) {
      if (!context.isExecutableDefinitionWithVariables(definition)) {
        return;
      }

      variableNameDefined = Object.create(null);
    },
    leave: function leave(definition) {
      if (!context.isExecutableDefinitionWithVariables(definition)) {
        return;
      }

      var usages = context.getRecursiveVariableUsages(definition);
      usages.forEach(function (_ref) {
        var node = _ref.node;
        var varName = node.name.value;

        if (variableNameDefined[varName] !== true) {
          context.reportError(new _error.GraphQLError(undefinedVarMessage(varName, definition.name && definition.name.value), [node, definition]));
        }
      });
    }
  };
  return {
    OperationDefinition: executableDefinitionVisitor,
    FragmentDefinition: executableDefinitionVisitor,
    VariableDefinition: function VariableDefinition(node) {
      variableNameDefined[node.variable.name.value] = true;
    }
  };
}