// First, remember: functions are values in JavaScript
// You already know this from arrow functions — you can store a function in a variable, pass it around, and call it later:
// javascript
const greet = () => console.log('hi');
greet(); // calling it


// The key idea: a function can return another function
// Just like a function can return a number or a string, it can return another function:
// javascript
function makeGreeter(name) {
  return function () {
    console.log(`Hello, ${name}!`);
  };
}
// makeGreeter doesn't print anything itself 
// — it builds and hands back a new function that "remembers" whatever name was passed in. 
// To actually get the greeting, you call it twice, once to build the specific greeter, once to run it:
// javascript
const greetPilch = makeGreeter('Pilch');  // this runs makeGreeter, returns a new function
greetPilch();                              // this runs the returned function → "Hello, Pilch!"

const greetSomeoneElse = makeGreeter('Sam');
greetSomeoneElse(); // "Hello, Sam!"
// Notice greetPilch and greetSomeoneElse are two separate functions, each "remembering" a different name
//  — that's the part worth sitting with for a second. 
// This is called a closure: the inner function keeps access to variables from the outer function's scope, 
// even after the outer function has already finished running.





// Now apply this exact shape to your logger
// javascript
export function requestLogger(serviceName) {
  return function (req, res, next) {
    console.log(`LOG[${serviceName}] - ${req.method} ${req.url}`);
    next();
  };
}
// requestLogger('add-service') — calling the outer function, passing in 'add-service'. 
// This returns the actual middleware function, which has now "locked in" serviceName = 'add-service' via closure.
// That returned function is what Express actually calls on every request
//  — it has the same (req, res, next) shape as every middleware you've written before, 
//  it's just that this particular one was custom-built with a specific service name baked in.
// Why not just pass serviceName as a normal extra argument to the middleware?
// Because Express calls your middleware itself, automatically, 
// with exactly three arguments: (req, res, next) — always. 
// You have no way to sneak a fourth argument like serviceName into that call directly. 
// The "function that returns a function" pattern is the standard workaround: you configure the middleware before handing it to Express, 
// and Express only ever sees and calls the final, already-configured inner function.
// Tying it back to how you'd actually use it:
// javascript
import { requestLogger } from '../shared/logger.js';

app.use(requestLogger('add-service'));
// Reading this left to right: requestLogger('add-service') runs immediately when this line executes, 
// producing a ready-to-use middleware function specific to the add-service. app.use(...) 
// then registers that returned function as middleware
//  — Express never even sees or cares about 'add-service' directly, it just calls whatever function came back.