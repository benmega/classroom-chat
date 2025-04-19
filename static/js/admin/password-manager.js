// password-manager.js
// Ensure this file is included with `defer` or after the HTML

document.addEventListener('DOMContentLoaded', () => {
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const strengthBar = document.querySelector('.strength-bar');
    const matchIndicator = document.querySelector('.password-match-indicator');
    const resetButton = document.getElementById('reset-password-button');
    const userSelect = document.getElementById('reset-username');

    // Ensure all elements exist
    if (!newPasswordInput || !confirmPasswordInput || !strengthBar || !matchIndicator || !resetButton || !userSelect) {
        console.error('Password Manager: Missing required elements');
        return;
    }

    // Calculate password strength
    function calculatePasswordStrength(password) {
        let strength = 0;
        if (password.length > 6) {
            strength += 20;
            strength += Math.min(10, password.length - 6);
        }
        if (/[a-z]/.test(password)) strength += 10;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 20;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 30;
        return strength;
    }

    // Show strength and match indicators
    function checkPasswordMatch() {
        const pwd = newPasswordInput.value;
        const confirm = confirmPasswordInput.value;
        matchIndicator.className = 'password-match-indicator';

        if (!confirm) {
            matchIndicator.textContent = '';
        } else if (pwd === confirm) {
            matchIndicator.classList.add('match');
            matchIndicator.textContent = 'Passwords match!';
        } else {
            matchIndicator.classList.add('no-match');
            matchIndicator.textContent = 'Passwords do not match';
        }
    }

    // Update strength bar
    newPasswordInput.addEventListener('input', () => {
        const pwd = newPasswordInput.value;
        const strength = calculatePasswordStrength(pwd);

        strengthBar.className = 'strength-bar';
        strengthBar.style.width = pwd ? `${strength}%` : '0%';

        if (pwd) {
            if (strength < 40) strengthBar.classList.add('weak');
            else if (strength < 80) strengthBar.classList.add('medium');
            else strengthBar.classList.add('strong');
        }

        checkPasswordMatch();
    });

    // Match check on confirm input
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);

    // Handle reset button click
    resetButton.addEventListener('click', () => {
        const username = userSelect.value;
        const newPwd = newPasswordInput.value;
        const confirmPwd = confirmPasswordInput.value;

        if (!username || !newPwd || !confirmPwd) {
            alert('Please fill in all fields');
            return;
        }
        if (newPwd !== confirmPwd) {
            alert('Passwords do not match');
            return;
        }
        if (calculatePasswordStrength(newPwd) < 40 && !confirm('Password is weak. Continue?')) {
            return;
        }

        fetch(window.urls.resetPasswordUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({ username, new_password: newPwd })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Password reset successfully!');
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
                strengthBar.style.width = '0%';
                matchIndicator.textContent = '';
            } else {
                alert(`Error: ${data.error}`);
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('An error occurred while resetting the password');
        });
    });

    // Helper to get CSRF token
    function getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    }
});



//// password-manager.js
//document.addEventListener('DOMContentLoaded', function() {
//    const newPasswordInput = document.getElementById('new-password');
//    const confirmPasswordInput = document.getElementById('confirm-password');
//    const strengthBar = document.querySelector('.strength-bar');
//    const matchIndicator = document.querySelector('.password-match-indicator');
//    const resetButton = document.getElementById('reset-password-button');
//    const userSelect = document.getElementById('reset-username');
//
//    // Check password strength
//    newPasswordInput.addEventListener('admin-input', function() {
//        const password = this.value;
//        let strength = calculatePasswordStrength(password);
//
//        strengthBar.className = 'strength-bar';
//
//        if (password.length === 0) {
//            strengthBar.style.width = '0';
//        } else if (strength < 40) {
//            strengthBar.classList.add('weak');
//        } else if (strength < 80) {
//            strengthBar.classList.add('medium');
//        } else {
//            strengthBar.classList.add('strong');
//        }
//
//        checkPasswordMatch();
//    });
//
//    // Check if passwords match
//    confirmPasswordInput.addEventListener('admin-input', checkPasswordMatch);
//
//    function checkPasswordMatch() {
//        const password = newPasswordInput.value;
//        const confirmPassword = confirmPasswordInput.value;
//
//        matchIndicator.className = 'password-match-indicator';
//
//        if (confirmPassword.length === 0) {
//            matchIndicator.textContent = '';
//        } else if (password === confirmPassword) {
//            matchIndicator.classList.add('match');
//            matchIndicator.textContent = 'Passwords match!';
//        } else {
//            matchIndicator.classList.add('no-match');
//            matchIndicator.textContent = 'Passwords do not match';
//        }
//    }
//
//    // Calculate password strength
//    function calculatePasswordStrength(password) {
//        let strength = 0;
//
//        // Length contribution
//        if (password.length > 6) {
//            strength += 20;
//            strength += Math.min(10, password.length - 6); // Extra points for longer passwords
//        }
//
//        // Character variety contribution
//        if (/[a-z]/.test(password)) strength += 10;
//        if (/[A-Z]/.test(password)) strength += 20;
//        if (/[0-9]/.test(password)) strength += 20;
//        if (/[^a-zA-Z0-9]/.test(password)) strength += 30;
//
//        return strength;
//    }
//
//    // Reset password
//    resetButton.addEventListener('click', function() {
//        console.log('Reset clicked');
//        const username = userSelect.value;
//        const newPassword = newPasswordInput.value;
//        const confirmPassword = confirmPasswordInput.value;
//
//        if (!username || !newPassword || !confirmPassword) {
//            alert('Please fill in all fields');
//            return;
//        }
//
//        if (newPassword !== confirmPassword) {
//            alert('Passwords do not match');
//            return;
//        }
//
//        if (calculatePasswordStrength(newPassword) < 40) {
//            if (!confirm('The password is weak. Are you sure you want to proceed?')) {
//                return;
//            }
//        }
//
//        // Send AJAX request to reset password
//        fetch(window.urls.resetPasswordUrl, {
//            method: 'POST',
//            headers: {
//                'Content-Type': 'application/json',
//                'X-CSRFToken': getCsrfToken() // You'll need to implement this function
//            },
//            body: JSON.stringify({
//                username: username,
//                new_password: newPassword
//            })
//        })
//        .then(response => response.json())
//        .then(data => {
//            if (data.success) {
//                alert('Password reset successfully!');
//                newPasswordInput.value = '';
//                confirmPasswordInput.value = '';
//                strengthBar.style.width = '0';
//                matchIndicator.textContent = '';
//            } else {
//                alert('Error: ' + data.error);
//            }
//        })
//        .catch(error => {
//            console.error('Error:', error);
//            alert('An error occurred while resetting the password');
//        });
//    });
//
//    // Helper function to get CSRF token
//    function getCsrfToken() {
//        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
//    }
//});