/**
 * 危老重建「地主自建」卡關評估與調整建議系統 - Core JavaScript
 * 包含：表單控制、財務估算引擎、SVG雷達圖渲染、動態對策生成與壓力測試
 */

document.addEventListener('DOMContentLoaded', () => {
    // === DOM 元素獲取 ===
    const welcomeSection = document.getElementById('section-welcome');
    const formSection = document.getElementById('section-form');
    const reportSection = document.getElementById('section-report');
    
    const btnStart = document.getElementById('btn-start');
    const btnPrint = document.getElementById('btn-print');
    const btnReassess = document.getElementById('btn-reassess');
    
    const formPanels = document.querySelectorAll('.form-step-panel');
    const steps = document.querySelectorAll('.step');
    const btnNexts = document.querySelectorAll('.btn-next');
    const btnPrevs = document.querySelectorAll('.btn-prev');
    const assessmentForm = document.getElementById('assessment-form');

    // 滑桿與其數值顯示
    const sliders = [
        { id: 'score-capital', valId: 'val-capital' },
        { id: 'score-integration', valId: 'val-integration' },
        { id: 'score-construction', valId: 'val-construction' },
        { id: 'score-professional', valId: 'val-professional' },
        { id: 'score-regulation', valId: 'val-regulation' }
    ];

    let currentStep = 1;

    // ==========================================================================
    // 1. 互動與表單流程控制
    // ==========================================================================

    // 初始化滑桿數值監聽
    sliders.forEach(slider => {
        const el = document.getElementById(slider.id);
        const valEl = document.getElementById(slider.valId);
        if (el && valEl) {
            el.addEventListener('input', () => {
                valEl.textContent = el.value;
                // 動態調整滑桿數值的顏色或大小（微互動）
                if (el.value >= 4) {
                    valEl.style.backgroundColor = 'var(--color-danger)';
                    valEl.style.boxShadow = '0 0 10px var(--color-danger-glow)';
                } else if (el.value == 3) {
                    valEl.style.backgroundColor = 'var(--color-gold)';
                    valEl.style.boxShadow = '0 0 10px var(--color-gold-glow)';
                } else {
                    valEl.style.backgroundColor = 'var(--color-success)';
                    valEl.style.boxShadow = '0 0 10px var(--color-success-glow)';
                }
            });
            // 觸發一次初始化
            el.dispatchEvent(new Event('input'));
        }
    });

    // 開始評估按鈕
    btnStart.addEventListener('click', () => {
        welcomeSection.classList.remove('active');
        formSection.classList.add('active');
        goToStep(1);
    });

    // 重新評估按鈕
    btnReassess.addEventListener('click', () => {
        reportSection.classList.remove('active');
        formSection.classList.add('active');
        goToStep(1);
    });

    // 列印按鈕
    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // 步驟導覽按鈕
    btnNexts.forEach(btn => {
        btn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                currentStep++;
                goToStep(currentStep);
            }
        });
    });

    btnPrevs.forEach(btn => {
        btn.addEventListener('click', () => {
            currentStep--;
            goToStep(currentStep);
        });
    });

    // 表單提交處理
    assessmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 獲取並計算報告數據
        const data = gatherFormData();
        const results = calculateRenewal(data);
        
        // 渲染報告
        renderReport(data, results);
        
        // 切換區塊
        formSection.classList.remove('active');
        reportSection.classList.add('active');
        
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 跳轉到指定步驟
    function goToStep(stepNum) {
        currentStep = stepNum;
        
        // 切換面板
        formPanels.forEach(panel => {
            panel.classList.remove('active');
            if (parseInt(panel.dataset.panel) === stepNum) {
                panel.classList.add('active');
            }
        });

        // 更新步驟指示器樣式
        steps.forEach(step => {
            const num = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');
            if (num === stepNum) {
                step.classList.add('active');
            } else if (num < stepNum) {
                step.classList.add('completed');
            }
        });
    }

    // 欄位驗證
    function validateStep(stepNum) {
        const panel = document.querySelector(`.form-step-panel[data-panel="${stepNum}"]`);
        const inputs = panel.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value) {
                isValid = false;
                input.classList.add('invalid');
                // 焦點移到第一個無效欄位
                input.focus();
            } else {
                input.classList.remove('invalid');
            }
        });

        return isValid;
    }


    // ==========================================================================
    // 2. 財務與容積計算引擎 (Calculation Engine)
    // ==========================================================================

    function gatherFormData() {
        return {
            location: document.getElementById('input-location').value,
            area: parseFloat(document.getElementById('input-area').value),
            zoneType: parseFloat(document.getElementById('input-zone-type').value),
            incentive: parseFloat(document.getElementById('input-incentive').value),
            landowners: parseInt(document.getElementById('input-landowners').value),
            progress: document.getElementById('input-progress').value,
            
            // 卡關分數
            scoreCapital: parseInt(document.getElementById('score-capital').value),
            scoreIntegration: parseInt(document.getElementById('score-integration').value),
            scoreConstruction: parseInt(document.getElementById('score-construction').value),
            scoreProfessional: parseInt(document.getElementById('score-professional').value),
            scoreRegulation: parseInt(document.getElementById('score-regulation').value),
            
            // 財務參數
            buildCost: parseFloat(document.getElementById('input-build-cost').value),
            otherCostRatio: parseFloat(document.getElementById('input-other-cost-ratio').value),
            financeRate: parseFloat(document.getElementById('input-finance-rate').value),
            years: parseFloat(document.getElementById('input-construction-years').value),
            selfRatio: parseFloat(document.getElementById('input-self-ratio').value)
        };
    }

    function calculateRenewal(data) {
        // A. 容積估算
        // 基準容積坪 = 基地面積 * 基準容積率
        const baseFloor = data.area * (data.zoneType / 100);
        // 容積獎勵增坪 = 基準容積坪 * 容積獎勵比例
        const bonusFloor = baseFloor * (data.incentive / 100);
        // 預估總興建面積 (銷坪) = (基準容積坪 + 容積獎勵增坪) * 1.6 (公設與免計容積乘數)
        const totalBuildFloor = (baseFloor + bonusFloor) * 1.6;
        // 免計容積與公設坪數
        const freeFloor = totalBuildFloor - (baseFloor + bonusFloor);

        // B. 財務估算 (總造價模型)
        // 1. 純營建費用 = 總興建面積 * 營建單價
        const pureBuildCost = totalBuildFloor * data.buildCost;
        // 2. 設計規劃、信託及行政規費 = 純營建費 * 規費比例
        const adminCost = pureBuildCost * (data.otherCostRatio / 100);
        
        // 3. 開發期融資利息計算
        // 融資額度為 (純營建費 + 規費) * (1 - 地主期初自籌比例)
        const financeRatio = 1 - (data.selfRatio / 100);
        const estimatedFinancePrincipal = (pureBuildCost + adminCost) * financeRatio;
        // 由於利息是依據工期分批動撥，平均動撥率以 50% 估算 (折半計息模型)
        const interestCost = estimatedFinancePrincipal * (data.financeRate / 100) * data.years * 0.5;

        // 重建總成本 (總造價)
        const totalCost = pureBuildCost + adminCost + interestCost;
        
        // 地主自籌總額
        const selfTotal = totalCost * (data.selfRatio / 100);
        // 銀行融資總額
        const financeTotal = totalCost * (1 - (data.selfRatio / 100));
        // 戶均需籌措資金
        const avgCost = totalCost / data.landowners;

        return {
            baseFloor: Math.round(baseFloor * 100) / 100,
            bonusFloor: Math.round(bonusFloor * 100) / 100,
            freeFloor: Math.round(freeFloor * 100) / 100,
            totalBuildFloor: Math.round(totalBuildFloor * 100) / 100,
            pureBuildCost: Math.round(pureBuildCost),
            adminCost: Math.round(adminCost),
            interestCost: Math.round(interestCost),
            totalCost: Math.round(totalCost),
            selfTotal: Math.round(selfTotal),
            financeTotal: Math.round(financeTotal),
            avgCost: Math.round(avgCost * 10) / 10
        };
    }


    // ==========================================================================
    // 3. 報告渲染與 SVG 雷達圖生成 (Report & Radar Chart Rendering)
    // ==========================================================================

    function renderReport(data, results) {
        // 1. 卡關危險指數計算與渲染
        const totalScore = data.scoreCapital + data.scoreIntegration + data.scoreConstruction + data.scoreProfessional + data.scoreRegulation;
        // 最小5分，最大25分。轉為百分比：(得分 - 5) / 20 * 100
        const riskPercentage = Math.round(((totalScore - 5) / 20) * 100);
        
        const gaugeScoreEl = document.getElementById('gauge-score');
        const riskTitleEl = document.getElementById('risk-title');
        const riskSummaryEl = document.getElementById('risk-summary');
        const gaugeCircle = document.querySelector('.risk-gauge-circle');

        gaugeScoreEl.textContent = `${riskPercentage}%`;
        
        // 設定進度條圓圈 Conic Gradient
        let riskColor = 'var(--color-success)';
        let riskText = '輕微障礙 (持續推進)';
        let riskSummary = '您的重建計畫目前卡關情形尚屬輕微。地主自建的主導權仍穩固，建議針對個別弱點補強，維持當前團隊的推進節奏。';

        if (riskPercentage >= 80) {
            riskColor = 'var(--color-danger)';
            riskText = '極度危險 (面臨停擺)';
            riskSummary = '您的案件面臨嚴重的系統性卡關！目前的資金、整合與營造等條件極不樂觀。強烈建議「暫停自建發包」，尋求建經公司全案託管，或評估「轉向與建商合建」以規避破產或爛尾風險。';
        } else if (riskPercentage >= 50) {
            riskColor = 'var(--color-warning)';
            riskText = '中度卡關 (結構調整)';
            riskSummary = '本案已出現明顯阻礙，尤其是資金籌措或地主整合方面。現有非專業地主自組的架構難以突破，建議積極委託第三方專業機構（如全案管理 PCM 或建經公司）進行架構微調。';
        }

        gaugeCircle.style.setProperty('--gauge-color', riskColor);
        gaugeCircle.style.background = `conic-gradient(${riskColor} ${riskPercentage}%, rgba(255, 255, 255, 0.05) ${riskPercentage}%)`;
        riskTitleEl.textContent = riskText;
        riskTitleEl.className = ''; // 清除舊 class
        riskTitleEl.classList.add(riskPercentage >= 80 ? 'text-danger' : (riskPercentage >= 50 ? 'text-gold' : 'text-success'));
        riskSummaryEl.textContent = riskSummary;

        // 2. 繪製 SVG 雷達圖
        drawRadarChart(data);

        // 3. 渲染重建財務資訊
        document.getElementById('calc-base-floor').textContent = results.baseFloor.toLocaleString();
        document.getElementById('calc-total-floor').textContent = results.totalBuildFloor.toLocaleString();
        document.getElementById('calc-total-cost').textContent = results.totalCost.toLocaleString();
        document.getElementById('calc-avg-cost').textContent = results.avgCost.toLocaleString();

        // 4. 財務與容積細部清單 (Accordian Table)
        document.getElementById('row-base-floor-val').textContent = `${results.baseFloor.toLocaleString()} 坪`;
        document.getElementById('row-free-floor-val').textContent = `${results.freeFloor.toLocaleString()} 坪`;
        document.getElementById('row-bonus-floor-val').textContent = `${results.bonusFloor.toLocaleString()} 坪`;
        document.getElementById('row-bonus-desc').textContent = `容積獎勵 ${data.incentive}% (基準之增坪)`;
        document.getElementById('row-total-floor-val').innerHTML = `<strong>${results.totalBuildFloor.toLocaleString()} 坪</strong>`;
        
        document.getElementById('row-build-cost-unit').textContent = `${data.buildCost} 萬/坪`;
        document.getElementById('row-build-cost-total').textContent = `${results.pureBuildCost.toLocaleString()} 萬元`;
        
        document.getElementById('row-admin-cost-ratio').textContent = `${data.otherCostRatio}%`;
        document.getElementById('row-admin-cost-total').textContent = `${results.adminCost.toLocaleString()} 萬元`;
        
        document.getElementById('row-interest-rate-val').textContent = `${data.financeRate}%`;
        document.getElementById('row-interest-total').textContent = `${results.interestCost.toLocaleString()} 萬元`;
        
        document.getElementById('row-total-cost-total').innerHTML = `<strong>${results.totalCost.toLocaleString()} 萬元</strong>`;
        
        document.getElementById('row-self-ratio-val').textContent = `${data.selfRatio}%`;
        document.getElementById('row-self-total').textContent = `${results.selfTotal.toLocaleString()} 萬元`;
        
        document.getElementById('row-finance-ratio-val').textContent = `${100 - data.selfRatio}%`;
        document.getElementById('row-finance-total').textContent = `${results.financeTotal.toLocaleString()} 萬元`;

        // 5. 動態產生卡關對策建議
        generateStrategies(data, results);

        // 6. 營造成本壓力測試
        generatePressureTest(data, results);

        // 7. 生成行動指南 Check list
        generateActionPlan(data);
    }

    // 繪製 SVG 雷達圖的核心邏輯
    function drawRadarChart(data) {
        const svg = document.getElementById('radar-chart');
        svg.innerHTML = ''; // 清空舊內容

        const width = 400;
        const height = 400;
        const cx = width / 2;
        const cy = height / 2;
        const radius = 120; // 最大半徑 (對應5分)
        const levels = 5;   // 5圈網格
        
        const axes = [
            { label: '資金與融資', key: 'scoreCapital' },
            { label: '地主整合', key: 'scoreIntegration' },
            { label: '營造成本', key: 'scoreConstruction' },
            { label: '專業與管理', key: 'scoreProfessional' },
            { label: '法規與基地', key: 'scoreRegulation' }
        ];
        const numAxes = axes.length;

        // 計算頂點角度
        const getAngle = (i) => (i * 2 * Math.PI) / numAxes - Math.PI / 2;

        // 1. 繪製五角形背景網格
        for (let l = 1; l <= levels; l++) {
            const r = (l / levels) * radius;
            const points = [];
            for (let i = 0; i < numAxes; i++) {
                const angle = getAngle(i);
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                points.push(`${x},${y}`);
            }
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', points.join(' '));
            polygon.setAttribute('class', 'radar-grid');
            svg.appendChild(polygon);
        }

        // 2. 繪製軸線與文字標籤
        axes.forEach((axis, i) => {
            const angle = getAngle(i);
            // 軸線
            const xLine = cx + radius * Math.cos(angle);
            const yLine = cy + radius * Math.sin(angle);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', cx);
            line.setAttribute('y1', cy);
            line.setAttribute('x2', xLine);
            line.setAttribute('y2', yLine);
            line.setAttribute('class', 'radar-axis');
            svg.appendChild(line);

            // 標籤文字 (稍微偏移半徑以避免重合)
            const labelDist = radius + 22;
            const xLabel = cx + labelDist * Math.cos(angle);
            let yLabel = cy + labelDist * Math.sin(angle);
            
            // 對於底部的標籤，文字微調避免被切掉
            if (angle === Math.PI / 2) yLabel += 5;

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', xLabel);
            text.setAttribute('y', yLabel);
            text.setAttribute('class', 'radar-label');
            
            // 根據角度調整文字對齊方式
            if (Math.cos(angle) > 0.1) {
                text.setAttribute('text-anchor', 'start');
            } else if (Math.cos(angle) < -0.1) {
                text.setAttribute('text-anchor', 'end');
            } else {
                text.setAttribute('text-anchor', 'middle');
            }
            
            text.textContent = axis.label;
            svg.appendChild(text);
        });

        // 3. 繪製數據多邊形 (Data Polygon)
        const dataPoints = [];
        axes.forEach((axis, i) => {
            const score = data[axis.key];
            const r = (score / 5) * radius;
            const angle = getAngle(i);
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            dataPoints.push(`${x},${y}`);
        });

        // 數據多邊形
        const polyData = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polyData.setAttribute('points', dataPoints.join(' '));
        polyData.setAttribute('class', 'radar-poly-data');
        svg.appendChild(polyData);

        // 4. 繪製數據頂點圓圈 (Data Points)
        axes.forEach((axis, i) => {
            const score = data[axis.key];
            const r = (score / 5) * radius;
            const angle = getAngle(i);
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '4.5');
            circle.setAttribute('class', 'radar-point');
            
            // 新增一個 tooltip 方便查看數值
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${axis.label}: ${score} 分`;
            circle.appendChild(title);
            
            svg.appendChild(circle);
        });
    }

    // ==========================================================================
    // 4. 改善對策與壓力測試生成邏輯
    // ==========================================================================

    const strategyTemplates = {
        scoreCapital: {
            title: '導入信託管理與全案融資方案',
            icon: 'fa-coins',
            color: 'var(--color-danger)',
            desc: '地主自主籌措前期資金（如設計費、規費、估價費等）往往十分困難，且缺乏大型建商的資信用以爭取低利土建融，導致銀行因風險考量不予放貸。',
            actions: [
                '與專業信託銀行合作：將土地及重建資金交付信託專戶，實施「專款專用」，取得銀行對「信託資產」的融資支持。',
                '尋找「建經公司」提供續建承諾：由建經公司擔任第三方評估機構，提供銀行「續建保證」，能大幅提升土建融成數並降低利率。',
                '前期費用「全案代垫」模式：評估尋找能代墊前期規劃與設計規費的 PCM (全案管理) 顧問公司，完工後以銀行首期動撥之營造融資返還。',
                '評估轉向「合建」或「委建」：若地主資信極差、融資成數過低，建議改採合建分屋，由建商負擔所有營建資金，降低地主財務壓力。'
            ]
        },
        scoreIntegration: {
            title: '推動公正第三方估價與公開分配公式',
            icon: 'fa-users-gear',
            color: 'var(--color-gold)',
            desc: '地主對於「分配坪數」與「權利價值」有歧見是自建卡關最常見的因。低樓層（店面）與高樓層地主各執一詞，缺乏互信且對未來房屋價值看法分歧。',
            actions: [
                '委託 2~3 家獨立「不動產估價師事務所」：由估價師對更新前後的權利價值進行估價，以決定公平的分配比例（權利變換機制）。',
                '建立「公開選配規則」：制定透明的「選配規則」（例如：同樓層原地主優先選配、多戶重疊時抽籤或補貼差額機制），杜絕黑箱疑慮。',
                '推動專案信託與地主合約約定：向疑慮地主說明「信託」的意義：地主自建不等於個人債務風險，所有土地已交付信託，任何人的債務不影響基地安全。',
                '針對關鍵反對地主協商變通方案：若有少數高齡或弱勢地主，可提供「分回小坪數並套現」或由重建專戶承擔部分補貼的機制。'
            ]
        },
        scoreConstruction: {
            title: '採成本加利潤發包與調整建材工法',
            icon: 'fa-trowel-bricks',
            color: 'var(--color-gold)',
            desc: '近年營造市場物料與人工成本大漲，加上地主自建多屬單一中小型案場，不具備大量發包優勢，營造廠普遍不願承接「總價承包」的合約。',
            actions: [
                '改採「成本加成管理費 (Cost-Plus)」合約：與中小型且信譽優良的營造廠合作，地主負擔實際材料成本，營造廠賺取固定%管理費，降低營造廠倒閉爛尾風險。',
                '委由「建經公司/PCM」統籌發包：利用 PCM 或建經公司的供應鏈資源進行聯合發包，避免單一地主去面對營造廠而被抬高報價。',
                '進行「價值工程 (Value Engineering)」調整：請建築師優化結構與建材等級，例如避免複雜的逆打工法、過度的地下室開挖，或在合理範圍內調整高昂的外牆建材。',
                '建立合理的「造價準備金」：在財務計畫中，主動提撥總營造預算 10%~15% 的物價波動準備金，避免施工中途因缺錢停工。'
            ]
        },
        scoreProfessional: {
            title: '委託全案管理 (PCM) 與重建推動團隊',
            icon: 'fa-user-tie',
            color: 'var(--color-success)',
            desc: '地主自建全由地主自組的更新委員會決策，但成員多無建築、法律、財務專長，導致審查建商合約、變更設計等程序耗費數倍時間，效率低下。',
            actions: [
                '聘任「全案管理 (PCM)」顧問公司：由專業經理人協助管理建築設計、招標營造廠、工期監督、建管程序，地主僅負責最高層級的決策。',
                '引進「危老重建推動師」或專業公會：尋求各縣市政府設立之危老推動師或都更建經公會，從旁輔導以導正錯誤的法規概念。',
                '精簡委員會決策層級：限制重建委員會的規模，並獲得全體地主出具「一定額度內決策授權」，避免每件公務都要召開全體大會討論。'
            ]
        },
        scoreRegulation: {
            title: '申請基地細部變更與鄰地協商替代方案',
            icon: 'fa-scale-balanced',
            color: 'var(--color-success)',
            desc: '基地面積過小、形狀畸零，導致無法獲得最高危老時程與規模獎勵，或因鄰地不願合併、私設通路或消防退縮限制，導致重建後建坪大幅縮水。',
            actions: [
                '尋求政府「重建專案協調」機制：若涉及鄰地畸零或合併問題，向各縣市都更局/處申請協調，尋求強迫買收、或專案合併之救濟方案。',
                '果斷採取「獨立重建」之設計替代方案：若鄰地耗費數年仍無共識，應避免時程獎勵持續遞減，請建築師重新規劃獨立重建設計，雖然建坪少，但能盡快動工。',
                '活用其他容積獎勵項目：除了危老本體，評估「無障礙空間」、「耐震標章」、「綠建築」等法規容獎項目，彌補因面積流失的坪數。'
            ]
        }
    };

    function generateStrategies(data, results) {
        const container = document.getElementById('strategies-container');
        container.innerHTML = ''; // 清空舊內容

        // 收集各個維度得分，並按分數從高到低排序
        const scores = [
            { key: 'scoreCapital', label: '資金與融資', score: data.scoreCapital },
            { key: 'scoreIntegration', label: '地主整合', score: data.scoreIntegration },
            { key: 'scoreConstruction', label: '營造成本', score: data.scoreConstruction },
            { key: 'scoreProfessional', label: '專業與管理', score: data.scoreProfessional },
            { key: 'scoreRegulation', label: '法規與基地', score: data.scoreRegulation }
        ];

        scores.sort((a, b) => b.score - a.score);

        // 找出所有大於等於 3 分的項目（或是最高的前2項）
        const activeStrategies = scores.filter(s => s.score >= 3);
        
        // 如果大家分數都很低，就取最高的那一個
        if (activeStrategies.length === 0) {
            activeStrategies.push(scores[0]);
        }

        // 限額渲染，最多顯示 3 張策略卡片，避免過多
        const renderList = activeStrategies.slice(0, 3);

        renderList.forEach(item => {
            const template = strategyTemplates[item.key];
            if (!template) return;

            const card = document.createElement('div');
            card.className = 'strategy-card';
            card.style.setProperty('--card-accent', template.color);
            
            // 拼接 HTML
            card.innerHTML = `
                <div class="strategy-header">
                    <div class="strategy-header-title">
                        <div class="icon-wrapper" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 50%; color: ${template.color}; font-size: 1.25rem;">
                            <i class="fa-solid ${template.icon}"></i>
                        </div>
                        <div>
                            <h4>${template.title}</h4>
                            <span class="text-muted" style="font-size: 0.8rem; font-weight: 500;">診斷面向：${item.label}</span>
                        </div>
                    </div>
                    <span class="strategy-score-badge">卡關程度: ${item.score} / 5</span>
                </div>
                <div class="strategy-content">
                    <div class="strategy-pain-points">
                        <h5>痛點分析</h5>
                        <p>${template.desc}</p>
                    </div>
                    <div class="strategy-actions-list">
                        <h5>調整對策與解方</h5>
                        <ul>
                            ${template.actions.map(act => `<li>${act}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // 營造成本壓力測試敏感度分析
    function generatePressureTest(data, results) {
        const tbody = document.querySelector('#pressure-test-table tbody');
        tbody.innerHTML = ''; // 清空

        // 上漲百分比
        const rates = [0, 0.1, 0.2, 0.3];

        rates.forEach(rate => {
            // 計算在此漲幅下的數值
            // 每坪純營造單價
            const newBuildCostUnit = data.buildCost * (1 + rate);
            
            // 純營建費用
            const newPureBuildCost = results.totalBuildFloor * newBuildCostUnit;
            // 規劃、信託及行政規費 = 純營建費 * 規費比例
            const newAdminCost = newPureBuildCost * (data.otherCostRatio / 100);
            // 融資額度
            const financeRatio = 1 - (data.selfRatio / 100);
            const estimatedFinancePrincipal = (newPureBuildCost + newAdminCost) * financeRatio;
            // 折半計息利息
            const newInterestCost = estimatedFinancePrincipal * (data.financeRate / 100) * data.years * 0.5;
            
            // 總造價
            const newTotalCost = newPureBuildCost + newAdminCost + newInterestCost;
            
            // 總成本增加額
            const costIncrease = newTotalCost - results.totalCost;
            
            // 地主戶均多負擔
            const avgIncrease = costIncrease / data.landowners;

            // 建議防範對策文字
            let suggestion = '基準數據，無變動。';
            if (rate === 0.1) {
                suggestion = '<strong>提撥準備金</strong>：一般在容許誤差內。建議由重建專戶提撥 10% 作為物價波動預備金。';
            } else if (rate === 0.2) {
                suggestion = '<strong>調整建材/導入建經</strong>：建議進行價值工程 (VE) 評估，微調次要建材等級以抑制總價，並尋找建經公司提供聯合採購。';
            } else if (rate === 0.3) {
                suggestion = '<strong>重整財務/轉合建</strong>：極大財務衝擊！地主需增資或向銀行辦理「超額融資」。此階段應評估改走合建，或將部分坪數於期初預售以籌措資金。';
            }

            const tr = document.createElement('tr');
            if (rate === 0) {
                tr.className = 'table-divider';
            }
            
            tr.innerHTML = `
                <td><strong>${rate === 0 ? '基準造價 (0%)' : `上漲 +${Math.round(rate * 100)}%`}</strong></td>
                <td>${Math.round(newBuildCostUnit * 10) / 10} 萬/坪</td>
                <td><strong>${Math.round(newTotalCost).toLocaleString()}</strong> 萬元</td>
                <td class="${rate > 0 ? 'text-danger' : ''}">${rate === 0 ? '-' : `+${Math.round(costIncrease).toLocaleString()} 萬元`}</td>
                <td class="${rate > 0 ? 'text-danger' : ''}"><strong>${rate === 0 ? '-' : `+${Math.round(avgIncrease * 10) / 10} 萬元`}</strong></td>
                <td>${suggestion}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    function generateActionPlan(data) {
        const container = document.getElementById('action-plan-container');
        container.innerHTML = ''; // 清空

        // 基本行動（所有案件都需要）
        const actions = [
            {
                title: '召開地主說明會，凝聚共識',
                desc: '將初步的財務估算與診斷結果與地主共享，向大家揭露自建的預算門檻與自籌款比例。'
            },
            {
                title: '委託合規的危老推動師或都更經紀團隊進場輔導',
                desc: '引進公正第三方專業人員，協助審查法規，建立基本的互信溝通橋樑。'
            }
        ];

        // 根據卡關分數動態增加建議
        if (data.scoreCapital >= 3) {
            actions.push({
                title: '尋求建經公司進行前期費用代墊與融資諮詢',
                desc: '因資金與融資卡關，應優先與信託銀行及建經公司洽談，爭取全案信託與續建承諾，以取得高成數土建融。'
            });
        }
        if (data.scoreIntegration >= 3) {
            actions.push({
                title: '委託獨立估價師進行更新前後權值估算與選配規則擬定',
                desc: '地主間對分配比例看法分歧，應由 2-3 家公正第三方估價師事務所重新評估，以權利變換之精神作為分配基礎。'
            });
        }
        if (data.scoreConstruction >= 3) {
            actions.push({
                title: '進行價值工程研商與成本加成發包準備',
                desc: '因應營造成本高漲，應請建築師優化工法與建材等級，並考慮與營造廠簽署成本加成管理費 (Cost-Plus) 合約。'
            });
        }

        actions.forEach((act, idx) => {
            const item = document.createElement('div');
            item.className = 'action-item';
            item.innerHTML = `
                <div class="action-checkbox-wrapper">
                    <input type="checkbox" id="action-chk-${idx}" class="action-checkbox">
                    <label for="action-chk-${idx}" class="action-title">${act.title}</label>
                </div>
                <p class="action-desc">${act.desc}</p>
            `;
            container.appendChild(item);
        });
    }

    // === 地主選配衝突協商試算器核心邏輯 ===
    function solveConflict() {
        // 1. 獲取輸入參數
        const conflictUnit = document.getElementById('conflict-unit').value;
        const conflictValue = parseFloat(document.getElementById('conflict-value').value) || 3000;
        const mode = document.getElementById('conflict-mode').value;
        
        const nameA = document.getElementById('landowner-a-name').value || "林美純";
        const totalA = parseFloat(document.getElementById('landowner-a-total').value) || 4500;
        const bidA = parseFloat(document.getElementById('landowner-a-bid').value) || 0;
        
        const nameB = document.getElementById('landowner-b-name').value || "陳政助";
        const totalB = parseFloat(document.getElementById('landowner-b-total').value) || 3500;
        const bidB = parseFloat(document.getElementById('landowner-b-bid').value) || 0;

        const winnerBadge = document.getElementById('conflict-winner-badge');
        const winDesc = document.getElementById('conflict-win-desc');

        // 單價設定 (萬/坪)
        const p10Price = 150.55; 
        const p2Price = 141.55;  
        
        if (mode === 'premium-p2') {
            // === 方案 A: 頂樓全拿打通 + 退至 2 樓現金補償 (林美純/陳政助卡關專用) ===
            const a10Area = 49;  // 林美純選滿 10樓 49 坪
            const bDesiredArea = 22.67; // 陳政助原本想選的坪數
            
            // 1. 官方樓層價差 (10樓與2樓單價差: 9萬/坪)
            const priceDiffPerPing = p10Price - p2Price; // 9 萬/坪
            const officialValueDiff = Math.round(bDesiredArea * priceDiffPerPing); // 22.67 * 9 = 204 萬元
            
            // 2. 二樓市場抗性之折讓補償 (以2樓官方總價 22.67坪 * 141.55萬 = 3209萬 之 8% 估算)
            const p2OfficialTotal = bDesiredArea * p2Price; // 3208.9 萬元
            const marketDiscountCompensation = Math.round(p2OfficialTotal * 0.08); // 約 257 萬元
            
            // 林美純應支付陳政助的現金補償金
            const fairPremiumPay = marketDiscountCompensation; // 257 萬元

            // 3. 雙方都更帳戶權值計算
            // 林美純選滿 10 樓 (49 坪)，消耗都更權值 49 * 150.55 = 7377 萬。
            const a10Cost = Math.round(a10Area * p10Price); // 7377 萬
            const aRemain = totalA - a10Cost; // -2877 萬 (林美純需自備找補給專戶)

            // 陳政助退至 2 樓選 22.67 坪，消耗都更權值 22.67 * 141.55 = 3209 萬。
            const b2Cost = Math.round(bDesiredArea * p2Price); 
            // 陳政助剩餘可用權值 (原 3500 萬 - 2樓 3209 萬 = 291 萬)
            const bRemain = totalB - b2Cost; 

            // 陳政助實際獲得總資產 = 2樓新屋價值 + 獲得之現金補償
            const bActualTotal = b2Cost + fairPremiumPay;

            // 4. 更新 UI 狀態
            winnerBadge.textContent = `方案 A 判定：林美純全拿 10 樓，補償退讓至 2 樓的陳政助`;
            winnerBadge.style.background = 'var(--color-gold)';
            winnerBadge.style.boxShadow = '0 0 10px var(--color-gold-glow)';
            
            winDesc.innerHTML = `經評估，建築師規劃之 10 樓具打通合併之結構可行性。由 <strong>${nameA}</strong> 選滿 10 樓共 <strong>${a10Area} 坪</strong> 獨佔打通使用；<strong>${nameB}</strong> 同意讓步退至 2 樓選配 <strong>${bDesiredArea} 坪</strong>。<br>為公平補償陳政助，林美純需額外支付 <strong>現金補償金 ${fairPremiumPay} 萬元</strong> (以2樓官方造價的 8% 補貼其市場抗性與樓層差)。`;

            // 得標者卡片 (林美純)
            document.getElementById('winner-result-title').textContent = `${nameA} (獨佔 10 樓全層)`;
            document.getElementById('win-unit-name').textContent = `10樓全層 (打通合併共 ${a10Area} 坪)`;
            document.getElementById('win-total-cost').textContent = a10Cost.toLocaleString();
            document.getElementById('win-cost-formula').textContent = "(獨佔打通，補償陳政助)";
            document.getElementById('win-premium-pay').textContent = fairPremiumPay.toLocaleString();
            document.getElementById('win-remain-val').textContent = aRemain.toLocaleString();

            // 退讓者卡片 (陳政助)
            document.getElementById('loser-result-title').textContent = `${nameB} (讓步至 2 樓)`;
            document.getElementById('lose-unit-name').textContent = `2樓選配戶 (${bDesiredArea} 坪)`;
            document.getElementById('lose-premium-get').textContent = fairPremiumPay.toLocaleString();
            document.getElementById('lose-actual-val').textContent = bActualTotal.toLocaleString();
            document.getElementById('lose-remain-val').textContent = bRemain.toLocaleString();

            // 5. 生成公平補償 MOU
            const mouText = `都市更新/危老重建 地主選配讓步與公平補償協議書 (草案)

立協議書人：
甲方（退讓方）：${nameB} (陳政助)
乙方（得標方）：${nameA} (林美純)

緣甲、乙雙方同為本都市更新/危老重建計畫之土地所有權人，因重建後新建物「10樓（規劃3戶，總面積49坪，具備打通可行性）」發生選配重疊衝突。因乙方有選滿10樓打通之強烈意願，而甲方原規劃自住頂樓、堅決不願選配2樓。為求全體地主重建計畫順利推動，經雙方善意協商，同意依據「樓層官方差額」與「二樓市場劣勢折讓」之量化基礎，達成以下公平補償協議：

一、目標樓層選配與讓步：
    1. 乙方【林美純】選配取得 10 樓全層（共 49 坪，官方總核估值 ${a10Cost} 萬元），並保留未來打通合併使用之權利。
    2. 甲方【陳政助】同意退讓，改為選配 2 樓房屋（面積 ${bDesiredArea} 坪，官方核估值 ${b2Cost} 萬元）。

二、量化公平補償金約定：
    雙方同意由乙方【林美純】以現金額外支付甲方【陳政助】新台幣【${fairPremiumPay}】萬元整（下稱補償金），其計算公式依據如下：
    - 二樓市場劣勢特別折讓補償：以2樓官方總價 (${bDesiredArea}坪 × 141.55萬 = ${b2Cost}萬元) 之 8% 精神與市場抗性折讓補償，計新台幣 ${fairPremiumPay} 萬元。
    - 甲方改選2樓後，多出之都更分配權值差額（原規劃10樓 ${Math.round(bDesiredArea * p10Price)} 萬 - 實際2樓 ${b2Cost} 萬 = ${officialValueDiff} 萬元），保留於甲方都更帳戶中。

三、給付與信託方式：
    前開現金補償金共計新台幣【${fairPremiumPay}】萬元整，應於信託銀行通知辦理首期土建融撥款時，由乙方【林美純】一次性匯入信託專戶，並由建經公司依專款專用原則，直接撥付至甲方【陳政助】之指定帳戶，不計入都更專案內找補。

四、剩餘可用價值：
    選配後雙方剩餘之更新前權利價值（甲方剩餘可用權值 ${bRemain} 萬元、乙方剩餘可用權值 ${aRemain} 萬元），甲方得依本重建計畫之選配規約，優先選配其餘車位、店面，或於完工交屋時辦理差額找補折現。

五、本協議草案僅供協商使用，雙方於正式都更契約與信託契約簽署後，本協議即作為其附件並同時生效。

協議書立人簽署：
甲方（退讓方）：                        （簽名蓋章）
乙方（得標方）：                        （簽名蓋章）
中華民國 年 月 日`;

            document.getElementById('conflict-mou-text').textContent = mouText;

        } else if (mode === 'split-units') {
            // === 方案 B: 頂樓戶別拆分選配 (陳政助選1戶，林美純選2戶) ===
            const unitValue = Math.round(conflictValue / 3); // 單戶價值 (預設 1000萬)
            
            // 陳政助 (地主B) 選 A 戶自住 (消耗 1 戶價值)
            const winnerCost = unitValue;
            const winnerPayToLoser = 0; // 平分免補償
            const winnerRemain = totalB - unitValue;

            // 林美純 (地主A) 選 B, C 戶 (消耗 2 戶價值)
            const loserUnitCost = unitValue * 2;
            const loserActualTotal = unitValue * 2;
            const loserRemain = totalA - (unitValue * 2);

            // 更新 UI 狀態為和平解決 (綠色)
            winnerBadge.textContent = `方案 B 判定：分拆選配 (和平解決，無補償)`;
            winnerBadge.style.background = 'var(--color-success)';
            winnerBadge.style.boxShadow = '0 0 10px var(--color-success-glow)';
            
            winDesc.innerHTML = `由於 10 樓規劃為 3 戶。<strong>${nameB} (陳政助)</strong> 僅需自住，建議選配 10 樓 A 戶；<strong>${nameA} (林美純)</strong> 則選配另 2 戶。雙方在 10 樓和平共存，但此方案下林美純<strong>無法進行打通合併</strong>，故無須支付溢價補償金。`;

            // 更新結果卡片
            document.getElementById('winner-result-title').textContent = `${nameB} (選配 10 樓 A 戶)`;
            document.getElementById('win-unit-name').textContent = '10樓 A 戶 (自住)';
            document.getElementById('win-total-cost').textContent = winnerCost.toLocaleString();
            document.getElementById('win-cost-formula').textContent = "(分拆選配，免溢價)";
            document.getElementById('win-premium-pay').textContent = winnerPayToLoser.toLocaleString();
            document.getElementById('win-remain-val').textContent = winnerRemain.toLocaleString();

            document.getElementById('loser-result-title').textContent = `${nameA} (選配 10 樓 B、C 戶)`;
            document.getElementById('lose-unit-name').textContent = '10樓 B、C 戶 (共2戶)';
            document.getElementById('lose-premium-get').textContent = winnerPayToLoser.toLocaleString();
            document.getElementById('lose-actual-val').textContent = loserActualTotal.toLocaleString();
            document.getElementById('lose-remain-val').textContent = loserRemain.toLocaleString();

            // 生成拆分選配 MOU
            const mouText = `都市更新/危老重建 地主選配讓步與戶別分拆協議書 (草案)

立協議書人：
甲方：${nameA} (林美純)
乙方：${nameB} (陳政助)

緣甲、乙雙方同為本都市更新/危老重建計畫之全體土地所有權人，因重建後新建物「10樓（規劃3戶，總面積49坪）」發生選配重疊衝突。為求全體地主利益一致，促成重建計畫順利推動，經雙方善意協商，達成以下選配讓步與拆分協議：

一、目標樓層選配拆分：
    雙方同意將目標樓層 (10樓) 進行拆分選配，且不進行戶別打通：
    1. 乙方【${nameB}】選配 10 樓 A 戶 (價值 ${unitValue} 萬元) 用於自住。
    2. 甲方【${nameA}】選配 10 樓 B 戶與 C 戶 (共計價值 ${unitValue * 2} 萬元)。

二、溢價與補償免除：
    因採分戶選配解決，雙方於目標樓層皆有分回，且皆大歡喜，故乙方無須支付甲方任何加價補償金。

三、剩餘可用價值與配戶：
    選配後雙方剩餘之更新前權利價值（甲方剩餘可用權值 ${loserRemain} 萬元、乙方剩餘可用權值 ${winnerRemain} 萬元），得依本重建計畫之選配規約，於其餘樓層選配房屋、車位、店面，或於完工交屋時辦理差額找補折現。

四、本協議草案僅供協商使用，雙方於正式都更契約與信託契約簽署後，本協議即作為其附件並同時生效。

協議書立人簽署：
甲方：                        （簽名蓋章）
乙方：                        （簽名蓋章）
中華民國 年 月 日`;

            document.getElementById('conflict-mou-text').textContent = mouText;

        } else {
            // === 方案 C: 地主自擬加價競標找補 ===
            winnerBadge.style.background = 'var(--color-gold)';
            winnerBadge.style.boxShadow = '0 0 10px var(--color-gold-glow)';

            let winnerName, winnerBid, winnerTotal;
            let loserName, loserBid, loserTotal;
            let isDraw = false;

            // 判定得標者 (出價高者得，平手時總價值高者得)
            if (bidB > bidA) {
                winnerName = nameB;
                winnerBid = bidB;
                winnerTotal = totalB;
                loserName = nameA;
                loserBid = bidA;
                loserTotal = totalA;
            } else if (bidA > bidB) {
                winnerName = nameA;
                winnerBid = bidA;
                winnerTotal = totalA;
                loserName = nameB;
                loserBid = bidB;
                loserTotal = totalB;
            } else {
                isDraw = true;
                if (totalA >= totalB) {
                    winnerName = nameA;
                    winnerBid = bidA;
                    winnerTotal = totalA;
                    loserName = nameB;
                    loserBid = bidB;
                    loserTotal = totalB;
                } else {
                    winnerName = nameB;
                    winnerBid = bidB;
                    winnerTotal = totalB;
                    loserName = nameA;
                    loserBid = bidA;
                    loserTotal = totalA;
                }
            }

            // 財務數據計算 (退讓至中低樓層如4樓，官方估價以 90% 計算)
            const winnerCost = conflictValue + winnerBid;
            const winnerPayToLoser = winnerBid;
            const winnerRemain = winnerTotal - conflictValue;

            const loserUnitCost = Math.round(conflictValue * 0.90); 
            const loserActualTotal = loserUnitCost + winnerPayToLoser;
            const loserRemain = loserTotal - loserUnitCost;

            winnerBadge.textContent = `方案 C 判定：${winnerName} 競標取得目標戶`;
            
            if (isDraw) {
                winDesc.innerHTML = `雙方出價皆為 <strong>${winnerBid} 萬元</strong> 平手。<br>經系統以「更新前可分回總價值較高者優先選配」之實務標準，判定由 <strong>${winnerName}</strong> 取得 ${conflictUnit}。`;
            } else {
                winDesc.innerHTML = `<strong>${winnerName}</strong> 願意加價 <strong>${winnerBid} 萬元</strong>，高於 <strong>${loserName}</strong> 的 <strong>${loserBid} 萬元</strong>，成功選配 ${conflictUnit}。其加價金額將直接做為現金補償直接支付給 ${loserName}。`;
            }

            // 得標者卡片
            document.getElementById('winner-result-title').textContent = `${winnerName} (選配得標)`;
            document.getElementById('win-unit-name').textContent = conflictUnit;
            document.getElementById('win-total-cost').textContent = winnerCost.toLocaleString();
            document.getElementById('win-cost-formula').textContent = `(官方價 + 自發加價 ${winnerBid} 萬)`;
            document.getElementById('win-premium-pay').textContent = winnerPayToLoser.toLocaleString();
            document.getElementById('win-remain-val').textContent = winnerRemain.toLocaleString();

            // 退讓者卡片
            document.getElementById('loser-result-title').textContent = `${loserName} (協商退讓)`;
            document.getElementById('lose-unit-name').textContent = `中低樓層 (官方核估約 ${loserUnitCost.toLocaleString()} 萬)`;
            document.getElementById('lose-premium-get').textContent = winnerPayToLoser.toLocaleString();
            document.getElementById('lose-actual-val').textContent = loserActualTotal.toLocaleString();
            document.getElementById('lose-remain-val').textContent = loserRemain.toLocaleString();

            // 生成競標找補 MOU
            const mouText = `都市更新/危老重建 地主選配讓步與溢價補償協議書 (草案)

立協議書人：
甲方（退讓方）：${loserName}
乙方（得標方）：${winnerName}

緣甲、乙雙方同為本都市更新/危老重建計畫之土地所有權人，因重建後新建物「${conflictUnit}」（下稱目標戶，官方估定價值 ${conflictValue} 萬元）發生選配重疊衝突。為求全體地主利益一致，促成重建計畫順利推動，經雙方善意協商，達成以下選配讓步與補償協議：

一、目標戶選配歸屬：
    雙方同意目標戶由乙方【${winnerName}】選配取得。

二、樓層讓步：
    甲方【${loserName}】同意退讓，改為選配中低樓層（官方估定價值 ${loserUnitCost} 萬元）。

三、溢價補償約定：
    乙方【${winnerName}】同意以現金額外加價新台幣【${winnerPayToLoser}】萬元整（下稱補償金），作為對甲方【${loserName}】退讓之補償。此補償金不計入都更重建之官方找補，屬雙方私下協議之特別補償。

四、給付與信託方式：
    前開補償金共計新台幣【${winnerPayToLoser}】萬元整，應於信託銀行通知辦理首期土建融撥款時，由乙方【${winnerName}】一次性匯入信託專戶，並由建經公司依專款專用原則，直接撥付至甲方【${loserName}】之指定帳戶。

五、剩餘價值與找補：
    選配後雙方剩餘之更新前權利價值（甲方剩餘價值 ${loserRemain} 萬元、乙方剩餘價值 ${winnerRemain} 萬元），得依本重建計畫之選配規約，優先選配其餘車位、店面，或於完工交屋時辦理差額找補折現。

六、本協議草案僅供協商使用，雙方於正式都更契約與信託契約簽署後，本協議即作為其附件並同時生效。

協議書立人簽署：
甲方（退讓方）：                        （簽名蓋章）
乙方（得標方）：                        （簽名蓋章）
中華民國 年 月 日`;

            document.getElementById('conflict-mou-text').textContent = mouText;
        }
    }

    // 衝突協商綁定與複製
    function setupConflictSolver() {
        // 1. 綁定視角切換 Tab
        const viewTabBtns = document.querySelectorAll('.view-tabs-control .view-tab-btn');
        const viewPanels = document.querySelectorAll('.comparison-view-content .view-panel');
        
        if (viewTabBtns.length > 0) {
            viewTabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetView = btn.dataset.view;
                    
                    // 切換按鈕 active 樣式
                    viewTabBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // 切換面板 active 樣式
                    viewPanels.forEach(panel => {
                        panel.classList.remove('active');
                        if (panel.id === `view-${targetView}`) {
                            panel.classList.add('active');
                        }
                    });
                });
            });
        }

        // 2. 點擊方案直接載入計算機
        const schemeElements = document.querySelectorAll('.clickable-scheme');
        schemeElements.forEach(el => {
            el.addEventListener('click', (e) => {
                // 獲取方案名稱
                const schemeVal = el.getAttribute('data-scheme-value');
                if (!schemeVal) return;
                
                // 1. 更新選配模式下拉選單
                const modeSelect = document.getElementById('conflict-mode');
                if (modeSelect) {
                    modeSelect.value = schemeVal;
                }
                
                // 2. 執行衝突協商計算以更新 MOU
                solveConflict();
                
                // 3. 平滑滾動至參數與結果區，並給予視覺回饋
                const solverGrid = document.querySelector('.conflict-solver-grid');
                if (solverGrid) {
                    solverGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // 視覺高亮效果
                    solverGrid.style.transition = 'box-shadow 0.4s ease, border-color 0.4s ease';
                    solverGrid.style.borderColor = 'var(--color-gold)';
                    solverGrid.style.boxShadow = '0 0 25px rgba(217, 119, 6, 0.4)';
                    
                    setTimeout(() => {
                        solverGrid.style.borderColor = 'var(--color-border)';
                        solverGrid.style.boxShadow = 'var(--shadow-md)';
                    }, 1500);
                }
            });
        });

        const btnSolve = document.getElementById('btn-solve-conflict');
        if (btnSolve) {
            btnSolve.addEventListener('click', solveConflict);
        }

        const btnCopy = document.getElementById('btn-copy-mou');
        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                const mouText = document.getElementById('conflict-mou-text').textContent;
                navigator.clipboard.writeText(mouText).then(() => {
                    btnCopy.innerHTML = '<i class="fa-solid fa-check"></i> 已複製';
                    setTimeout(() => {
                        btnCopy.innerHTML = '<i class="fa-solid fa-copy"></i> 複製協議書';
                    }, 2000);
                }).catch(err => {
                    console.error('複製失敗:', err);
                });
            });
        }

        // 綁定對比矩陣的行動版分頁切換
        const matrixTabBtns = document.querySelectorAll('.matrix-tab-btn');
        const matrixCols = document.querySelectorAll('.matrix-table .scheme-col');
        if (matrixTabBtns.length > 0) {
            matrixTabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止冒泡，避免觸發 clickable-scheme 的載入計算
                    const scheme = btn.dataset.scheme;
                    
                    // 切換按鈕 active 樣式
                    matrixTabBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // 切換表格欄位 active-col 樣式
                    matrixCols.forEach(col => {
                        col.classList.remove('active-col');
                        if (col.classList.contains(`scheme-${scheme}`)) {
                            col.classList.add('active-col');
                        }
                    });
                });
            });
        }
    }

    // 啟動選配衝突協商試算器
    setupConflictSolver();
    solveConflict();
});
