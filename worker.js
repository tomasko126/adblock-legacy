postMessage('Hello from worker!');
onmessage = function(event) {
  console.log("event rec'd in worker", event);
  if (event && event.data && event.data.command && event.data.command === "call") {
    console.log("self", self, self.document);
  }
}