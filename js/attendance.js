// Employee session check
const session = getSession();

if (!session || session.role !== "employee") {
    window.location.href = "index.html";
}

// Get saved data
let users = getData("hcm_users") || [];
let attendance = getData("hcm_attendance") || [];
let leaves = getData("hcm_leaves") || [];
let company = getData("hcm_company") || {};

// Find logged-in employee
const employee = users.find(function (user) {
    return user.email === session.email &&
           user.role === "employee";
});

if (!employee) {
    logoutUser();
    window.location.href = "index.html";
}

// Today's date
function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Current time
function getCurrentTime() {
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

// Convert time to minutes
function timeToMinutes(time) {
    const parts = time.split(":");

    return Number(parts[0]) * 60 + Number(parts[1]);
}

// Get today's attendance record
function getTodayRecord() {
    return attendance.find(function (record) {
        return record.employeeEmail === employee.email &&
               record.date === getToday();
    });
}

// Calculate worked hours
function calculateHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) {
        return 0;
    }

    const start = timeToMinutes(checkIn);
    const end = timeToMinutes(checkOut);

    // Same-day attendance
    const totalMinutes = Math.max(0, end - start);

    return Number((totalMinutes / 60).toFixed(2));
}

// Display employee information
function displayEmployee() {
    document.getElementById("welcomeText").textContent =
        "Welcome, " + employee.name;

    document.getElementById("employeeBadge").textContent =
        employee.name;

    document.getElementById("todayDate").textContent =
        "Date: " + getToday();
}

// Check In
document.getElementById("checkInBtn").addEventListener("click", function () {

    attendance = getData("hcm_attendance") || [];

    const existingRecord = getTodayRecord();

    if (existingRecord) {
        showMessage("Aaj aapki attendance already mark ho chuki hai.", "error");
        return;
    }

    const checkIn = getCurrentTime();

    const officeStart = company.officeStart || "09:00";
    const graceMinutes = Number(company.graceMinutes || 0);

    const allowedTime =
        timeToMinutes(officeStart) + graceMinutes;

    const isLate =
        timeToMinutes(checkIn) > allowedTime;

    const record = {
        employeeEmail: employee.email,
        employeeName: employee.name,
        date: getToday(),
        checkIn: checkIn,
        checkOut: "",
        hours: 0,
        status: isLate ? "Late" : "Present"
    };

    attendance.push(record);

    saveData("hcm_attendance", attendance);

    showMessage(
        isLate
            ? "Check In successful! Aap late mark hue hain."
            : "Check In successful!",
        "success"
    );

    renderDashboard();
});

// Check Out
document.getElementById("checkOutBtn").addEventListener("click", function () {

    attendance = getData("hcm_attendance") || [];

    const record = getTodayRecord();

    if (!record) {
        showMessage("Pehle Check In karein.", "error");
        return;
    }

    if (record.checkOut) {
        showMessage("Aap pehle hi Check Out kar chuke hain.", "error");
        return;
    }

    const checkOut = getCurrentTime();

    if (timeToMinutes(checkOut) <= timeToMinutes(record.checkIn)) {
        showMessage("Check Out ka time, Check In ke baad hona chahiye.", "error");
        return;
    }

    record.checkOut = checkOut;
    record.hours = calculateHours(record.checkIn, record.checkOut);

    // PDF rule: under 5 hours = half day
    if (record.hours < 5) {
        record.status = "Half Day";
    }

    saveData("hcm_attendance", attendance);

    showMessage("Check Out successful!", "success");

    renderDashboard();
});

// Show messages
function showMessage(message, type) {
    const messageBox = document.getElementById("attendanceMessage");

    messageBox.textContent = message;
    messageBox.className = "message " + type;
}

// Render today's attendance
function renderTodayAttendance() {
    const record = getTodayRecord();

    const checkInText = document.getElementById("checkInTime");
    const checkOutText = document.getElementById("checkOutTime");
    const statusText = document.getElementById("todayStatus");

    const checkInBtn = document.getElementById("checkInBtn");
    const checkOutBtn = document.getElementById("checkOutBtn");

    if (!record) {
        checkInText.textContent = "Not checked in";
        checkOutText.textContent = "Not checked out";
        statusText.textContent = "Not Marked";

        checkInBtn.disabled = false;
        checkOutBtn.disabled = true;

        return;
    }

    checkInText.textContent = record.checkIn;
    checkOutText.textContent = record.checkOut || "Not checked out";
    statusText.textContent = record.status;

    checkInBtn.disabled = true;
    checkOutBtn.disabled = Boolean(record.checkOut);
}

// Render attendance history
function renderAttendanceHistory() {
    const table = document.getElementById("attendanceTable");

    const employeeRecords = attendance
        .filter(function (record) {
            return record.employeeEmail === employee.email;
        })
        .sort(function (a, b) {
            return b.date.localeCompare(a.date);
        });

    if (employeeRecords.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5">Abhi attendance record nahi hai.</td>
            </tr>
        `;
        return;
    }

    table.innerHTML = employeeRecords.map(function (record) {

        return `
            <tr>
                <td>${escapeHTML(record.date)}</td>
                <td>${escapeHTML(record.checkIn || "-")}</td>
                <td>${escapeHTML(record.checkOut || "-")}</td>
                <td>${Number(record.hours || 0)}</td>
                <td>${escapeHTML(record.status || "-")}</td>
            </tr>
        `;

    }).join("");
}

// Render employee statistics
function renderStatistics() {
    const employeeRecords = attendance.filter(function (record) {
        return record.employeeEmail === employee.email;
    });

    document.getElementById("presentCount").textContent =
        employeeRecords.filter(function (record) {
            return record.status === "Present";
        }).length;

    document.getElementById("lateCount").textContent =
        employeeRecords.filter(function (record) {
            return record.status === "Late";
        }).length;

    document.getElementById("halfDayCount").textContent =
        employeeRecords.filter(function (record) {
            return record.status === "Half Day";
        }).length;

    const myLeaveRequests = leaves.filter(function (leave) {
        return leave.employeeEmail === employee.email;
    });

    document.getElementById("leaveCount").textContent =
        myLeaveRequests.length;
}

// Render all dashboard sections
function renderDashboard() {
    users = getData("hcm_users") || [];
    attendance = getData("hcm_attendance") || [];
    leaves = getData("hcm_leaves") || [];
    company = getData("hcm_company") || {};

    displayEmployee();
    renderTodayAttendance();
    renderAttendanceHistory();
    renderStatistics();
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", function () {
    logoutUser();
    window.location.href = "index.html";
});

// Initial display
renderDashboard();