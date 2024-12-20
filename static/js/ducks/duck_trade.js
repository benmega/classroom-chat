document.addEventListener("DOMContentLoaded", () => {
    const digitalDucksInput = document.getElementById("digital_ducks");
    const bitInputs = document.querySelectorAll(".bit-input");
    const byteInputs = document.querySelectorAll(".byte-input");
    const form = document.getElementById("trade-form");

    function calculateTotalDucks() {
        let total = 0;

        // Calculate bit ducks
        bitInputs.forEach((input, index) => {
            total += parseInt(input.value || 0) * Math.pow(2, index);
        });

        // Calculate byte ducks
        byteInputs.forEach((input, index) => {
            total += parseInt(input.value || 0) * Math.pow(2, index + 8);
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
    form.addEventListener("submit", handleSubmit);
});
