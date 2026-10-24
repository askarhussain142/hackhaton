const setupSection = document.getElementById("setup-section");
const loginSection = document.getElementById("login-section");

const setupForm = document.getElementById("setup-form");
const loginForm = document.getElementById("login-form");

function showCorrectSection() {
    const users = getData("hcm_users");

    if (users.length === 0) {
        setupSection.classList.remove("hidden");
        loginSection.classList.add("hidden");
    } else {
        setupSection.classList.add("hidden");
        loginSection.classList.remove("hidden");
    }
}

setupForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const companyName = document.getElementById("company").value.trim();
    const name = document.getElementById("admin-name").value.trim();
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;

    if (!companyName || !name || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    const admin = {
        id: Date.now(),
        name: name,
        email: email,
        password: password,
        role: "admin",
        department: "Administration",
        salary: 0
    };

    saveData("hcm_company", {
        name: companyName,
        officeStart: "09:00",
        graceMinutes: 15,
        leaveQuota: 20
    });

    saveData("hcm_users", [admin]);
    saveData("hcm_attendance", []);
    saveData("hcm_leaves", []);

    alert("Admin account created successfully!");

    showCorrectSection();
});

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    const users = getData("hcm_users");

    const user = users.find(function (item) {
        return item.email.toLowerCase() === email.toLowerCase()
            && item.password === password;
    });

    if (!user) {
        document.getElementById("login-error").textContent =
            "Incorrect email or password.";
        return;
    }

    saveSession({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    });

    if (user.role === "admin") {
        window.location.href = "admin.html";
    } else {
        window.location.href = "employee.html";
    }
});

showCorrectSection();