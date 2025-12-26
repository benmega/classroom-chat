// usernameLogic.js

// Open the modal on username form submission
export function handleUsernameFormSubmission(e) {
  e.preventDefault();
  openModal();
}

export function openModal() {
  document.getElementById("passwordInput").value = ""; // Clear the password field
  document.getElementById("passwordModal").style.display = "block";
}

// Close the modal logic
export function closeModalLogic(span, modal) {
  span.onclick = closeModal;
  window.onclick = function (event) {
    if (event.target == modal) {
      closeModal();
    }
  };
}

export function closeModal() {
  document.getElementById("passwordModal").style.display = "none";
}

// Handle password submission
export function handlePasswordSubmission(submitPasswordBtn) {
  submitPasswordBtn.onclick = function () {
    submitPassword();
  };
}

// Function to verify the password
export function verifyPassword(username, password) {
  var params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);

  return fetch("admin/verify_password", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  }).then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  });
}

// Function to update the username on successful verification
function updateUsername(username, success) {
  if (success) {
    document.getElementById("currentUsername").value = username;
    alert("Username updated successfully!");
  } else {
    alert("Incorrect password. You are not allowed to change the username.");
    document.getElementById("username").value =
      document.getElementById("currentUsername").value;
  }
}

export function handlePasswordVerification(username, password) {
  verifyPassword(username, password)
    .then((data) => {
      updateUsername(username, data.success);
    })
    .catch((error) => {
      console.error("Error during verification:", error);
      alert("Failed to verify password due to an error.");
    });
}

export function submitPassword() {
  var password = document.getElementById("passwordInput").value;
  var username = document.getElementById("username").value;
  closeModal();
  handlePasswordVerification(username, password);
}

export function setupUsernameLogic() {
  var modal = document.getElementById("passwordModal");
  var span = document.getElementsByClassName("close")[0];
  var usernameForm = document.getElementById("usernameForm");
  var submitPasswordBtn = document.getElementById("submitPasswordBtn");

  usernameForm.addEventListener("submit", handleUsernameFormSubmission);
  closeModalLogic(span, modal);
  handlePasswordSubmission(submitPasswordBtn);
}
