// lesson13_expanded/static/js/random_forest.js (修改後)
document.addEventListener('DOMContentLoaded', () => {

    // *** 唯一的修改 ***
    const PREDICT_API_URL = '/rf/predict';
    const CHART_DATA_URL = '/rf/chart-data';
    // *****************

    // --- 1. 更新 DOM 元素選擇器 ---
    const slider1 = document.getElementById('feature1');
    const slider1Value = document.getElementById('feature1-value');
    const slider2 = document.getElementById('feature2');
    const slider2Value = document.getElementById('feature2-value');

    // (新) 預測結果的元素
    const riskPercentage = document.getElementById('risk-percentage');
    const riskProgress = document.getElementById('risk-progress');
    const riskLabel = document.getElementById('risk-label');
    const riskInterpretation = document.getElementById('risk-interpretation');

    const chartCtx = document.getElementById('scatterChart').getContext('2d');
    let scatterChart;

    // --- 2. 更新預測函式 ---
    async function updatePrediction() {
        const f1 = slider1.value;
        const f2 = slider2.value;

        try {
            const response = await fetch(`${PREDICT_API_URL}?f1=${f1}&f2=${f2}`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            const prob = data.prediction_probability; // 假設回傳 0-100

            // (新) 更新 UI (仿造 index.html 參考檔案)
            riskPercentage.textContent = `${prob.toFixed(1)}%`;
            riskProgress.style.width = `${prob}%`;

            // 根據機率更新顏色和文字
            if (prob >= 70) {
                // 高風險 (紅色)
                riskPercentage.style.color = '#dc3545';
                riskProgress.style.backgroundColor = '#dc3545';
                riskLabel.style.color = '#dc3545';
                riskLabel.textContent = "高風險";
                riskInterpretation.textContent = "建議立即進行關懷訪談";
            } else if (prob >= 40) {
                // 中度風險 (黃色)
                riskPercentage.style.color = '#ffc107';
                riskProgress.style.backgroundColor = '#ffc107';
                riskLabel.style.color = '#ffc107';
                riskLabel.textContent = "中度風險";
                riskInterpretation.textContent = "建議列入觀察名單";
            } else {
                // 低風險 (綠色)
                riskPercentage.style.color = '#28a745';
                riskProgress.style.backgroundColor = '#28a745';
                riskLabel.style.color = '#28a745';
                riskLabel.textContent = "低風險";
                riskInterpretation.textContent = "目前狀態穩定";
            }

        } catch (error) {
            console.error('Fetch error:', error);
            riskLabel.textContent = '預測失敗';
            riskInterpretation.textContent = '請檢查網路連線或後端服務';
        }
    }

    // --- 3. 滑桿事件監聽 (更新) ---
    function setupSliders() {
        slider1.addEventListener('input', () => {
            slider1Value.textContent = slider1.value;
            updatePrediction();
        });

        slider2.addEventListener('input', () => {
            slider2Value.textContent = slider2.value;
            updatePrediction();
        });
    }

    // --- 4. 繪製圖表 (修改) ---
    async function drawChart() {
        try {
            const response = await fetch(CHART_DATA_URL);
            const chartData = await response.json();

            const dataPoints = chartData.data;
            const turnoverNo = dataPoints.filter(d => d.turnover_numeric === 0)
                .map(d => ({ x: d.stress_workload_amount, y: d.stress_org_climate_grievance }));

            const turnoverYes = dataPoints.filter(d => d.turnover_numeric === 1)
                .map(d => ({ x: d.stress_workload_amount, y: d.stress_org_climate_grievance }));

            scatterChart = new Chart(chartCtx, {
                type: 'scatter',
                data: {
                    datasets: [
                        {
                            label: '未離職 (0)',
                            data: turnoverNo,
                            backgroundColor: 'rgba(0, 123, 255, 0.6)',
                            borderColor: 'rgba(0, 123, 255, 1)',
                            pointRadius: 5
                        },
                        {
                            label: '離職 (1)',
                            data: turnoverYes,
                            backgroundColor: 'rgba(220, 53, 69, 0.6)',
                            borderColor: 'rgba(220, 53, 69, 1)',
                            pointRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // <-- 關鍵：允許圖表填充 500px 的容器
                    scales: {
                        x: {
                            title: { display: true, text: chartData.x_label },
                            beginAtZero: true,
                            max: 5.5
                        },
                        y: {
                            title: { display: true, text: chartData.y_label },
                            beginAtZero: true,
                            max: 5.5
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    let label = context.dataset.label || '';
                                    if (label) label += ': ';
                                    label += `(${context.parsed.x}, ${context.parsed.y})`;
                                    return label;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Chart fetch error:', error);
        }
    }

    // --- 5. 初始化 ---
    setupSliders();
    drawChart();
    updatePrediction(); // 頁面載入時立即預測一次
});