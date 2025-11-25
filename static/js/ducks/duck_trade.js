document.addEventListener("DOMContentLoaded", () => {
    const digitalDucksInput = document.getElementById("digital_ducks");
    const duckInputs = document.querySelectorAll(".input-sm");
    const toggle = document.getElementById("duck-type-toggle");
    const labels = document.querySelectorAll(".duck-label");
    const form = document.getElementById("trade-form");
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

    function updateLabels() {
        const isByte = toggle.checked;
        labels.forEach((label, index) => {
            const value = 2 ** index;
            const unit = isByte ? "B" : "b";
            label.textContent = `${value.toString(2)}${unit}`;
        });
    }

    function calculateTotalDucks() {
        let total = 0;
        const isByte = toggle.checked;
        duckInputs.forEach((input, index) => {
            // Treat empty string as 0
            const val = input.value === "" ? 0 : parseInt(input.value, 10);
            const multiplier = isByte ? Math.pow(2, index) * 128 : Math.pow(2, index);
            total += val * multiplier;
        });
        return total;
    }

    function validateInputValues() {
        for (const input of duckInputs) {
            // Treat empty string as 0
            const rawValue = input.value === "" ? "0" : input.value;
            const value = parseInt(rawValue, 10);

            // Check if value is not a number or out of bounds
            if (isNaN(value) || value < 0 || value > 10) {
                return false;
            }
        }
        return true;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        // 1. Validate inputs (0-10)
        if (!validateInputValues()) {
            showBootstrapToast("You may only request between 0 and 10 of each duck type.", "error");
            return;
        }

        // 2. Validate Math
        const digitalDucks = parseInt(digitalDucksInput.value || 0);
        const calculatedTotal = calculateTotalDucks();

        if (digitalDucks !== calculatedTotal) {
            showBootstrapToast(`Math Error: You offered ${digitalDucks}, but selected ${calculatedTotal} worth of bits/bytes.`, "error");
            return;
        }

        const isByte = toggle.checked;
        // Convert blanks to 0 for the payload
        const duckValues = Array.from(duckInputs).map(input => input.value === "" ? 0 : parseInt(input.value));

        const formData = {
            digital_ducks: digitalDucks,
            bit_ducks: isByte ? [0, 0, 0, 0, 0, 0, 0] : duckValues,
            byte_ducks: isByte ? duckValues : [0, 0, 0, 0, 0, 0, 0]
        };

        try {
            const response = await fetch(form.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (response.ok && result.status === "success") {
                showBootstrapToast(result.message || "Trade submitted successfully!", "success");
                form.reset();
                updateLabels();
                // Assuming this function exists in your global scope or imported
                if (typeof fetchAchievements === "function") fetchAchievements();
            } else {
                showBootstrapToast(result.message || "An error occurred.", "error");
            }
        } catch (error) {
            showBootstrapToast("Failed to submit trade. Please try again later.", "error");
            console.error("Error submitting trade:", error);
        }
    }

    function showBootstrapToast(message, type = "success") {
        // 1. Find the container in base.html
        const container = document.querySelector('.toast-container');
        if (!container) {
            console.error("Toast container not found in base.html");
            alert(message); // Fallback
            return;
        }

        // 2. Determine Bootstrap colors
        // 'danger' is Red, 'success' is Green, 'warning' is Yellow
        const bgClass = type === 'success' ? 'text-bg-success' : (type === 'warning' ? 'text-bg-warning' : 'text-bg-danger');

        // 3. Create the HTML structure matching base.html
        const toastHTML = `
            <div class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        // 4. Convert string to DOM element
        const template = document.createElement('div');
        template.innerHTML = toastHTML.trim();
        const toastEl = template.firstChild;

        // 5. Append to container and Initialize Bootstrap Toast
        container.appendChild(toastEl);
        const bsToast = new bootstrap.Toast(toastEl);
        bsToast.show();

        // 6. Cleanup DOM after it hides
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }

    toggle.addEventListener("change", (event) => {
        // event.preventDefault(); // Removed this, it can sometimes stop the checkbox from visually checking
        updateLabels();
    });

    form.addEventListener("submit", handleSubmit);
});

//document.addEventListener("DOMContentLoaded", () => {
//    const digitalDucksInput = document.getElementById("digital_ducks");
//    const duckInputs = document.querySelectorAll(".input-sm");
//    const toggle = document.getElementById("duck-type-toggle");
//    const labels = document.querySelectorAll(".duck-label");
//    const form = document.getElementById("trade-form");
//    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
//
//function updateLabels() {
//    const isByte = toggle.checked;
//    labels.forEach((label, index) => {
//        const value = 2 ** index;
//        const unit = isByte ? "B" : "b";
//        label.textContent = `${value.toString(2)}${unit}`;
//    });
//}
//
//    function calculateTotalDucks() {
//        let total = 0;
//        const isByte = toggle.checked;
//        duckInputs.forEach((input, index) => {
//            const multiplier = isByte ? Math.pow(2, index) * 128 : Math.pow(2, index);
//            total += parseInt(input.value || 0) * multiplier;
//        });
//        return total;
//    }
//
//    function validateForm() {
//        const validInputValues = validateInputValues();
//        if (!validInputValues) {
//            showToast("You may only request between 1 and 10 of each duck type.", "error");
//            return false;
//        }
//        const digitalDucks = parseInt(digitalDucksInput.value || 0);
//        const calculatedTotal = calculateTotalDucks();
//
//        if (digitalDucks !== calculatedTotal) {
//            showToast("The number of digital ducks does not match the total requested ducks.", "error");
//            return false;
//        }
//        return true;
//    }
//
//    function validateInputValues() {
//        for (const input of duckInputs) {
//            const rawValue = input.value === "" ? "0" : input.value;
//            const value = parseInt(rawValue, 10);
//
//            // Check if value is not a number or out of bounds
//            if (isNaN(value) || value < 0 || value > 10) {
//                return false;
//            }
//        }
//        return true;
//    }
//
//    async function handleSubmit(event) {
//        event.preventDefault();
//
//        if (!validateForm()) return;
//        const isByte = toggle.checked;
//        const duckValues = Array.from(duckInputs).map(input => parseInt(input.value || 0));
//
//        const formData = {
//            digital_ducks: parseInt(digitalDucksInput.value || 0),
//            bit_ducks: isByte ? [0, 0, 0, 0, 0, 0, 0] : duckValues,
//            byte_ducks: isByte ? duckValues : [0, 0, 0, 0, 0, 0, 0]
//        };
//
//        const responseBody = JSON.stringify(formData);
//        console.log(responseBody)
//        try {
//            const response = await fetch(form.action, {
//                method: "POST",
//                headers: {
//                    "Content-Type": "application/json",
//                    "X-Requested-With": "XMLHttpRequest",
//                    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
//                },
//                body: responseBody,
//            });
//
//            const result = await response.json();
//
//            if (response.ok && result.status === "success") {
//                showToast(result.message || "Trade submitted successfully!", "success");
//                form.reset();
//                updateLabels();
//                fetchAchievements();
//            } else {
//                showToast(result.message || "An error occurred.", "error");
//            }
//        } catch (error) {
//            showToast("Failed to submit trade. Please try again later.", "error");
//            console.error("Error submitting trade:", error);
//        }
//    }
//
//    function showToast(message, type = "success") {
//        const toast = document.createElement("div");
//        toast.className = `toast ${type}`;
//        toast.innerText = message;
//        document.body.appendChild(toast);
//
//        setTimeout(() => toast.remove(), 3000);
//    }
//
//    toggle.addEventListener("change", (event) => {
//        event.preventDefault();
//        updateLabels();
//    });
//
//    form.addEventListener("submit", handleSubmit);
//});
