/*
File: duck_trade.js
Type: js
Summary: Duck trade UI logic for validating and submitting duck trades.
*/

document.addEventListener("DOMContentLoaded", () => {
  const digitalDucksInput = document.getElementById("digital_ducks");
  const duckInputs = document.querySelectorAll(".input-sm");
  const toggle = document.getElementById("duck-type-toggle");
  const labels = document.querySelectorAll(".duck-label");
  const form = document.getElementById("trade-form");
  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");

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
      const val = input.value === "" ? 0 : parseInt(input.value, 10);
      const multiplier = isByte ? Math.pow(2, index) * 128 : Math.pow(2, index);
      total += val * multiplier;
    });
    return total;
  }

  function validateInputValues() {
    for (const input of duckInputs) {
      const rawValue = input.value === "" ? "0" : input.value;
      const value = parseInt(rawValue, 10);

      if (isNaN(value) || value < 0 || value > 10) {
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateInputValues()) {
      showBootstrapToast(
        "You may only request between 0 and 10 of each duck type.",
        "error",
      );
      return;
    }

    const digitalDucks = parseInt(digitalDucksInput.value || 0);
    const calculatedTotal = calculateTotalDucks();

    if (digitalDucks !== calculatedTotal) {
      showBootstrapToast(
        `Math Error: You offered ${digitalDucks}, but selected **${calculatedTotal.toString(2)}** worth of bits/bytes.`,
        "error",
      );
      return;
    }

    const isByte = toggle.checked;
    const duckValues = Array.from(duckInputs).map((input) =>
      input.value === "" ? 0 : parseInt(input.value),
    );

    const formData = {
      digital_ducks: digitalDucks,
      bit_ducks: isByte ? [0, 0, 0, 0, 0, 0, 0] : duckValues,
      byte_ducks: isByte ? duckValues : [0, 0, 0, 0, 0, 0, 0],
    };

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        showBootstrapToast(
          result.message || "Trade submitted successfully!",
          "success",
        );
        form.reset();
        updateLabels();
        if (typeof fetchAchievements === "function") fetchAchievements();
      } else {
        showBootstrapToast(result.message || "An error occurred.", "error");
      }
    } catch (error) {
      showBootstrapToast(
        "Failed to submit trade. Please try again later.",
        "error",
      );
      console.error("Error submitting trade:", error);
    }
  }

  function showBootstrapToast(message, type = "success") {
    const container = document.querySelector(".toast-container");
    if (!container) {
      console.error("Toast container not found in base.html");
      alert(message);
      return;
    }

    const bgClass =
      type === "success"
        ? "text-bg-success"
        : type === "warning"
          ? "text-bg-warning"
          : "text-bg-danger";

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

    const template = document.createElement("div");
    template.innerHTML = toastHTML.trim();
    const toastEl = template.firstChild;

    container.appendChild(toastEl);
    const bsToast = new bootstrap.Toast(toastEl);
    bsToast.show();

    toastEl.addEventListener("hidden.bs.toast", () => {
      toastEl.remove();
    });
  }

  toggle.addEventListener("change", (event) => {
    updateLabels();
  });

  form.addEventListener("submit", handleSubmit);
});
