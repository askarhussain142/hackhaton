// Admin login check
const session = getSession();

if (!session || session.role !== "admin") {
    window.location.href = "index.html";
}

// Get company settings
let company = getData("hcm_company") || {};

// Form elements
const settingsForm = document.getElementById("settingsForm");
const companyNameInput = document.getElementById("companyName");
const officeStartInput = document.getElementById("officeStart");
const graceMinutesInput = document.getElementById("graceMinutes");
const leaveQuotaInput = document.getElementById("leaveQuota");
const settingsMessage = document.getElementById("settingsMessage");

// Default working days: Monday to Friday
const defaultWorkingDays = [1, 2, 3, 4, 5];

// Load settings into form
function loadSettings() {
    company = getData("hcm_company") || {};

    companyNameInput.value = company.name || "";
    officeStartInput.value = company.officeStart || "09:00";
    graceMinutesInput.value = company.graceMinutes ?? 15;
    leaveQuotaInput.value = company.leaveQuota ?? 20;

    const savedDays = Array.isArray(company.workingDays)
        ? company.workingDays.map(Number)
        : defaultWorkingDays;

    document.querySelectorAll('input[name="workingDays"]').forEach(function (checkbox) {
        checkbox.checked = savedDays.includes(Number(checkbox.value));
    });
}

// Display message
function showMessage(message, type) {
    settingsMessage.textContent = message;
    settingsMessage.className = "message " + type;
}

// Save settings
settingsForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = companyNameInput.value.trim();
    const officeStart = officeStartInput.value;
    const graceMinutes = Number(graceMinutesInput.value);
    const leaveQuota = Number(leaveQuotaInput.value);

    const workingDays = Array.from(
        document.querySelectorAll('input[name="workingDays"]:checked')
    ).map(function (checkbox) {
        return Number(checkbox.value);
    });

    if (!name) {
        showMessage("Company name enter karein.", "error");
        return;
    }

    if (!officeStart) {
        showMessage("Office start time select karein.", "error");
        return;
    }

    if (
        !Number.isInteger(graceMinutes) ||
        graceMinutes < 0 ||
        graceMinutes > 180
    ) {
        showMessage("Grace minutes 0 se 180 ke darmiyan hone chahiye.", "error");
        return;
    }

    if (
        !Number.isInteger(leaveQuota) ||
        leaveQuota < 0 ||
        leaveQuota > 365
    ) {
        showMessage("Annual leave quota 0 se 365 ke darmiyan hona chahiye.", "error");
        return;
    }

    if (workingDays.length === 0) {
        showMessage("Kam az kam ek working day select karein.", "error");
        return;
    }

    // Preserve existing company properties
    company = {
        ...company,
        name: name,
        officeStart: officeStart,
        graceMinutes: graceMinutes,
        leaveQuota: leaveQuota,
        workingDays: workingDays
    };

    saveData("hcm_company", company);

    showMessage("Company settings successfully save ho gayi hain!", "success");
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", function () {
    logoutUser();
    window.location.href = "index.html";
});

// Initial load
loadSettings();