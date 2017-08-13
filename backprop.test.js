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

test('should backpropagate over sigmoids', () => {
  var tree = convertExpression('sigma(x)');
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].derivative.toString()).toBe('sigma(x) * (1 - sigma(x))');
  // This doesn't work because of https://github.com/josdejong/mathjs/issues/916 .
  // expect(tree.parents[0].derivative.eval({x: 5})).toBeCloseTo(0.00664); // Value computed with wolfram alpha.
  expect(tree.parents[0].childCount).toBe(1);
});

test('should backpropagate over nested operations', () => {
  var tree = convertExpression('x * y + y * z');
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].parents[1].derivative.toString()).toBe('x + z'); // Hacky way to get to the 'y' node.
  expect(tree.parents[0].parents[1].derivative.eval({x: 5, y: 7, z: 13})).toBe(5 + 13); // Hacky way to get to the 'y' node.
  expect(tree.parents[0].parents[1].childCount).toBe(2);
});
