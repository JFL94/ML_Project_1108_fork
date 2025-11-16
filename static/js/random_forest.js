// G-02: 使用 IIFE (立即執行函式) 來避免汙染全域變數
(function () {

    document.addEventListener('DOMContentLoaded', () => {

        // 載入頁面時，執行這些既有函式
        loadModelInfo();
        loadChartData();

        // G-02: --- 新增表單處理邏輯 ---
        const predictionForm = document.getElementById('prediction-form');
        const resetButton = document.getElementById('reset-form-btn');
        const formMessage = document.getElementById('form-message');

        if (predictionForm) {
            // 監聽表單的 "submit" 事件
            predictionForm.addEventListener('submit', handleFormSubmit);
        }

        if (resetButton) {
            // 監聽 "重新輸入" 按鈕的 "click" 事件
            resetButton.addEventListener('click', resetForm);
        }
    });

    /**
     * G-02: 處理表單提交事件
     */
    async function handleFormSubmit(event) {
        event.preventDefault(); // 防止頁面重新載入
        const formMessage = document.getElementById('form-message');
        formMessage.textContent = ''; // 清除上一次的訊息
        formMessage.classList.remove('error', 'success');

        // 1. 獲取表單資料
        const employeeIdInput = document.getElementById('employee_id');
        const f1Input = document.getElementById('feature1');
        const f2Input = document.getElementById('feature2');

        const employeeId = employeeIdInput.value;
        const f1 = f1Input.value;
        const f2 = f2Input.value;

        // 2. 驗證 (雖然 HTML 有 required, JS 再次檢查更保險)
        if (!employeeId || !f1 || !f2) {
            formMessage.textContent = '所有欄位均為必填。';
            formMessage.classList.add('error');
            return;
        }

        // 3. 呼叫後端 API 進行預測
        try {
            // 使用 f1 和 f2 參數呼叫 /rf/predict
            const response = await fetch(`/rf/predict?f1=${f1}&f2=${f2}`);

            if (!response.ok) {
                throw new Error(`伺服器錯誤: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // 4. 將預測結果添加到報告表格中
            // 我們需要的是 data.prediction_class (0 或 1)
            addResultToReport(employeeId, f1, f2, data.prediction_class);

            // 5. 顯示成功訊息並清空表單
            formMessage.textContent = `員工 ${escapeHTML(employeeId)} 預測成功！`;
            formMessage.classList.add('success');
            resetForm(); // 呼叫 resetForm 來清空欄位

        } catch (error) {
            console.error('預測失敗:', error);
            formMessage.textContent = `預測失敗: ${error.message}`;
            formMessage.classList.add('error');
        }
    }

    /**
     * G-02: 將預測結果動態新增到表格
     */
    function addResultToReport(id, f1, f2, prediction) {
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return; // 防呆

        const newRow = document.createElement('tr'); // 建立一個新的 <tr>

        // 根據預測結果 (0 或 1) 賦予不同的 CSS class
        newRow.className = prediction === 1 ? 'result-positive' : 'result-negative';

        // 填入 HTML 內容
        newRow.innerHTML = `
            <td>${escapeHTML(id)}</td>
            <td>${escapeHTML(f1)}</td>
            <td>${escapeHTML(f2)}</td>
            <td>${prediction}</td>
        `;

        // 將新的一行插入到表格的最上方 (tbody 的第一個子元素)
        tableBody.prepend(newRow);
    }

    /**
     * G-02: 重設(清空)表單欄位
     */
    function resetForm() {
        const predictionForm = document.getElementById('prediction-form');
        if (predictionForm) {
            predictionForm.reset(); // 重設表單
        }
        // 將焦點移回第一個輸入框，方便使用者繼續輸入
        const employeeIdInput = document.getElementById('employee_id');
        if (employeeIdInput) {
            employeeIdInput.focus();
        }
    }

    /**
     * G-02: 輔助函式 - 防止簡易的 XSS 攻擊
     */
    function escapeHTML(str) {
        if (typeof str !== 'string') {
            str = String(str);
        }
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- G-02: 以下是您原本保留的函式 (無需修改) ---

    /**
     * 載入模型資訊 (保留)
     */
    async function loadModelInfo() {
        try {
            const response = await fetch('/rf/info');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // 評估指標
            document.getElementById('metric-recall').textContent = data.evaluation.recall;
            document.getElementById('metric-f1').textContent = data.evaluation.f1_score;
            document.getElementById('metric-auc').textContent = data.evaluation.auc;

            // 資料集資訊
            document.getElementById('info-dataset-name').textContent = data.dataset.name;
            document.getElementById('info-total-samples').textContent = data.dataset.total_samples;
            document.getElementById('info-train-size').textContent = data.dataset.train_size;
            document.getElementById('info-test-size').textContent = data.dataset.test_size;
            document.getElementById('info-target').textContent = data.dataset.target;

            // 圖表說明
            document.getElementById('chart-info-title').textContent = data.chart_info.title;
            // 使用 innerHTML 以便渲染 HTML 標籤 (例如 <span>)
            document.getElementById('chart-info-description').innerHTML = data.chart_info.description;

        } catch (error) {
            console.error('載入模型資訊時發生錯誤:', error);
            // 可以在此處顯示錯誤訊息
        }
    }

    /**
     * 載入並繪製圖表 (保留)
     */
    let scatterChart = null; // 儲存圖表實例
    let allDataPoints = []; // 儲存所有資料點

    async function loadChartData() {
        try {
            const response = await fetch('/rf/chart-data');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            allDataPoints = data.data; // 儲存所有資料

            const datasets = [
                {
                    label: '無離職傾向 (0)',
                    data: allDataPoints.filter(d => d.turnover_numeric === 0).map(d => ({ x: d.stress_workload_amount, y: d.stress_org_climate_grievance })),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointRadius: 5
                },
                {
                    label: '有離職傾向 (1)',
                    data: allDataPoints.filter(d => d.turnover_numeric === 1).map(d => ({ x: d.stress_workload_amount, y: d.stress_org_climate_grievance })),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    pointRadius: 5
                }
            ];

            drawScatterChart(datasets, data.x_label, data.y_label);
            setupChartFilters();

        } catch (error) {
            console.error('載入圖表資料時發生錯誤:', error);
        }
    }

    /**
     * 繪製圖表 (保留)
     */
    function drawScatterChart(datasets, xLabel, yLabel) {
        const ctx = document.getElementById('scatterChart');
        if (!ctx) return; // 防呆

        if (scatterChart) {
            scatterChart.destroy(); // 銷毀舊圖表
        }

        scatterChart = new Chart(ctx.getContext('2d'), {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: xLabel
                        },
                        min: 0.5,
                        max: 5.5,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: yLabel
                        },
                        min: 0.5,
                        max: 5.5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // 隱藏 Chart.js 的 legend, 使用自訂的
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += `(${context.parsed.x}, ${context.parsed.y})`;
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * 設定圖表篩選按鈕 (保留)
     */
    function setupChartFilters() {
        const buttons = document.querySelectorAll('.chart-filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除所有按鈕的 'active'
                buttons.forEach(b => b.classList.remove('active'));
                // 為當前按鈕添加 'active'
                btn.classList.add('active');

                let filteredData = [];
                if (btn.id === 'chart-filter-all') {
                    filteredData = allDataPoints;
                } else if (btn.id === 'chart-filter-no') {
                    filteredData = allDataPoints.filter(d => d.turnover_numeric === 0);
                } else if (btn.id === 'chart-filter-yes') {
                    filteredData = allDataPoints.filter(d => d.turnover_numeric === 1);
                }

                if (!scatterChart) return; // 防呆

                // 根據篩選後的資料更新圖表
                const datasets = [
                    {
                        label: '無離職傾向 (0)',
                        data: filteredData.filter(d => d.turnover_numeric === 0).map(d => ({ x: d.stress_workload_amount, y: d.stress_org_climate_grievance })),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        pointRadius: 5
                    },
                    {
                        label: '有離職傾向 (1)',
                        data: filteredData.filter(d => d.turnover_numeric === 1).map(d => ({ x: d.stress_workload_amount, y: d.stress_org_climate_grievance })),
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        pointRadius: 5
                    }
                ];

                // 只顯示有資料的 dataset
                scatterChart.data.datasets = datasets.filter(ds => ds.data.length > 0);
                scatterChart.update();
            });
        });
    }

})(); // G-02: IIFE 結束