let canSendMessage = true;
var timeoutResetInterval = setInterval(() => { canSendMessage = true }, 5 * 1000);

document.onmousemove = function(e) {
    if (canSendMessage) {
        // console.log("Mouse Moved")

        // This sends a message to the plugin that the mouse moved.
        chrome.runtime.sendMessage({}, function(response) {})

        canSendMessage = false; // Wait for timer to reset value.
        clearInterval(timeoutResetInterval)
        timeoutResetInterval = setInterval(() => { canSendMessage = true }, 5 * 1000);
    }
}