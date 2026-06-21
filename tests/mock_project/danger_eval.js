// Unsafe eval execution
function parseInput(data) {
  return eval("(" + data + ")");
}
const creator = new Function('a', 'b', 'return a + b');
