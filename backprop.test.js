const {convertExpression} = require('./index');

test('should backpropagate over simple addition', () => {
  var tree = convertExpression('x + y');
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].derivative.toString()).toBe('1');
  expect(tree.parents[1].derivative.toString()).toBe('1');
  expect(tree.parents[0].childCount).toBe(1);
  expect(tree.parents[1].childCount).toBe(1);
});

test('should support constant expressions', () => {
  var tree = convertExpression('x + 5');
  tree.backPropagate(1);
  expect(tree.parents[0].derivative.toString()).toBe('1');
});

test('should backpropagate over parenthesized addition', () => {
  var tree = convertExpression('(x + y)');
  console.log(JSON.stringify(tree));
  tree.backPropagate(1);
  expect(tree.parents[0].derivative.toString()).toBe('1');
  expect(tree.parents[1].derivative.toString()).toBe('1');
});

test('should backpropagate over simple subtraction', () => {
  var tree = convertExpression('x - y');
  tree.backPropagate(1);
  expect(tree.parents[0].derivative.toString()).toBe('1');
  expect(tree.parents[1].derivative.toString()).toBe('-1');
});

test('should backpropagate over simple multiplication', () => {
  var tree = convertExpression('x * y');
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].derivative.toString()).toBe('y');
  expect(tree.parents[1].derivative.toString()).toBe('x');
  expect(tree.parents[0].childCount).toBe(1);
  expect(tree.parents[1].childCount).toBe(1);
});

test('should backpropagate over simple division', () => {
  var tree = convertExpression('x / y');
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].derivative.toString()).toBe('1 / y');
  expect(tree.parents[1].derivative.toString()).toBe('-(x / y ^ 2)');
});

test('should backpropagate over sigmoids', () => {
  var tree = convertExpression('sigma(x)');
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].derivative.toString()).toBe('sigma(x) * (1 - sigma(x))');
  // This doesn't work because of https://github.com/josdejong/mathjs/issues/916 .
  // expect(tree.parents[0].derivative.eval({x: 5})).toBeCloseTo(0.00664); // Value computed with wolfram alpha.
  expect(tree.parents[0].childCount).toBe(1);
});

test('should backpropagate over complicated addition', () => {
  var tree = convertExpression('x * y + y * z');
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].parents[1].derivative.toString()).toBe('x + z'); // Hacky way to get to the 'y' node.
  expect(tree.parents[0].parents[1].derivative.eval({x: 5, y: 7, z: 13})).toBe(5 + 13); // Hacky way to get to the 'y' node.
  expect(tree.parents[0].parents[1].childCount).toBe(2);
});

test('should backpropagate over complicated multiplication', () => {
  var tree = convertExpression('(x + y) * (y + z)');
  tree.backPropagate(1);
  expect(tree.parents[0].parents[1].derivative.toString()).toBe('2 * y + z + x'); // Hacky way to get to the 'y' node.
});

test('complicated expression', () => {
  var tree = convertExpression('(x + sigma(y)) / (sigma(x) + (x + y) * (x + y))');
  console.log(tree.parents[0].parents[0].derivative.toString());
  console.log(tree.parents[0].parents[0].derivative.toString());
});
