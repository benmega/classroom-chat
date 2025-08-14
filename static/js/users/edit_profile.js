// edit_profile.js
// Handles dynamic skill/project fields and password visibility toggle

document.getElementById('add-skill').addEventListener('click', function() {
    const container = document.getElementById('skills-container');
    const newField = document.createElement('div');
    newField.classList.add('skill-entry');
    newField.innerHTML = `<input type="text" name="skills[]" placeholder="New Skill"><button type="button" class="remove-skill">Remove</button>`;
    container.appendChild(newField);
});

document.getElementById('add-project').addEventListener('click', function() {
    const container = document.getElementById('projects-container');
    const newField = document.createElement('div');
    newField.classList.add('project-entry');
    newField.innerHTML = `
        <input type="text" name="project_names[]" placeholder="Project Name">
        <input type="text" name="project_descriptions[]" placeholder="Project Description">
        <input type="text" name="project_links[]" placeholder="Project Link">
        <button type="button" class="remove-project">Remove</button>`;
    container.appendChild(newField);
});

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-skill')) {
        e.target.parentElement.remove();
    }
    if (e.target.classList.contains('remove-project')) {
        e.target.parentElement.remove();
    }
});

document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
        const targetId = this.dataset.target;
        const input = document.getElementById(targetId);
        if (input.type === 'password') {
            input.type = 'text';
            this.textContent = '🙈'; // Switch icon to hide
        } else {
            input.type = 'password';
            this.textContent = '👁️'; // Switch icon to show
        }
    });
});
