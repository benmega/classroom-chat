// duck-stats.js
document.addEventListener('DOMContentLoaded', function() {
    // Create the duck transactions chart
    const ctx = document.getElementById('duck-transactions-chart').getContext('2d');

    // Use the data from the window object (this would be populated from your backend)
    const { labels, earned, spent } = window.chartData;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ducks Earned',
                    data: earned,
                    backgroundColor: 'rgba(14, 178, 187, 0.7)', // Primary color with transparency
                    borderColor: 'rgba(14, 178, 187, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Ducks Spent',
                    data: spent,
                    backgroundColor: 'rgba(255, 215, 0, 0.7)', // Highlight color with transparency
                    borderColor: 'rgba(255, 215, 0, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 10
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            }
        }
    });

    // Optional: Fetch real-time duck transaction data
    function fetchDuckTransactionsData() {
        fetch(window.urls.duckTransactionsDataUrl)
            .then(response => response.json())
            .then(data => {
                // Update the chart with new data
                chart.data.labels = data.labels;
                chart.data.datasets[0].data = data.earned;
                chart.data.datasets[1].data = data.spent;
                chart.update();
            })
            .catch(error => console.error('Error fetching duck transactions data:', error));
    }

    // Uncomment to enable real-time updates every 5 minutes
    // setInterval(fetchDuckTransactionsData, 5 * 60 * 1000);
});