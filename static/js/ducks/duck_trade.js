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
            const multiplier = isByte ? Math.pow(2, index) * 128 : Math.pow(2, index);
            total += parseInt(input.value || 0) * multiplier;
        });
        return total;
    }

    function validateForm() {
        const validInputValues = validateInputValues();
        if (!validInputValues) {
            showToast("You may only request between 1 and 10 of each duck type.", "error");
            return false;
        }
        const digitalDucks = parseInt(digitalDucksInput.value || 0);
        const calculatedTotal = calculateTotalDucks();

        if (digitalDucks !== calculatedTotal) {
            showToast("The number of digital ducks does not match the total requested ducks.", "error");
            return false;
        }
        return true;
    }

    function validateInputValues() {
        for (const input of duckInputs) {
            const value = parseInt(input.value, 10);

            // Check if value is not a number or out of bounds
            if (isNaN(value) || value < 0 || value > 10) {
                return false;
            }
        }
        return true;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!validateForm()) return;
        const isByte = toggle.checked;
        const duckValues = Array.from(duckInputs).map(input => parseInt(input.value || 0));

        const formData = {
            digital_ducks: parseInt(digitalDucksInput.value || 0),
            bit_ducks: isByte ? [0, 0, 0, 0, 0, 0, 0] : duckValues,
            byte_ducks: isByte ? duckValues : [0, 0, 0, 0, 0, 0, 0]
        };

        const responseBody = JSON.stringify(formData);
        console.log(responseBody)
        try {
            const response = await fetch(form.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
                },
                body: responseBody,
            });

            const result = await response.json();

            if (response.ok && result.status === "success") {
                showToast(result.message || "Trade submitted successfully!", "success");
                form.reset();
                updateLabels();
            } else {
                showToast(result.message || "An error occurred.", "error");
            }
        } catch (error) {
            showToast("Failed to submit trade. Please try again later.", "error");
            console.error("Error submitting trade:", error);
        }
    }

    function showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.innerText = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    toggle.addEventListener("change", (event) => {
        event.preventDefault();
        updateLabels();
    });

    form.addEventListener("submit", handleSubmit);
});
