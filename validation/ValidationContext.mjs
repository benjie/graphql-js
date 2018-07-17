function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *  strict
 */
import { GraphQLError } from '../error';
import { visit, visitWithTypeInfo } from '../language/visitor';
import { Kind } from '../language/kinds';
import { GraphQLSchema } from '../type/schema';
import { TypeInfo } from '../utilities/TypeInfo';

/**
 * An instance of this class is passed as the "this" context to all validators,
 * allowing access to commonly useful contextual information from within a
 * validation rule.
 */
var ValidationContext =
/*#__PURE__*/
function () {
  function ValidationContext(schema, ast, typeInfo) {
    _defineProperty(this, "_schema", void 0);

    _defineProperty(this, "_ast", void 0);

    _defineProperty(this, "_typeInfo", void 0);

    _defineProperty(this, "_errors", void 0);

    _defineProperty(this, "_fragments", void 0);

    _defineProperty(this, "_fragmentSpreads", void 0);

    _defineProperty(this, "_recursivelyReferencedFragments", void 0);

    _defineProperty(this, "_variableUsages", void 0);

    _defineProperty(this, "_recursiveVariableUsages", void 0);

    this._schema = schema;
    this._ast = ast;
    this._typeInfo = typeInfo;
    this._errors = [];
    this._fragmentSpreads = new Map();
    this._recursivelyReferencedFragments = new Map();
    this._variableUsages = new Map();
    this._recursiveVariableUsages = new Map();
  }

  var _proto = ValidationContext.prototype;

  _proto.reportError = function reportError(error) {
    this._errors.push(error);
  };

  _proto.getErrors = function getErrors() {
    return this._errors;
  };

  _proto.getSchema = function getSchema() {
    return this._schema;
  };

  _proto.getDocument = function getDocument() {
    return this._ast;
  };

  _proto.getFragment = function getFragment(name) {
    var fragments = this._fragments;

    if (!fragments) {
      this._fragments = fragments = this.getDocument().definitions.reduce(function (frags, statement) {
        if (statement.kind === Kind.FRAGMENT_DEFINITION) {
          frags[statement.name.value] = statement;
        }

        return frags;
      }, Object.create(null));
    }

    return fragments[name];
  };

  _proto.getFragmentSpreads = function getFragmentSpreads(node) {
    var spreads = this._fragmentSpreads.get(node);

    if (!spreads) {
      spreads = [];
      var setsToVisit = [node];

      while (setsToVisit.length !== 0) {
        var set = setsToVisit.pop();

        for (var i = 0; i < set.selections.length; i++) {
          var selection = set.selections[i];

          if (selection.kind === Kind.FRAGMENT_SPREAD) {
            spreads.push(selection);
          } else if (selection.selectionSet) {
            setsToVisit.push(selection.selectionSet);
          }
        }
      }

      this._fragmentSpreads.set(node, spreads);
    }

    return spreads;
  };
  /*
   * Finds all fragments referenced via the definition, recursively.
   *
   * NOTE: if experimentalFragmentVariables are being used, it excludes all
   * fragments with their own variable definitions: these are considered their
   * own "root" executable definition.
   */


  _proto.getRecursivelyReferencedFragments = function getRecursivelyReferencedFragments(definition) {
    var fragments = this._recursivelyReferencedFragments.get(definition);

    if (!fragments) {
      fragments = [];
      var collectedNames = Object.create(null);
      var nodesToVisit = [definition.selectionSet];

      while (nodesToVisit.length !== 0) {
        var node = nodesToVisit.pop();
        var spreads = this.getFragmentSpreads(node);

        for (var i = 0; i < spreads.length; i++) {
          var fragName = spreads[i].name.value;

          if (collectedNames[fragName] !== true) {
            collectedNames[fragName] = true;
            var fragment = this.getFragment(fragName);

            if (fragment && !this.isExecutableDefinitionWithVariables(fragment)) {
              fragments.push(fragment);
              nodesToVisit.push(fragment.selectionSet);
            }
          }
        }
      }

      this._recursivelyReferencedFragments.set(definition, fragments);
    }

    return fragments;
  };

  _proto.getVariableUsages = function getVariableUsages(node) {
    var usages = this._variableUsages.get(node);

    if (!usages) {
      var newUsages = [];
      var typeInfo = new TypeInfo(this._schema);
      visit(node, visitWithTypeInfo(typeInfo, {
        VariableDefinition: function VariableDefinition() {
          return false;
        },
        Variable: function Variable(variable) {
          newUsages.push({
            node: variable,
            type: typeInfo.getInputType(),
            defaultValue: typeInfo.getDefaultValue()
          });
        }
      }));
      usages = newUsages;

      this._variableUsages.set(node, usages);
    }

    return usages;
  };
  /*
   * Finds all variables used by the definition, recursively.
   *
   * NOTE: if experimentalFragmentVariables are being used, it excludes all
   * fragments with their own variable definitions: these are considered their
   * own independent executable definition for the purposes of variable usage.
   */


  _proto.getRecursiveVariableUsages = function getRecursiveVariableUsages(definition) {
    var usages = this._recursiveVariableUsages.get(definition);

    if (!usages) {
      usages = this.getVariableUsages(definition);
      var fragments = this.getRecursivelyReferencedFragments(definition);

      for (var i = 0; i < fragments.length; i++) {
        Array.prototype.push.apply(usages, this.getVariableUsages(fragments[i]));
      }

      this._recursiveVariableUsages.set(definition, usages);
    }

    return usages;
  };

  _proto.getType = function getType() {
    return this._typeInfo.getType();
  };

  _proto.getParentType = function getParentType() {
    return this._typeInfo.getParentType();
  };

  _proto.getInputType = function getInputType() {
    return this._typeInfo.getInputType();
  };

  _proto.getParentInputType = function getParentInputType() {
    return this._typeInfo.getParentInputType();
  };

  _proto.getFieldDef = function getFieldDef() {
    return this._typeInfo.getFieldDef();
  };

  _proto.getDirective = function getDirective() {
    return this._typeInfo.getDirective();
  };

  _proto.getArgument = function getArgument() {
    return this._typeInfo.getArgument();
  }; // All OperationDefinitions, or FragmentDefinitions with variable definitions


  _proto.isExecutableDefinitionWithVariables = function isExecutableDefinitionWithVariables(definition) {
    return definition.kind === Kind.OPERATION_DEFINITION || definition.variableDefinitions != null && definition.variableDefinitions.length > 0;
  };

  return ValidationContext;
}();

export { ValidationContext as default };