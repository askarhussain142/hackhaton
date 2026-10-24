// Check Admin Login
const session = getSession();

if (!session || session.role !== "admin") {
    window.location.href = "index.html";
}

// Get saved data
let users = getData("hcm_users") || [];
let leaves = getData("hcm_leaves") || [];
let company = getData("hcm_company") || {};

// Count working days, excluding weekends
function countWorkingDays(startDate, endDate) {
    let count = 0;

    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");

    while (start <= end) {
        const day = start.getDay();

        // 0 = Sunday, 6 = Saturday
        if (day !== 0 && day !== 6) {
            count++;
        }

        start.setDate(start.getDate() + 1);
    }

    return count;
}

// Get approved leave days for an employee in a year
function getApprovedLeaveDays(email, year) {
    let total = 0;

    leaves.forEach(function (leave) {
        if (
            leave.employeeEmail === email &&
            leave.status === "Approved"
        ) {
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
        }
    });

    return total;
}

// Check overlapping requests
function hasOverlap(email, startDate, endDate, currentLeaveId) {
    return leaves.some(function (leave) {
        if (leave.employeeEmail !== email) {
            return false;
        }

        if (leave.status === "Rejected") {
            return false;
        }

        if (leave.id === currentLeaveId) {
            return false;
        }

        return (
            startDate <= leave.endDate &&
            endDate >= leave.startDate
        );
    });
}

// Display message
function showLeaveMessage(message, type) {
    const box = document.getElementById("leaveMessage");

    box.textContent = message;
    box.className = "message " + type;
}

// Render leave requests
function renderLeaves() {
    users = getData("hcm_users") || [];
    leaves = getData("hcm_leaves") || [];

    const table = document.getElementById("leavesTable");
    const filter = document.getElementById("statusFilter").value;

    // Update statistics
    document.getElementById("pendingCount").textContent =
        leaves.filter(function (leave) {
            return leave.status === "Pending";
        }).length;

    document.getElementById("approvedCount").textContent =
        leaves.filter(function (leave) {
            return leave.status === "Approved";
        }).length;

    document.getElementById("rejectedCount").textContent =
        leaves.filter(function (leave) {
            return leave.status === "Rejected";
        }).length;

    let filteredLeaves = leaves;

    if (filter !== "All") {
        filteredLeaves = leaves.filter(function (leave) {
            return leave.status === filter;
        });
    }

    if (filteredLeaves.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7">No leave requests found.</td>
            </tr>
        `;
        return;
    }

    table.innerHTML = filteredLeaves.map(function (leave) {
        const isPending = leave.status === "Pending";

        return `
            <tr>
                <td>${escapeHTML(leave.employeeName || leave.employeeEmail)}</td>
                <td>${escapeHTML(leave.startDate)}</td>
                <td>${escapeHTML(leave.endDate)}</td>
                <td>${Number(leave.days || 0)}</td>
                <td>${escapeHTML(leave.reason || "-")}</td>
                <td>${escapeHTML(leave.status)}</td>
                <td>
                    ${
                        isPending
                            ? `
                                <button
                                    class="primary-btn"
                                    data-action="approve"
                                    data-id="${escapeHTML(leave.id)}">
                                    Approve
                                </button>

                                <button
                                    class="logout-btn"
                                    data-action="reject"
                                    data-id="${escapeHTML(leave.id)}">
                                    Reject
                                </button>
                            `
                            : "-"
                    }
                </td>
            </tr>
        `;
    }).join("");
}

// Approve or reject request
document.getElementById("leavesTable").addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    leaves = getData("hcm_leaves") || [];
    users = getData("hcm_users") || [];
    company = getData("hcm_company") || {};

    const leaveId = button.dataset.id;
    const action = button.dataset.action;

    const leave = leaves.find(function (item) {
        return String(item.id) === String(leaveId);
    });

    if (!leave || leave.status !== "Pending") {
        showLeaveMessage("Ye request ab pending nahi hai.", "error");
        renderLeaves();
        return;
    }

    if (action === "reject") {
        leave.status = "Rejected";
        leave.reviewedAt = new Date().toISOString();

        saveData("hcm_leaves", leaves);

        showLeaveMessage("Leave request rejected.", "success");
        renderLeaves();
        return;
    }

    if (action === "approve") {
        // Prevent overlapping approved/pending requests
        if (
            hasOverlap(
                leave.employeeEmail,
                leave.startDate,
                leave.endDate,
                leave.id
            )
        ) {
            showLeaveMessage(
                "Is employee ki dates kisi doosri leave request se overlap karti hain.",
                "error"
            );
            return;
        }

        const employee = users.find(function (user) {
            return user.email === leave.employeeEmail &&
                   user.role === "employee";
        });

        if (!employee) {
            showLeaveMessage("Employee account nahi mila.", "error");
            return;
        }

        // Check annual leave quota
        const startYear = Number(leave.startDate.slice(0, 4));
        const endYear = Number(leave.endDate.slice(0, 4));

        if (startYear !== endYear) {
            showLeaveMessage(
                "Leave request ek calendar year ke andar honi chahiye.",
                "error"
            );
            return;
        }

        const quota = Number(company.leaveQuota ?? 20);

        const alreadyUsed = getApprovedLeaveDays(
            leave.employeeEmail,
            startYear
        );

        if (alreadyUsed + Number(leave.days) > quota) {
            showLeaveMessage(
                "Employee ka annual leave quota exceed ho raha hai.",
                "error"
            );
            return;
        }

        leave.status = "Approved";
        leave.reviewedAt = new Date().toISOString();

        saveData("hcm_leaves", leaves);

        showLeaveMessage("Leave request approved.", "success");
        renderLeaves();
    }
});

// Filter changes
document.getElementById("statusFilter").addEventListener("change", renderLeaves);

// Logout
document.getElementById("logoutBtn").addEventListener("click", function () {
    logoutUser();
    window.location.href = "index.html";
});

// Initial display
renderLeaves();