// achievements.js
export function initAchievements(username) {
    async function fetchAchievements() {
        try {
            const res = await fetch("/api/achievements/check");
            if (!res.ok) return;
            const data = await res.json();
            if (!data.success || !data.new_awards.length) return;

            data.new_awards.forEach(a => showAchievement(a.name, a.badge));
        } catch (err) {
            console.error("Error fetching achievements:", err);
        }
    }

    function showAchievement(name, badge) {
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `<img src="${badge}" width="32"> ${name}`;
        document.body.appendChild(popup);

        setTimeout(() => popup.classList.add('show'), 50);
        setTimeout(() => popup.remove(), 4000);
    }

    // Initial fetch + optional polling
    fetchAchievements();
    setInterval(fetchAchievements, 60000);
}
