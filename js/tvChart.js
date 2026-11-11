(function (global) {
    const charts = new Map();

    function formatTime(time) {
        if (typeof time === "string") {
            return time.slice(0, 10);
        }
        if (time && typeof time === "object" && time.year) {
            const month = String(time.month).padStart(2, "0");
            const day = String(time.day).padStart(2, "0");
            return time.year + "-" + month + "-" + day;
        }
        return "";
    }

    function toBusinessDay(value) {
        if (value == null || value === "") {
            return null;
        }
        const text = String(value);
        const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (iso) {
            return iso[1] + "-" + iso[2] + "-" + iso[3];
        }
        const compact = text.match(/^(\d{4})(\d{2})(\d{2})/);
        if (compact) {
            return compact[1] + "-" + compact[2] + "-" + compact[3];
        }
        return null;
    }

    function shiftDate(days) {
        const date = new Date(Date.UTC(2020, 0, 1));
        date.setUTCDate(date.getUTCDate() + days);
        return date.toISOString().slice(0, 10);
    }

    function priceText(price) {
        return Number(price).toLocaleString("ko-KR", { maximumFractionDigits: 2 });
    }

    function parts(container) {
        const frame = container.parentElement;
        let legend = frame.previousElementSibling;
        if (!legend || !legend.classList.contains("tv-legend")) {
            legend = document.createElement("div");
            legend.className = "tv-legend mb-2 small";
            frame.parentElement.insertBefore(legend, frame);
        }
        let tooltip = frame.querySelector(".tv-tooltip");
        if (!tooltip) {
            tooltip = document.createElement("div");
            tooltip.className = "tv-tooltip position-absolute border bg-white small p-2 shadow-sm";
            tooltip.style.cssText = "display:none;z-index:2;pointer-events:none;";
            frame.appendChild(tooltip);
        }
        return { legend: legend, tooltip: tooltip };
    }

    function destroy(container) {
        const record = charts.get(container);
        if (!record) {
            return;
        }
        if (record.observer) {
            record.observer.disconnect();
        }
        charts.delete(container);
        record.chart.remove();
    }

    function watch(container, chart) {
        if (typeof ResizeObserver !== "function") {
            return null;
        }
        let width = container.clientWidth;
        const observer = new ResizeObserver(function () {
            const next = container.clientWidth;
            if (next > 0 && next !== width) {
                width = next;
                chart.timeScale().fitContent();
            }
        });
        observer.observe(container);
        return observer;
    }

    function baseOptions() {
        return {
            autoSize: true,
            layout: {
                background: { type: "solid", color: "#ffffff" },
                textColor: "#333333",
            },
            grid: {
                vertLines: { color: "#eeeeee" },
                horzLines: { color: "#eeeeee" },
            },
            rightPriceScale: { borderVisible: false },
            timeScale: { borderVisible: false },
            localization: {
                priceFormatter: priceText,
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
        };
    }

    function bindTooltip(chart, container, tooltip, seriesApis, timeLabel) {
        chart.subscribeCrosshairMove(function (param) {
            if (!param.point || param.point.x < 0 || param.point.y < 0 || !param.time) {
                tooltip.style.display = "none";
                return;
            }
            const title = timeLabel ? timeLabel(param.time) : formatTime(param.time);
            const lines = ['<div class="fw-semibold mb-1">' + title + "</div>"];
            seriesApis.forEach(function (series) {
                const point = param.seriesData.get(series.api);
                const text = point && point.value !== undefined ? priceText(point.value) : "-";
                lines.push(
                    '<div><span class="d-inline-block me-1 rounded-circle" style="width:8px;height:8px;background:' +
                    series.color + ';"></span>' + series.label + " " + text + "</div>"
                );
            });
            tooltip.innerHTML = lines.join("");
            tooltip.style.display = "block";
            let left = param.point.x + 16;
            let top = param.point.y + 16;
            if (left + tooltip.offsetWidth > container.clientWidth) {
                left = param.point.x - tooltip.offsetWidth - 16;
            }
            if (top + tooltip.offsetHeight > container.clientHeight) {
                top = param.point.y - tooltip.offsetHeight - 16;
            }
            tooltip.style.left = Math.max(left, 8) + "px";
            tooltip.style.top = Math.max(top, 8) + "px";
        });
    }

    function legendItem(legend, color, label) {
        const item = document.createElement("span");
        item.className = "d-inline-flex align-items-center me-3";
        item.innerHTML =
            '<span class="d-inline-block me-1" style="width:14px;height:3px;background:' +
            color + ';"></span>' + label;
        legend.appendChild(item);
    }

    function draw(container, config) {
        const ui = parts(container);
        destroy(container);
        ui.legend.innerHTML = "";
        ui.tooltip.style.display = "none";

        const labels = config.labels || [];
        const byTime = new Map();
        labels.forEach(function (label, index) {
            const time = toBusinessDay(label);
            if (time) {
                byTime.set(time, index);
            }
        });
        const times = Array.from(byTime.keys()).sort();
        const chart = LightweightCharts.createChart(container, baseOptions());
        const seriesApis = (config.datasets || []).map(function (dataset) {
            const color = dataset.borderColor || dataset.backgroundColor || "#2962FF";
            const api = chart.addSeries(LightweightCharts.LineSeries, {
                color: color,
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: false,
            });
            const points = times.map(function (time) {
                const value = dataset.data[byTime.get(time)];
                if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
                    return { time: time };
                }
                return { time: time, value: Number(value) };
            });
            api.setData(points.some(function (point) { return point.value !== undefined; }) ? points : []);
            legendItem(ui.legend, color, dataset.label || "");
            return { api: api, label: dataset.label || "", color: color };
        });
        chart.timeScale().fitContent();
        bindTooltip(chart, container, ui.tooltip, seriesApis);
        charts.set(container, { chart: chart, observer: watch(container, chart) });
        return chart;
    }

    function drawHistogram(container, config) {
        const ui = parts(container);
        destroy(container);
        ui.legend.innerHTML = "";
        ui.tooltip.style.display = "none";

        const labels = config.labels || [];
        const values = config.data || [];
        const colors = config.colors || [];
        const labelByTime = {};
        const chart = LightweightCharts.createChart(container, baseOptions());
        const api = chart.addSeries(LightweightCharts.HistogramSeries, {
            priceLineVisible: false,
            lastValueVisible: false,
            autoscaleInfoProvider: function () {
                const numbers = values.map(Number).filter(function (value) {
                    return !Number.isNaN(value);
                });
                return {
                    priceRange: {
                        minValue: 0,
                        maxValue: Math.max(1, ...numbers, 0),
                    },
                };
            },
        });
        api.setData(labels.map(function (label, index) {
            const time = shiftDate(index);
            const color = colors[index] || "#2962FF";
            const numeric = Number(values[index]);
            labelByTime[time] = label;
            legendItem(ui.legend, color, label + " " + priceText(Number.isNaN(numeric) ? 0 : numeric));
            return {
                time: time,
                value: Number.isNaN(numeric) ? 0 : numeric,
                color: color,
            };
        }));
        chart.applyOptions({
            timeScale: {
                borderVisible: false,
                tickMarkFormatter: function (time) {
                    return labelByTime[formatTime(time)] || "";
                },
            },
            localization: {
                priceFormatter: priceText,
                timeFormatter: function (time) {
                    return labelByTime[formatTime(time)] || formatTime(time);
                },
            },
        });
        const width = container.clientWidth || 640;
        const spacing = Math.max(16, Math.min(72, Math.floor(width / Math.max(labels.length, 1)) * 0.7));
        chart.timeScale().applyOptions({ barSpacing: spacing, rightOffset: 2 });
        chart.timeScale().fitContent();
        bindTooltip(chart, container, ui.tooltip, [{
            api: api,
            label: "비중",
            color: "#333333",
        }], function (time) {
            return labelByTime[formatTime(time)] || formatTime(time);
        });
        charts.set(container, { chart: chart, observer: watch(container, chart) });
        return chart;
    }

    document.addEventListener("shown.bs.collapse", function (event) {
        event.target.querySelectorAll(".tv-chart").forEach(function (container) {
            const record = charts.get(container);
            if (record) {
                record.chart.timeScale().fitContent();
            }
        });
    });

    global.TvCharts = {
        draw: draw,
        drawHistogram: drawHistogram,
        destroy: destroy,
    };
})(window);
