const session = getSession();

if (!session || session.role !== "admin") {
    window.location.href = "index.html";
}

const employeeForm = document.getElementById("employee-form");
const employeeTable = document.getElementById("employee-table");
const searchInput = document.getElementById("search-employee");
const formMessage = document.getElementById("form-message");

document.getElementById("logout-button").addEventListener("click", logoutUser);

employeeForm.addEventListener("submit", saveEmployee);

searchInput.addEventListener("input", showEmployees);

showEmployees();

function saveEmployee(event) {
    event.preventDefault();

    let users = getData("hcm_users");

    const id = document.getElementById("employee-id").value;
    const name = document.getElementById("employee-name").value.trim();
    const email = document.getElementById("employee-email").value.trim();
    const password = document.getElementById("employee-password").value;
    const department = document.getElementById("employee-department").value.trim();
    const salary = Number(document.getElementById("employee-salary").value);

    if (!name || !email || !department || salary <= 0) {
        showMessage("Please enter valid employee details.", "red");
        return;
    }

    const existingUser = users.find(function (user) {
        return user.email.toLowerCase() === email.toLowerCase()
            && String(user.id) !== id;
    });

    if (existingUser) {
        showMessage("This email is already registered.", "red");
        return;
    }

    if (id) {
        const employeeIndex = users.findIndex(function (user) {
            return String(user.id) === id && user.role === "employee";
        });

        if (employeeIndex === -1) {
            showMessage("Employee not found.", "red");
            return;
        }

        const oldEmployee = users[employeeIndex];

        users[employeeIndex] = {
            ...oldEmployee,
            name: name,
            email: email,
            department: department,
            salary: salary
        };

        if (password.trim() !== "") {
            users[employeeIndex].password = password;
        }

        showMessage("Employee updated successfully.", "green");

    } else {
        if (!password.trim()) {
            showMessage("Please enter a login password.", "red");
            return;
        }

        const newEmployee = {
            id: Date.now(),
            name: name,
            email: email,
            password: password,
            role: "employee",
            department: department,
            salary: salary
        };

        users.push(newEmployee);

        showMessage("Employee added successfully. Login account created.", "green");
    }

    saveData("hcm_users", users);

    employeeForm.reset();
    document.getElementById("employee-id").value = "";
    document.getElementById("save-button").textContent = "Add Employee";

    showEmployees();
}

function showEmployees() {
    const users = getData("hcm_users");

    const employees = users.filter(function (user) {
        return user.role === "employee";
    });

    const searchText = searchInput.value.toLowerCase();

    const filteredEmployees = employees.filter(function (employee) {
        return employee.name.toLowerCase().includes(searchText)
            || employee.email.toLowerCase().includes(searchText)
            || employee.department.toLowerCase().includes(searchText);
    });

    document.getElementById("total-employees").textContent = employees.length;

    employeeTable.innerHTML = "";

    if (filteredEmployees.length === 0) {
        employeeTable.innerHTML = `
            <tr>
                <td colspan="5">No employees found.</td>
            </tr>
        `;
        return;
    }

    filteredEmployees.forEach(function (employee) {
        employeeTable.innerHTML += `
            <tr>
                <td>${escapeHTML(employee.name)}</td>
                <td>${escapeHTML(employee.email)}</td>
                <td>${escapeHTML(employee.department)}</td>
                <td>Rs. ${Number(employee.salary).toLocaleString()}</td>
                <td>
                    <button
                        onclick="editEmployee('${employee.id}')"
                        style="width:auto; padding:8px; margin-bottom:5px;"
                    >
                        Edit
                    </button>

                    <button
                        onclick="deleteEmployee('${employee.id}')"
                        style="width:auto; padding:8px; background:#dc2626;"
                    >
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}

function editEmployee(id) {
    const users = getData("hcm_users");

    const employee = users.find(function (user) {
        return String(user.id) === String(id)
            && user.role === "employee";
    });

    if (!employee) {
        showMessage("Employee not found.", "red");
        return;
    }

    document.getElementById("employee-id").value = employee.id;
    document.getElementById("employee-name").value = employee.name;
    document.getElementById("employee-email").value = employee.email;
    document.getElementById("employee-password").value = "";
    document.getElementById("employee-department").value = employee.department;
    document.getElementById("employee-salary").value = employee.salary;

    document.getElementById("save-button").textContent = "Update Employee";

    showMessage("Editing employee. Leave password empty to keep it unchanged.", "#4338ca");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function deleteEmployee(id) {
    if (!confirm("Are you sure you want to delete this employee?")) {
        return;
    }

    let users = getData("hcm_users");

    users = users.filter(function (user) {
        return !(String(user.id) === String(id) && user.role === "employee");
    });

    saveData("hcm_users", users);

    showEmployees();

    showMessage("Employee deleted.", "green");
}

function showMessage(message, color) {
    formMessage.textContent = message;
    formMessage.style.color = color;
    formMessage.style.marginTop = "12px";
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