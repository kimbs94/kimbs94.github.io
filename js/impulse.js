var IMPULSE = {};
(function (impulse) {
    var pri = {
        table_data: {},
        chart_data: [],
        page_dates: 1
    };

    $.extend(pri, {
        ratioTable: function () {
            var dates = Object.keys(pri.table_data);
            if (!dates.length) {
                return;
            }

            var nav_by_date = {};
            pri.chart_data.forEach(function (row) {
                nav_by_date[row.Date] = row;
            });

            var rows = [];
            dates.forEach(function (date) {
                var nav = nav_by_date[date];
                if (!nav || !nav.nav) {
                    return;
                }

                var total_ratio = 0;
                pri.table_data[date].forEach(function (holding) {
                    var ratio = holding.value / nav.nav * 100;
                    total_ratio += ratio;
                    rows.push({
                        date: date,
                        sort: "0" + holding.ticker,
                        ticker: holding.ticker,
                        name: holding.name,
                        ratio: ratio.toFixed(2) + "%",
                        summary: false
                    });
                });

                rows.push({
                    date: date,
                    sort: "1",
                    ticker: "",
                    name: "편입비 합계",
                    ratio: total_ratio.toFixed(2) + "%",
                    summary: true
                });
                rows.push({
                    date: date,
                    sort: "2",
                    ticker: "",
                    name: "현금",
                    ratio: (100 - total_ratio).toFixed(2) + "%",
                    summary: true
                });
            });

            $("#ratioTable").DataTable({
                destroy: true,
                searching: false,
                lengthChange: false,
                data: rows,
                order: [[0, "desc"], [1, "asc"]],
                pageLength: (pri.table_data[dates[0]].length + 2) * pri.page_dates,
                rowGroup: { dataSrc: "date" },
                dom: "Bfrtip",
                buttons: [
                    {
                        extend: "excelHtml5",
                        text: "엑셀 다운로드",
                        title: "일간 편입비",
                        exportOptions: {
                            columns: [0, 2, 3, 4],
                            modifier: { page: "all", order: "current", search: "none" },
                            customizeData: function (data) {
                                var body = [];
                                var group = null;
                                data.body.forEach(function (row) {
                                    if (row[0] !== group) {
                                        group = row[0];
                                        body.push([group, "", "", ""]);
                                    }
                                    body.push(["", row[1], row[2], row[3]]);
                                });
                                data.body = body;
                            }
                        }
                    }
                ],
                createdRow: function (tr, row) {
                    if (row.summary) {
                        $(tr).addClass("fw-bold table-light");
                    }
                },
                columns: [
                    { data: "date", visible: false },
                    { data: "sort", visible: false },
                    { data: "ticker" },
                    { data: "name" },
                    { data: "ratio", className: "text-end" }
                ]
            });
        },
        drawChart: function () {
            var chart_data = pri.chart_data;
            var labels = chart_data.map(function (item) { return item.Date; });
            var benchmark = chart_data.map(function (item) { return item.benchmark; });
            var nav = chart_data.map(function (item) { return item.nav; });
            var ctx = document.getElementById("impulseChart").getContext("2d");

            if (pri.chart) {
                pri.chart.destroy();
            }

            pri.chart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "KOSPI",
                            data: benchmark,
                            fill: false,
                            pointStyle: false,
                            borderColor: "#87CEEB",
                            backgroundColor: "#87CEEB"
                        },
                        {
                            label: "IMPULSE",
                            data: nav,
                            fill: false,
                            pointStyle: false,
                            borderColor: "#000000",
                            backgroundColor: "#000000"
                        }
                    ]
                },
                options: {
                    interaction: {
                        mode: "index",
                        intersect: false
                    },
                    plugins: {
                        tooltip: {
                            mode: "index",
                            intersect: false
                        }
                    }
                }
            });
        },
        dailyTable: function () {
            var money = $.fn.dataTable.render.number(",", ".", 0);
            $("#dailyTable").DataTable({
                destroy: true,
                searching: false,
                data: pri.chart_data,
                order: [[0, "desc"]],
                dom: "Bfrtip",
                buttons: [
                    {
                        extend: "excelHtml5",
                        text: "엑셀 다운로드",
                        title: "데일리 평가액",
                        exportOptions: {
                            columns: ":visible",
                            modifier: { page: "all", order: "current", search: "none" }
                        }
                    }
                ],
                columns: [
                    { data: "Date" },
                    { data: "nav", className: "text-end", render: money },
                    { data: "benchmark", className: "text-end", render: money }
                ]
            });
        },
        getData: function () {
            $.ajax({
                type: "GET",
                url: "data/impulse.json",
                dataType: "json",
                success: function (res) {
                    pri.table_data = res.holdings || {};
                    pri.chart_data = res.nav || [];
                    pri.ratioTable();
                    pri.drawChart();
                    pri.dailyTable();
                }
            });
        }
    });

    $.extend(impulse, {
        init: function () {
            pri.getData();
        }
    });

    return impulse;
}(IMPULSE));

$(document).ready(function () {
    IMPULSE.init();
});
