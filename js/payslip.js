const session = getSession();

if (!session) {
    window.location.href = "index.html";
}
else if (session.role !== "employee") {
    alert("Payslip sirf Employee account se open hogi.");
    window.location.href = "admin.html";
}
// Get employee
let users = getData("hcm_users") || [];

const employee = users.find(function (user) {
    return user.email === session.email &&
           user.role === "employee";
});

if (!employee) {
    logoutUser();
    window.location.href = "index.html";
}

// Load saved data
let attendance = getData("hcm_attendance") || [];
let leaves = getData("hcm_leaves") || [];
let company = getData("hcm_company") || {};

// Elements
const salaryMonthInput = document.getElementById("salaryMonth");
const generateBtn = document.getElementById("generateBtn");
const payslipSection = document.getElementById("payslipSection");
const payslipMessage = document.getElementById("payslipMessage");

// Default month = current month
function getCurrentMonth() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

salaryMonthInput.value = getCurrentMonth();

// Format salary
function formatMoney(amount) {
    return "Rs. " + Number(amount).toLocaleString("en-PK", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
}

// Count working days in a month
function countMonthlyWorkingDays(year, month) {
    let count = 0;

    const date = new Date(year, month - 1, 1);

    while (date.getMonth() === month - 1) {
        const day = date.getDay();

        // Saturday and Sunday are weekends
        if (day !== 0 && day !== 6) {
            count++;
        }

        date.setDate(date.getDate() + 1);
    }

    return count;
}

// Count approved leave weekdays in selected month
function countApprovedLeaves(email, year, month) {
    let total = 0;

    leaves.forEach(function (leave) {
        if (
            leave.employeeEmail !== email ||
            leave.status !== "Approved"
        ) {
            return;
        }

        const start = new Date(leave.startDate + "T12:00:00");
        const end = new Date(leave.endDate + "T12:00:00");

        while (start <= end) {
            if (
                start.getFullYear() === year &&
                start.getMonth() + 1 === month &&
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

// Show message
function showMessage(message, type) {
    payslipMessage.textContent = message;
    payslipMessage.className = "message " + type;
}

// Generate payslip
function generatePayslip() {

    // Refresh data
    users = getData("hcm_users") || [];
    attendance = getData("hcm_attendance") || [];
    leaves = getData("hcm_leaves") || [];
    company = getData("hcm_company") || {};

    const currentEmployee = users.find(function (user) {
        return user.email === session.email &&
               user.role === "employee";
    });

    if (!currentEmployee) {
        showMessage("Employee record nahi mila.", "error");
        return;
    }

    const selectedMonth = salaryMonthInput.value;

    if (!selectedMonth) {
        showMessage("Salary month select karein.", "error");
        return;
    }

    const parts = selectedMonth.split("-");

    const year = Number(parts[0]);
    const month = Number(parts[1]);

    const today = new Date();

    // Don't generate future-month payslips
    if (
        year > today.getFullYear() ||
        (year === today.getFullYear() &&
         month > today.getMonth() + 1)
    ) {
        showMessage("Future month ki payslip generate nahi kar sakte.", "error");
        payslipSection.hidden = true;
        return;
    }

    const monthlySalary = Number(currentEmployee.salary || 0);

    if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) {
        showMessage("Employee ki monthly salary set nahi hai.", "error");
        payslipSection.hidden = true;
        return;
    }

    // Get total working days for month
    const totalWorkingDays = countMonthlyWorkingDays(year, month);

    // Get attendance records for selected month
    const monthlyAttendance = attendance.filter(function (record) {
        return (
            record.employeeEmail === currentEmployee.email &&
            record.date.startsWith(selectedMonth)
        );
    });

    // Count each attendance status
    let present = 0;
    let late = 0;
    let halfDay = 0;

    monthlyAttendance.forEach(function (record) {
        if (record.status === "Present") {
            present++;
        } else if (record.status === "Late") {
            late++;
        } else if (record.status === "Half Day") {
            halfDay++;
        }
    });

    // Approved leave days
    const approvedLeaveDays = countApprovedLeaves(
        currentEmployee.email,
        year,
        month
    );

    // Count weekdays for which attendance should be complete.
    // Current month is calculated only up to today's date.
    let expectedWorkingDays = 0;

    const lastDay = new Date(year, month, 0).getDate();

    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);

        if (date.getDay() === 0 || date.getDay() === 6) {
            continue;
        }

        if (
            year === today.getFullYear() &&
            month === today.getMonth() + 1 &&
            day > today.getDate()
        ) {
            continue;
        }

        expectedWorkingDays++;
    }

    // No attendance record on a working day = absent,
    // except approved leave days.
    const attendedDays = present + late + halfDay;

    const absentDays = Math.max(
        0,
        expectedWorkingDays - attendedDays - approvedLeaveDays
    );

    // Salary calculation from project rules
    const perDaySalary = monthlySalary / totalWorkingDays;

    const absentDeduction = perDaySalary * absentDays;

    const halfDayDeduction = perDaySalary * 0.5 * halfDay;

    const totalDeduction = absentDeduction + halfDayDeduction;

    const netSalary = Math.max(0, monthlySalary - totalDeduction);

    // Display employee information
    document.getElementById("companyName").textContent =
        company.name || "HCM Lite";

    document.getElementById("employeeName").textContent =
        currentEmployee.name;

    document.getElementById("employeeEmail").textContent =
        currentEmployee.email;

    document.getElementById("employeeDepartment").textContent =
        currentEmployee.department || "Not specified";

    document.getElementById("payslipMonth").textContent =
        new Date(year, month - 1, 1).toLocaleDateString("en-PK", {
            month: "long",
            year: "numeric"
        });

    document.getElementById("payslipDate").textContent =
        "Generated: " + new Date().toLocaleDateString("en-PK");

    document.getElementById("monthlySalary").textContent =
        formatMoney(monthlySalary);

    document.getElementById("workingDays").textContent =
        totalWorkingDays;

    document.getElementById("presentDays").textContent =
        present + late;

    document.getElementById("absentDays").textContent =
        absentDays;

    document.getElementById("halfDays").textContent =
        halfDay;

    document.getElementById("approvedLeaveDays").textContent =
        approvedLeaveDays;

    document.getElementById("perDaySalary").textContent =
        formatMoney(perDaySalary);

    document.getElementById("absentDeduction").textContent =
        formatMoney(absentDeduction);

    document.getElementById("halfDayDeduction").textContent =
        formatMoney(halfDayDeduction);

    document.getElementById("totalDeduction").textContent =
        formatMoney(totalDeduction);

    document.getElementById("netSalary").textContent =
        formatMoney(netSalary);

    payslipSection.hidden = false;

    showMessage("Payslip generate ho gayi.", "success");
}

// Generate button
generateBtn.addEventListener("click", generatePayslip);

// Print payslip
document.getElementById("printBtn").addEventListener("click", function () {
    window.print();
});


// Generate current month's payslip initially
generatePayslip();