console.log('A');

function sayB() {
  console.log('B');
}

const wrapped = () => {
  console.log('C');
  sayB();
};

console.log('D');

wrapped();

// Have a guess at the order of A/B/C/D before running it — that'll tell us if this specific distinction (writing a call inside a wrapper vs calling it directly) has really landed.


// # reply
// I like this question, thanks
// A, D, C, B

// reasoning
// A has no arrow brackets so will get called at start up
// D same as A
// then wrapped() is called and C is next as  reading code top to bottom within the function, then sayB() is called

// # response
// That's exactly right — A, D, C, B — and your reasoning is spot on too. Let's just underline the key insight buried in there, because you actually nailed it precisely:

// **You correctly noticed that `wrapped`'s *definition* (where the `() => { ... }` is written) doesn't run when JavaScript reaches that line — only `wrapped()`, the actual call at the bottom, triggers it.**

// That's why `D` prints *before* `C` — even though the arrow function is *defined* earlier in the file (textually above `console.log('D')`), defining it doesn't execute anything inside it. JavaScript just goes: "okay, `wrapped` is now a function sitting in memory, ready to be called eventually" — and moves on to the next line, `console.log('D')`, without looking inside `wrapped` at all yet.

// Only when execution actually reaches `wrapped();` at the very bottom does JavaScript finally "open the envelope" and run what's inside — `console.log('C')` first, then `sayB()` (which itself just prints `B`), in the order they appear *inside* the function body.

