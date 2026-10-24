const session = getSession();

if (!session || session.role !== "admin") {
    window.location.href = "index.html";
} else {
    loadDashboard();
}

document.getElementById("logout-button").addEventListener("click", logoutUser);

function loadDashboard() {
    const users = getData("hcm_users");
    const attendance = getData("hcm_attendance");
    const leaves = getData("hcm_leaves");
    const company = JSON.parse(localStorage.getItem("hcm_company")) || {};

    const employees = users.filter(function (user) {
        return user.role === "employee";
    });

    document.getElementById("welcome").textContent =
        "Welcome, " + session.name;

    document.getElementById("company-name").textContent =
        company.name || "Your Company";

    const today = new Date();
    const todayString =
        today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

    const todayAttendance = attendance.filter(function (record) {
        return record.date === todayString;
    });

    const approvedLeaves = leaves.filter(function (leave) {
        return leave.status === "Approved"
            && leave.from <= todayString
            && leave.to >= todayString;
    });

    const onLeaveIds = approvedLeaves.map(function (leave) {
        return String(leave.employeeId);
    });

    const onLeaveUnique = [...new Set(onLeaveIds)];

    let present = 0;
    let late = 0;
    let absent = 0;

    todayAttendance.forEach(function (record) {
        if (record.status === "Present") {
            present++;
        }

        if (record.status === "Late") {
            late++;
        }
    });

    const recordedIds = todayAttendance.map(function (record) {
        return String(record.employeeId);
    });

    employees.forEach(function (employee) {
        const id = String(employee.id);

        if (onLeaveIds.includes(id)) {
            return;
        }

        if (!recordedIds.includes(id)) {
            absent++;
        }
    });

    document.getElementById("present-count").textContent = present;
    document.getElementById("absent-count").textContent = absent;
    document.getElementById("leave-count").textContent = onLeaveUnique.length;
    document.getElementById("late-count").textContent = late;

    showAttendance(todayAttendance, users);
    showLeaves(leaves, users);
}

function showAttendance(records, users) {
    const table = document.getElementById("attendance-table");
    table.innerHTML = "";

    if (records.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="4">No attendance records for today.</td>
            </tr>
        `;
        return;
    }

    records.forEach(function (record) {
        const employee = users.find(function (user) {
            return String(user.id) === String(record.employeeId);
        });

        const name = employee ? employee.name : "Unknown Employee";

        let statusClass = "status-present";

        if (record.status === "Absent") {
            statusClass = "status-absent";
        } else if (record.status === "Late") {
            statusClass = "status-late";
        } else if (record.status === "On Leave") {
            statusClass = "status-leave";
        }

        table.innerHTML += `
            <tr>
                <td>${escapeHTML(name)}</td>
                <td>${escapeHTML(record.checkIn || "-")}</td>
                <td>${escapeHTML(record.checkOut || "-")}</td>
                <td>
                    <span class="status ${statusClass}">
                        ${escapeHTML(record.status || "Present")}
                    </span>
                </td>
            </tr>
        `;
    });
}

function showLeaves(leaves, users) {
    const table = document.getElementById("leave-table");
    table.innerHTML = "";

    const pending = leaves.filter(function (leave) {
        return leave.status === "Pending";
    });

    if (pending.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5">No pending leave requests.</td>
            </tr>
        `;
        return;
    }

    pending.forEach(function (leave) {
        const employee = users.find(function (user) {
            return String(user.id) === String(leave.employeeId);
        });

        table.innerHTML += `
            <tr>
                <td>${escapeHTML(employee ? employee.name : "Unknown")}</td>
                <td>${escapeHTML(leave.type || "-")}</td>
                <td>${escapeHTML(leave.from || "-")}</td>
                <td>${escapeHTML(leave.to || "-")}</td>
                <td>${escapeHTML(leave.status)}</td>
            </tr>
        `;
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}