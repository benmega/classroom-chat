/**
 * chartConfig.js
 * Centralized chart configuration and options for the Admin Dashboard.
 */

export const getChartConfig = (chartData) => {
    return {
        labels: chartData?.labels || [],
        datasets: [
            {
                label: 'Ducks Earned',
                data: chartData?.earned || [],
                borderColor: '#10b981', // --success-color
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
                    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
                    return gradient;
                },
                fill: true,
                tension: 0.5,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#10b981',
                pointBorderWidth: 3,
            },
            {
                label: 'Ducks Spent',
                data: chartData?.spent || [],
                borderColor: '#ef4444', // --error-color
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
                    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
                    return gradient;
                },
                fill: true,
                tension: 0.5,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#ef4444',
                pointBorderWidth: 3,
            }
        ]
    };
};

export const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { 
            position: 'top', 
            align: 'end',
            labels: { 
                usePointStyle: true, 
                boxWidth: 8,
                padding: 20,
                font: { size: 13, weight: '700', family: "'Outfit', sans-serif" } 
            } 
        },
        tooltip: { 
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 16, 
            borderRadius: 16, 
            titleFont: { size: 14, family: "'Outfit', sans-serif" },
            bodyFont: { size: 13, family: "'Inter', sans-serif" },
            displayColors: true,
            usePointStyle: true
        }
    },
    scales: {
        y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(241, 245, 249, 0.5)', drawBorder: false },
            ticks: { font: { weight: '600' }, color: '#64748b' }
        },
        x: { 
            grid: { display: false },
            ticks: { font: { weight: '600' }, color: '#64748b' }
        }
    }
};
