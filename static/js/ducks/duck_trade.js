document.addEventListener("DOMContentLoaded", () => {
    const digitalDucksInput = document.getElementById("digital_ducks");
    const duckInputs = document.querySelectorAll(".input-sm");
    const toggle = document.getElementById("duck-type-toggle");
    const labels = document.querySelectorAll(".duck-label");
    const form = document.getElementById("trade-form");

    let isByte = toggle.value === "byte"; // Track current duck type

    function updateLabels() {
        isByte = toggle.value === "byte"; // Update current duck type
        labels.forEach((label, index) => {
            const value = (2 ** index) ; //* (isByte ? 256 : 1)
            const unit = isByte ? "B" : "b";
            label.textContent = `${value.toString(2)}${unit}`;
        });
    }

    function calculateTotalDucks() {
        let total = 0;

        duckInputs.forEach((input, index) => {
            const multiplier = isByte ? Math.pow(2, index + 8) : Math.pow(2, index);
            total += parseInt(input.value || 0) * multiplier;
        });

        return total;
    }

    function validateForm() {
        const digitalDucks = parseInt(digitalDucksInput.value || 0);
        const calculatedTotal = calculateTotalDucks();

        if (digitalDucks !== calculatedTotal) {
            showToast("The number of digital ducks does not match the total requested ducks.", "error");
            return false;
        }
        return true;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!validateForm()) return;

        const formData = new FormData(form);

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (response.ok && result.status === "success") {
                showToast(result.message, "success");
                form.reset(); // Reset the form on success
                updateLabels(); // Reset labels to match the default duck type
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

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Attach event listeners
    toggle.addEventListener("change", updateLabels);
    form.addEventListener("submit", handleSubmit);
});
