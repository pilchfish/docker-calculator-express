// Step 1: The old way
function add(a, b) {
  return a + b;
}

let result = add(2, 3); // 5

console.log("{result :", result, "}");

// Step 2: Storing anonymous functions in variables
const addVar = function add(a, b) {
  return a + b;
};

result = addVar(12, 13); // 5

console.log("{result :", result, "}");


// Step 3
// Arrow functions are just a shorter way to write the exact same thing:
// The transformation from Step 2 to Step 3 is: 
// drop the word function, and put => between the parentheses and the curly brace. 
// That's genuinely the whole trick.

// function add(a, b){} = (a, b) => {}
const add1 = (a, b) => {
  return a + b;
};


// Step 4: Shrink it further — implicit return
// If your function body is just one line that returns something, 
// you can drop the curly braces and the return keyword entirely:
// This means "take a and b, and the result of a + b is automatically what gets returned.
// " No { }, no return — it's implied. 
// This only works when the function is a single expression with nothing else going on.
const add2 = (a, b) => a + b;


// 1 param no parentheses, no params empty parentheses
const sayHi = () => console.log("hi");
sayHi();



// this is the clincher
// This inline version:
app.get('/add', (req, res) => {
  res.json({ result: 5 });
});

// ...is doing the same thing as writing it in two steps:
const myAddHandler = (req, res) => {
  res.json({ result: 5 });
};
app.get('/add', myAddHandler);






// The pattern is: const <name of the function> = <parameter> => <expression>
// Issue 2: Missing the =
// Between the variable name and the parameter, you need an = sign — that's what actually stores the function into that variable. Without it, JavaScript can't parse the line at all.
// Putting it together for square:
// javascript
// const square = n => n * n;
// Walking through it left to right: const square (I'm creating a variable called square) = (and storing this in it:) n (a function taking one parameter, n) => (arrow, here's the body:) n * n (return n times n).