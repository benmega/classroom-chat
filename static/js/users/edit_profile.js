// edit_profile.js
// Handles dynamic skill/project fields and password visibility toggle

document.getElementById("add-skill").addEventListener("click", function () {
  const container = document.getElementById("skills-container");
  const newField = document.createElement("div");
  newField.classList.add("skill-entry");
  newField.innerHTML = `<input type="text" name="skills[]" placeholder="New Skill"><button type="button" class="remove-skill">Remove</button>`;
  container.appendChild(newField);
});

document.getElementById("add-project").addEventListener("click", function () {
  const container = document.getElementById("projects-container");
  const newField = document.createElement("div");
  newField.classList.add("project-entry");
  // Inline styles used to match the HTML template above; move to CSS file if preferred
  newField.style.cssText =
    "border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 5px;";

  newField.innerHTML = `
        <div style="margin-bottom: 5px;">
            <input type="text" name="project_names[]" placeholder="Project Name" style="width: 70%;">
            <button type="button" class="remove-project" style="float: right;">Remove</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 5px;">
            <input type="text" name="project_links[]" placeholder="Game Link (Demo)">
            <input type="text" name="project_github_links[]" placeholder="GitHub Repo Link">
            <input type="text" name="project_video_urls[]" placeholder="Video URL (YouTube/Cloud)">
            <input type="text" name="project_image_urls[]" placeholder="Thumbnail Image URL">
        </div>

        <textarea name="project_descriptions[]" placeholder="Project Description" rows="2" style="width: 100%; margin-bottom: 5px;"></textarea>
        <textarea name="project_code_snippets[]" placeholder="Code Snippet" rows="3" style="width: 100%;"></textarea>
    `;
  container.appendChild(newField);
});

document.addEventListener("click", function (e) {
  if (e.target.classList.contains("remove-skill")) {
    e.target.parentElement.remove();
  }
  if (e.target.classList.contains("remove-project")) {
    // Must remove the .project-entry div (the parent of the button's parent div)
    // Adjusting logic: The button is inside a div, which is inside .project-entry
    // Or if using the old structure, it was direct parent.
    // With new structure: Button -> Div -> .project-entry
    e.target.closest(".project-entry").remove();
  }
});

document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", function () {
    const targetId = this.dataset.target;
    const input = document.getElementById(targetId);
    if (input.type === "password") {
      input.type = "text";
      this.textContent = "🙈"; // Switch icon to hide
    } else {
      input.type = "password";
      this.textContent = "👁️"; // Switch icon to show
    }
  });
});
