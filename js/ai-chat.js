```javascript
const chatForm = document.getElementById("chatForm");
const userMessage = document.getElementById("userMessage");
const chatMessages = document.getElementById("chatMessages");
const newChat = document.getElementById("newChat");
const sendButton = document.getElementById("sendButton");

const conversation = [];

function addChatMessage(text, role) {
    const message = document.createElement("div");

    message.className = "ai-message " + role;
    message.textContent = text;

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}

chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const question = userMessage.value.trim();

    if (!question || sendButton.disabled) {
        return;
    }

    addChatMessage(question, "user");
    conversation.push({
        role: "user",
        content: question
    });

    userMessage.value = "";
    sendButton.disabled = true;
    sendButton.textContent = "...";

    const loadingMessage = addChatMessage("AI is thinking...", "bot");

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: conversation
            })
        });

        const data = await response.json();

        loadingMessage.remove();

        if (!response.ok) {
            throw new Error(data.error || "Unable to get an AI response.");
        }

        addChatMessage(data.reply, "bot");

        conversation.push({
            role: "assistant",
            content: data.reply
        });

    } catch (error) {
        loadingMessage.textContent =
            "AI se connection nahi ho saka. " + error.message;
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = "Send";
        userMessage.focus();
    }
});

newChat.addEventListener("click", function () {
    conversation.length = 0;

    chatMessages.innerHTML = ""
    addChatMessage
        "Assalam-o-Alaikum!  I am your   AI Assistant hoon. Aap mujhse koi bhi sawaal pooch sakte hain.",
        "bot"
    );

    userMessage.value = "";
    userMessage.focus();
});
