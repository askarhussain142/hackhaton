// Employee login check
const session = getSession();

if (!session || session.role !== "employee") {
    window.location.href = "index.html";
}

// Get employee data
let users = getData("hcm_users") || [];

const employee = users.find(function (user) {
    return user.email === session.email &&
           user.role === "employee";
});

if (!employee) {
    logoutUser();
    window.location.href = "index.html";
}

// Get saved leave requests
let leaves = getData("hcm_leaves") || [];
let company = getData("hcm_company") || {};

// Form elements
const leaveForm = document.getElementById("leaveForm");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const reasonInput = document.getElementById("reason");
const daysPreview = document.getElementById("daysPreview");
const formMessage = document.getElementById("formMessage");

// Today's date in YYYY-MM-DD format
function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Set minimum selectable date
startDateInput.min = getToday();
endDateInput.min = getToday();

// Count working days, excluding Saturday and Sunday
function countWorkingDays(startDate, endDate) {
    if (!startDate || !endDate || startDate > endDate) {
        return 0;
    }

    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");

    let count = 0;

    while (start <= end) {
        const day = start.getDay();

        if (day !== 0 && day !== 6) {
            count++;
        }

        start.setDate(start.getDate() + 1);
    }

    return count;
}

// Display message
function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = "message " + type;
}

// Calculate working days when dates change
function updateDaysPreview() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (startDate && endDate && startDate > endDate) {
        daysPreview.textContent =
            "End date must be on or after the start date.";
        return;
    }

    const days = countWorkingDays(startDate, endDate);

    daysPreview.textContent = "Working days: " + days;
}

// Check for overlapping leave requests
function hasOverlap(startDate, endDate) {
    return leaves.some(function (leave) {
        if (leave.employeeEmail !== employee.email) {
            return false;
        }

        if (leave.status === "Rejected") {
            return false;
        }

        return (
            startDate <= leave.endDate &&
            endDate >= leave.startDate
        );
    });
}

// Calculate approved leave days for a year
function getApprovedLeaveDays(year) {
    let total = 0;

    leaves.forEach(function (leave) {
        if (
            leave.employeeEmail !== employee.email ||
            leave.status !== "Approved"
        ) {
            return;
        }

        const start = new Date(leave.startDate + "T12:00:00");
        const end = new Date(leave.endDate + "T12:00:00");

        while (start <= end) {
            if (
                start.getFullYear() === year &&
                start.getDay() !== 0 &&
                start.getDay() !== 6
            ) {
                total++;
            }

            start.setDate(start.getDate() + 1);
        }
    });

    return total;
}

// Display employee's leave requests
function renderMyLeaves() {
    leaves = getData("hcm_leaves") || [];

    const table = document.getElementById("myLeavesTable");

    const myLeaves = leaves.filter(function (leave) {
        return leave.employeeEmail === employee.email;
    });

    if (myLeaves.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5">You have not submitted any leave requests.</td>
            </tr>
        `;
        return;
    }

    myLeaves.sort(function (a, b) {
        return b.startDate.localeCompare(a.startDate);
    });

    table.innerHTML = myLeaves.map(function (leave) {
        return `
            <tr>
                <td>${escapeHTML(leave.startDate)}</td>
                <td>${escapeHTML(leave.endDate)}</td>
                <td>${Number(leave.days)}</td>
                <td>${escapeHTML(leave.reason)}</td>
                <td>${escapeHTML(leave.status)}</td>
            </tr>
        `;
    }).join("");
}

// Submit leave request
leaveForm.addEventListener("submit", function (event) {
    event.preventDefault();

    // Refresh data before validation
    leaves = getData("hcm_leaves") || [];
    company = getData("hcm_company") || {};

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const reason = reasonInput.value.trim();

    if (!startDate || !endDate || !reason) {
        showMessage("Please fill in all fields.", "error");
        return;
    }

    if (startDate < getToday()) {
        showMessage("Past dates select nahi kar sakte.", "error");
        return;
    }

    if (endDate < startDate) {
        showMessage("End date, start date se pehle nahi ho sakti.", "error");
        return;
    }

    const days = countWorkingDays(startDate, endDate);

    if (days === 0) {
        showMessage(
            "Selected dates mein koi working day nahi hai.",
            "error"
        );
        return;
    }

    if (hasOverlap(startDate, endDate)) {
        showMessage(
            "In dates ke liye aapki pehle se leave request maujood hai.",
            "error"
        );
        return;
    }

    const startYear = Number(startDate.slice(0, 4));
    const endYear = Number(endDate.slice(0, 4));

    if (startYear !== endYear) {
        showMessage(
            "Leave request ek calendar year ke andar honi chahiye.",
            "error"
        );
        return;
    }

    const quota = Number(company.leaveQuota ?? 20);
    const usedDays = getApprovedLeaveDays(startYear);

    if (usedDays + days > quota) {
        showMessage(
            "Aapki request annual leave quota se zyada hai.",
            "error"
        );
        return;
    }

    // Create request
    const leaveRequest = {
        id: Date.now().toString(),
        employeeEmail: employee.email,
        employeeName: employee.name,
        startDate: startDate,
        endDate: endDate,
        days: days,
        reason: reason,
        status: "Pending",
        createdAt: new Date().toISOString()
    };

    leaves.push(leaveRequest);

    saveData("hcm_leaves", leaves);

    showMessage(
        "Leave request submit ho gayi! Admin ki approval ka intezar karein.",
        "success"
    );

    leaveForm.reset();

    startDateInput.min = getToday();
    endDateInput.min = getToday();

    daysPreview.textContent = "Working days: 0";

    renderMyLeaves();
});

// Keep end date from being earlier than start date
startDateInput.addEventListener("change", function () {
    endDateInput.min = startDateInput.value || getToday();
    updateDaysPreview();
});

endDateInput.addEventListener("change", updateDaysPreview);

// Logout
document.getElementById("logoutBtn").addEventListener("click", function () {
    logoutUser();
    window.location.href = "index.html";
});

// Initial display
renderMyLeaves();