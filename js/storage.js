function getData(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getSession() {
    return JSON.parse(localStorage.getItem("hcm_session"));
}

function saveSession(user) {
    localStorage.setItem("hcm_session", JSON.stringify(user));
}

function logoutUser() {
    localStorage.removeItem("hcm_session");
    window.location.href = "index.html";
}
function getData(key) {
    const data = localStorage.getItem(key);

    return data ? JSON.parse(data) : null;
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getSession() {
    return getData("hcm_session");
}

function saveSession(user) {
    saveData("hcm_session", user);
}

function logoutUser() {
    localStorage.removeItem("hcm_session");
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return characters[character];
    });
}