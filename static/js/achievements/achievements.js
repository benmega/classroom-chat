// achievements.js
export function initAchievements(username) {
    async function fetchAchievements() {
        try {
            const res = await fetch("/api/achievements/check");
            if (!res.ok) return;

            const data = await res.json();
//            console.log("Fetched achievements:", data.new_awards);

            if (!data.success || !data.new_awards.length) return;

            data.new_awards.forEach(a => showAchievement(a.name, a.badge));
        } catch (err) {
            console.error("Error fetching achievements:", err);
        }
    }

    // 👇 expose it globally so templates can call it
    window.fetchAchievements = fetchAchievements;

    function ensurePopupContainer() {
        let container = document.getElementById("achievement-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "achievement-container";
            document.body.appendChild(container);
        }
        return container;
    }

    function showAchievement(name, badge) {
        const container = ensurePopupContainer();

        const popup = document.createElement("div");
        popup.className = "achievement-popup";
        popup.innerHTML = `<img src="${badge}" width="32"> ${name}`;

        container.appendChild(popup);

        setTimeout(() => popup.classList.add("show"), 500);
        setTimeout(() => {
            popup.classList.remove("show");
            setTimeout(() => popup.remove(), 1000);
        }, 8000);
    }

    // Initial fetch + optional polling
    fetchAchievements();
    setInterval(fetchAchievements, 10000);
}
