// reference:https://www.amcharts.com/demos/bar-chart-race/
//  Data Processing: Function to convert CSV data to the desired format
function processData(data) {
  let result = {};

  data.forEach(function (row) {
    let country = row["country"];

    for (let date in row) {
      if (date !== "country") {
        if (!result[date]) {
          result[date] = {};
        }
        result[date][country] = +row[date];
      }
    }
  });
  console.log("Processed data:", result);
  return result;
}

// Async function to load and process data from CSV file
async function loadData() {
  let response = await d3.csv("./../data/newcases.csv");
  console.log("CSV data:", response); // Add this line
  return processData(response);
}

function getNextDate(currentDate) {
  var date = new Date(currentDate + "T00:00:00");
  date.setMonth(date.getMonth() + 1);
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");
  var dateString = `${year}-${month}-${day}`;
  return dateString;
}

d3.csv("./../data/newcases.csv").then(function (data) {
  // Convert the CSV data to the desired format
  let allData = processData(data);
});

(async () => {
  // Load and process data
  const allData = await loadData();
  console.log("All data:", allData);

  // Create root element
  // https://www.amcharts.com/docs/v5/getting-started/#Root_element
  var root = am5.Root.new("chartdiv");

  root.numberFormatter.setAll({
    numberFormat: "#a",

    // Group only into M (millions), and B (billions)
    bigNumberPrefixes: [
      { number: 1e6, suffix: "M" },
      { number: 1e9, suffix: "B" },
    ],

    // Do not use small number prefixes at all
    smallNumberPrefixes: [],
  });

  var stepDuration = 2500;

  // Set themes
  // https://www.amcharts.com/docs/v5/concepts/themes/
  root.setThemes([am5themes_Animated.new(root)]);

  // Create chart
  // https://www.amcharts.com/docs/v5/charts/xy-chart/
  var chart = root.container.children.push(
    am5xy.XYChart.new(root, {
      panX: true,
      panY: true,
      wheelX: "none",
      wheelY: "none",
    })
  );

  // We don't want zoom-out button to appear while animating, so we hide it at all
  chart.zoomOutButton.set("forceHidden", true);

  // Create axes
  // https://www.amcharts.com/docs/v5/charts/xy-chart/axes/
  var yRenderer = am5xy.AxisRendererY.new(root, {
    minGridDistance: 20,
    inversed: true,
  });
  // hide grid
  yRenderer.grid.template.set("visible", false);

  var yAxis = chart.yAxes.push(
    am5xy.CategoryAxis.new(root, {
      maxDeviation: 0,
      categoryField: "network",
      renderer: yRenderer,
      // Set the max zoom factor for yAxis to display only 10 bars
      maxZoomFactor: 10,
    })
  );

  var xAxis = chart.xAxes.push(
    am5xy.ValueAxis.new(root, {
      maxDeviation: 0,
      min: 0,
      strictMinMax: true,
      extraMax: 0.02,
      renderer: am5xy.AxisRendererX.new(root, {}),
    })
  );

  xAxis.set("interpolationDuration", stepDuration / 10);
  xAxis.set("interpolationEasing", am5.ease.linear);

  // Add series
  // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
  var series = chart.series.push(
    am5xy.ColumnSeries.new(root, {
      xAxis: xAxis,
      yAxis: yAxis,
      valueXField: "value",
      categoryYField: "network",
    })
  );

  // Rounded corners for columns
  series.columns.template.setAll({ cornerRadiusBR: 5, cornerRadiusTR: 5 });

  // Make each column to be of a different color
  series.columns.template.adapters.add("fill", function (fill, target) {
    return chart.get("colors").getIndex(series.columns.indexOf(target));
  });

  series.columns.template.adapters.add("stroke", function (stroke, target) {
    return chart.get("colors").getIndex(series.columns.indexOf(target));
  });

  // Add label bullet
  series.bullets.push(function () {
    return am5.Bullet.new(root, {
      locationX: 1,
      sprite: am5.Label.new(root, {
        text: "{valueXWorking.formatNumber('#.# a')}",
        fill: root.interfaceColors.get("alternativeText"),
        centerX: am5.p100,
        centerY: am5.p50,
        populateText: true,
      }),
    });
  });

  var label = chart.plotContainer.children.push(
    am5.Label.new(root, {
      text: "2020",
      fontSize: "8em",
      opacity: 0.2,
      x: am5.p100,
      y: am5.p100,
      centerY: am5.p100,
      centerX: am5.p100,
    })
  );

  // Get series item by category
  function getSeriesItem(category) {
    for (var i = 0; i < series.dataItems.length; i++) {
      var dataItem = series.dataItems[i];
      if (dataItem.get("categoryY") == category) {
        return dataItem;
      }
    }
  }

  // Axis sorting
  function sortCategoryAxis() {
    // sort by value
    series.dataItems.sort(function (x, y) {
      return y.get("valueX") - x.get("valueX"); // descending
    });

    // go through each axis item
    am5.array.each(yAxis.dataItems, function (dataItem) {
      // get corresponding series item
      var seriesDataItem = getSeriesItem(dataItem.get("category"));

      if (seriesDataItem) {
        // get index of series data item
        var index = series.dataItems.indexOf(seriesDataItem);
        // calculate delta position
        var deltaPosition =
          (index - dataItem.get("index", 0)) / series.dataItems.length;
        // set index to be the same as series data item index
        if (dataItem.get("index") != index) {
          dataItem.set("index", index);
          // set deltaPosition instanlty
          dataItem.set("deltaPosition", -deltaPosition);
          // animate delta position to 0
          dataItem.animate({
            key: "deltaPosition",
            to: 0,
            duration: stepDuration / 2,
            easing: am5.ease.out(am5.ease.cubic),
          });
        }
      }
    });
    // sort axis items by index.
    // This changes the order instantly, but as deltaPosition is set, they keep in the same places and then animate to true positions.
    yAxis.dataItems.sort(function (x, y) {
      return x.get("index") - y.get("index");
    });
  }

  var date = "2020-02-01";

  // update data with values
  var interval, sortInterval;
  interval = setInterval(function () {
    var nextDate = getNextDate(date);

    if (!allData[nextDate]) {
      clearInterval(interval);
      clearInterval(sortInterval);
    } else {
      date = nextDate;
      updateData();
    }
  }, stepDuration);

  sortInterval = setInterval(sortCategoryAxis, stepDuration / 2);

  function setInitialData() {
    var d = allData[date];

    for (var n in d) {
      series.data.push({ network: n, value: d[n] });
      yAxis.data.push({ network: n });
    }
  }

  function updateData() {
    var itemsWithNonZero = 0;

    if (allData[date]) {
      // Change the label text format to display only year and month
      var displayDate = date.slice(0, 7);
      label.set("text", displayDate.toString());

      am5.array.each(series.dataItems, function (dataItem) {
        var category = dataItem.get("categoryY");
        var value = allData[date][category];

        if (value > 0) {
          itemsWithNonZero++;
        }

        dataItem.animate({
          key: "valueX",
          to: value,
          duration: stepDuration,
          easing: am5.ease.linear,
        });
        dataItem.animate({
          key: "valueXWorking",
          to: value,
          duration: stepDuration,
          easing: am5.ease.linear,
        });
      });

      // Zoom to display only 10 bars
      yAxis.zoom(0, 10 / yAxis.dataItems.length);

      sortCategoryAxis();
    }
  }

  setInitialData();

  setTimeout(function () {
    date = getNextDate(date);
    updateData();
  }, 50);

  // Make stuff animate on load
  // https://www.amcharts.com/docs/v5/concepts/animations/
  series.appear(1000);
  chart.appear(1000, 100);

  // Get the restart button element
  const restartButton = document.getElementById("restartButton");

  // Add event listener to restart button
  restartButton.addEventListener("click", function () {
    location.reload();
  });
})();
