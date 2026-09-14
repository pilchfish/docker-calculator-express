function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function demo() {
  console.log("A");
  await wait(1000); // pause here for 1 second
  console.log("B"); // this only runs after the pause
}

console.log("start");
demo();
demo();
console.log("end");



// output
// start
// A
// end. <- this runs while async demo() is waithing a second to print B
// B