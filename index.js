math = require('mathjs');

class ExpressionContext {
  constructor(symbolValues) {
    this.symbolValues = symbolValues;
  }

  getSymbolValue(symbolName) {
    return this.symbolValues.get(symbolName);
  }
}

class Node {
  constructor(context) {
    this.context = context;
    this.derivative = 0;
  }

  // TODO(ivan): Cache the values.
  // TODO(ivan): Caching will not work properly with different contexts. Consider
  // encapsulating the nodes in a Tree object or something external that implements the
  // caching.
  getValue() {
    throw new Exception("This is an abstract class.");
  }

  // TODO(ivan): Accumulate all derivatives for this node before starting to
  // backpropagate to the input nodes.
  backPropagate(derivative) {
    throw new Exception("This is an abstract class.");
  }

  getAncestors() {}
  toString() {}
}

class ConstantNode extends Node {
  constructor(context, value) {
    super(context);
    this.value = value;
  }

  getValue() {
    return this.value;
  }

  backPropagate(derivative) {
    this.derivative += derivative;
  }

  getAncestors() { return []; }

  toString() { return this.value; }
}

class SymbolicNode extends Node {
  constructor(context, name) {
    super(context);
    this.name = name;
  }

  getValue() {
    return this.context.getSymbolValue(this.name);
  }

  backPropagate(derivative) {
    this.derivative += derivative;
  }

  getAncestors() { return []; }

  toString() { return this.name; }
}

class BinaryOpNode extends Node {
  constructor(context, leftNode, rightNode) {
    super(context);
    this.leftNode = leftNode;
    this.rightNode = rightNode;
  }

  getAncestors() { return [this.leftNode, this.rightNode]; }
}

class PlusNode extends BinaryOpNode {
  constructor(context, leftNode, rightNode) {
    super(context, leftNode, rightNode);
  }

  getValue() {
    return this.leftNode.getValue() + this.rightNode.getValue();
  }

  backPropagate(derivative) {
    this.derivative += derivative;
    this.leftNode.backPropagate(derivative);
    this.rightNode.backPropagate(derivative);
  }

  toString() { return '+'; }

  getAncestors() {
    return [
      [this.leftNode, 1],
      [this.rightNode, 1]
    ];
  }
}

class MultiplyNode extends BinaryOpNode {
  constructor(context, leftNode, rightNode) {
    super(context, leftNode, rightNode);
  }

  getValue() {
    return this.leftNode.getValue() * this.rightNode.getValue();
  }

  backPropagate(derivative) {
    this.derivative += derivative;
    this.leftNode.backPropagate(this.rightNode.getValue() * derivative);
    this.rightNode.backPropagate(this.leftNode.getValue() * derivative);
  }

  toString() { return '*'; }

  getAncestors() {
    return [
      [this.leftNode, this.rightNode.getValue()],
      [this.rightNode, this.leftNode.getValue()]
    ];
  }
}

class ExpNode extends Node {
  constructor(context, previousNode) {
    super(context);
    this.previousNode = previousNode;
  }

  getValue() {
    return Math.exp(this.previousNode.getValue());
  }

  backPropagate(derivative) {
    this.derivative += derivative;
    this.previousNode.backPropagate(Math.exp(this.previousNode.getValue()) * derivative);
  }

  getAncestors() { return [[this.previousNode, Math.exp(this.previousNode.getValue())]]; }

  toString() { return 'exp'; }
}

var sigma = (x) => 1 / (1 + Math.exp(-x));

class SigmaNode extends Node {
  constructor(context, previousNode) {
    super(context);
    this.previousNode = previousNode;
  }

  getValue() {
    return sigma(this.previousNode.getValue());
  }

  backPropagate(derivative) {
    this.derivative += derivative;
    let sigmaX = sigma(this.previousNode.getValue());
    this.previousNode.backPropagate(sigmaX * (1 - sigmaX) * derivative);
  }

  getAncestors() {
    let sigmaX = sigma(this.previousNode.getValue());
    return [[this.previousNode, sigmaX * (1 - sigmaX)]];
  }

  toString() { return 'sigma'; }
}

// var in1 = new ConstantNode(3);
// var in2 = new ConstantNode(4);
// var in3 = new ConstantNode(17);
// 
// var node = new ExpNode(
//   new MultiplyNode(
//     new PlusNode(in1, in2),
//     in3
//   )
// );
// 
// var tempNode = new MultiplyNode(in1, in2);
// node = new ExpNode(tempNode);
// 
// var temp0 = new MultiplyNode(in1, in2);
// var temp1 = new ExpNode(temp0);
// var temp2 = new ExpNode(temp0);
// node = new PlusNode(temp1, temp2);
// 
// console.log(node.getValue());
// node.backPropagate(1);
// 
// console.log(in1.derivative);
// console.log(in2.derivative);
// console.log(in3.derivative);

var convertTree = function (mathTree, context) {
  const symbolMap = new Map();
  const convertNode = function (mathNode) {
    if (!mathNode.hasOwnProperty('args')) {
      if (mathNode.hasOwnProperty('value')) {
        return new ConstantNode(context, mathNode.value);
      } else {
        if (!symbolMap.has(mathNode.name)) {
          symbolMap.set(mathNode.name, new SymbolicNode(context, mathNode.name));
        }
        return symbolMap.get(mathNode.name);
      }
    }
    if (mathNode.op == '+') {
      return new PlusNode(context, convertNode(mathNode.args[0]), convertNode(mathNode.args[1]));
    }
    if (mathNode.op == '*') {
      return new MultiplyNode(context, convertNode(mathNode.args[0]), convertNode(mathNode.args[1]));
    }

    if (mathNode.hasOwnProperty('fn')) {
      if (mathNode.fn.name == 'exp') {
        return new ExpNode(context, convertNode(mathNode.args[0]));
      }
      if (mathNode.fn.name == 'sigma') {
        return new SigmaNode(context, convertNode(mathNode.args[0]));
      }
    }
  };
  return convertNode(mathTree);
};

// var tree = convertTree(math.parse('1 + 2 * exp(sigma(x))'));
// tree.backPropagate(new ExpressionContext(new Map([['x', 3]])), 1);
// console.log(JSON.stringify(tree));

exports.convertExpression = (exp, context) => convertTree(math.parse(exp), context);
exports.ExpressionContext = ExpressionContext;
