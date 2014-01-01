define([
  'util/jquery',
  'lib/Class',
  'util/regex',
  'utility/Log'
], function($, Class, regex, Log) {
  return Class.extend({

    _reReservedPrefix: /^_/,

    init: function(args) {
      args = args || {};
      this._elements = [] || args.elements;
      this.isLazy = args.isLazy;
      this._compiled = null;
      // Array of arrays of element IDs. Used for looking up their index.
      this._elementsArrays = [];
    },

    set: function(elements) {
      elements = elements instanceof Array ? elements : [elements];
      this._elements = elements;
      this._compiled = null;
    },

    get: function() {
      return this._elements;
    },

    getAtIndex: function(index) {
      return this._elements[index];
    },

    getElementAtIndex: function(i, j) {
      return this._elementsArrays[i][j];
    },

    compile: function() {
      if (!this._compiled) {
        this._compiled = this._compile();
      }
      return this._compiled;
    },

    _compile: function() {
      var regexes = [], me = this;
      me._elementsArrays = [];
      $.each(me.get(), function(i, elements) {
        var elementArray = [];
        regexes.push(me.compileElements(elements, function(id, elem) {
          elementArray.push(id);
          return elem;
        }));
        me._elementsArrays.push(elementArray);
      });
      return regexes;
    },

    compileElements: function(elements, map) {
      var regexStr = '', me = this;
      // TODO separate the logic from the data (language definition) while still allowing both to be overridden.
      for (var id in elements) {
        if (id.match(this._reReservedPrefix)) {
          // Ignore any elements with underscore prefix. These can be used to define modifiers for each set of elements.
          continue;
        }
        // TODO rather than remove groups, change algorithm to allow them for more complex regex with functions in elements
        var elem = elements[id];
        if (elem) {
          if (map) {
            elem = map(id, elem);
          }
          elem = me.compileElement(id, elem);
          regexStr += '(' + elem + ')|';
        }
      }
      if (regexStr.length) {
        // Remove trailing character
        regexStr = regexStr.substring(0, regexStr.length - 1);
      } else {
        Log.error('No elements compiled', me);
      }
      // TODO support more than one
      return new RegExp(regexStr, elements._modifiers || regex.modifiers);
    },

    compileElement: function(id, elem) {
      var me = this;
      if (elem === null || typeof elem === 'undefined') {
        return null;
      } else if (elem instanceof Array) {
        elem = regex.alt(elem);
      } else if (elem instanceof Function) {
        elem = elem(me, id);
      } else if (elem instanceof Object && !(elem instanceof RegExp)) {
        // TODO avoided using getTypeOf, might be slower
        elem = regex.alt(elem.items, elem.wordBounded);
      }
      elem = regex.toStr(elem);
      elem = regex.expandBackrefs(elem);
      elem = regex.removeGroups(elem);
      elem = regex.replaceDots(elem);
      return (new RegExp(elem)).source;
    },

    isCompiled: function() {
      return !!this._compiled;
    },

    prepend: function() {
      this._elements.unshift.apply(this._elements, arguments);
      return this;
    },

    append: function() {
      this._elements.push.apply(this._elements, arguments);
      return this;
    },

    merge: function(elements, args) {
      args = $.extend(args, {
        index: 0,
        replace: false
      });
      if (args.index >= this._elements.length) {
        throw new Error('Elements index ' + args.index + ' does not exist. Cannot merge.');
      }
      var existingElements = this._elements[args.index];
      for (var id in elements) {
        var existingElement = existingElements[id];
        if (existingElement && !id.match(this._reReservedPrefix) && !args.replace) {
          existingElements[id] = regex.alt(existingElements[id], elements[id]);
        } else {
          existingElements[id] = elements[id];
        }
      }
      return this;
    }

  })
});