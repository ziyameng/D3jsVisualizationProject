/* 

REFRENCES 

―	D3.js Gallery - https://www.d3-graph-gallery.com/
―	Observable – Joe Davies Blog - https://observablehq.com/@joewdavies
―	D3 Scale Chromatic - https://github.com/d3/d3-scale-chromatic
―	D3 SVG Legend - https://d3-legend.susielu.com/
―	D3 Geo Projection - https://github.com/d3/d3-geo-projection 
- TopoJSON & GeoJSON -  Bostock, M. (2013) https://topojson.github.io/  and 
  GitHub repository: https://github.com/topojson/topojson
  
*/

const MILLION = 1000000;
let world;
let topojson;
let rawdata = [];

const tooltip = d3
  .select("#map-area")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("opacity", 0);
tooltip.append("div").attr("class", "countryname");
tooltip.append("div").text("Total New Cases (Millions)");
tooltip.append("div").attr("class", "totalCases");
const tParser = d3.timeParse("%d/%m/%y");

const legendValues = [
  {
    label: "< 0.1 M",
    value: 100000,
  },
  {
    label: "0.1 M - 0.5 M",
    value: 500000,
  },
  {
    label: "0.5 M - 1 M",
    value: 1000000,
  },
  {
    label: "1 M - 10 M",
    value: 10000000,
  },
  {
    label: "10 M - 50 M",
    value: 50000000,
  },
  {
    label: "50 M +",
  },
];

const colorScale = d3
  .scaleThreshold()
  .domain(legendValues.map((d) => d.value))
  .range(d3.schemeOrRd[6]);

const data = [];
Promise.all([
  d3.json("./../data/world.geojson"),
  d3.csv("./../data/covid.csv"),
]).then(function (results) {
  ready(null, results[0], results[1]);
});

function ready(error, topo, dataCsv) {
  rawdata = dataCsv.map(function (d) {
    return {
      date: tParser(d.date_reported),
      date_reported: d.date_reported,
      country_code: d.country_code,
      country: d.country,
      who_region: d.who_region,
      new_cases: Number(d.new_cases),
      total_cases: Number(d.total_cases),
      new_deaths: Number(d.new_deaths),
      total_deaths: Number(d.total_deaths),
    };
  });

  const summarydata = _.groupBy(rawdata, "country");

  const summaryAllYear = new Map();
  _.forEach(summarydata, (value, key) => {
    const last = _.last(value);
    summaryAllYear.set(key, last.total_cases);
  });

  topojson = topo;
  renderMap(topo, summaryAllYear);

  addLegend();
  renderLineArea(rawdata);
}

function renderMap(topo, data) {
  const svg = d3.select("#map"),
    width = svg.attr("width"),
    height = svg.attr("height");

  const projection = d3
    .geoRobinson()
    .scale(150)
    .translate([width / 2, height / 2]);

  let mouseOver = function (event, d) {
    d3.selectAll(".Country")
      .transition()
      .duration(80)
      .style("stroke", "transparent");

    d3.select(this)
      .transition()
      .duration(80)
      .style("opacity", 1)
      .style("stroke", "blue");

    const [x, y] = d3.pointer(event);

    tooltip
      .style("left", x + 15 + "px")
      .style("top", y + 28 + "px")
      .transition()
      .duration(80)
      .style("opacity", 1);

    tooltip.select(".countryname").text(`${d.properties.name}`);
    tooltip
      .select(".totalCases")
      .text(`${new Intl.NumberFormat("en-UK").format(d.total / MILLION)}`);
  };

  let mouseLeave = function () {
    d3.selectAll(".Country")
      .transition()
      .duration(80)
      .style("opacity", 1)
      .style("stroke", "transparent");
    tooltip.transition().duration(300).style("opacity", 0);
  };

  svg.append("g").selectAll("*").remove();
  world = svg.append("g").attr("class", "world");
  world
    .selectAll("path")
    .data(topo.features)
    .enter()
    .append("path")
    .attr("d", d3.geoPath().projection(projection))
    .attr("data-name", function (d) {
      return d.properties.name;
    })
    .attr("fill", function (d) {
      d.total = data.get(d.properties.name) || 0;
      return colorScale(d.total);
    })
    .style("stroke", "transparent")
    .attr("class", function (d) {
      return "Country";
    })
    .attr("id", function (d) {
      return d.id;
    })
    .style("opacity", 1)
    .on("mouseover", mouseOver)
    .on("mouseleave", mouseLeave);
}

function addLegend() {
  const x = d3.scaleLinear().domain([2.6, 75.1]).rangeRound([600, 860]);
  const svg = d3.select("#map-legend");
  const height = svg.attr("height");
  const legend = svg.append("g").attr("id", "legend");

  const legend_entry = legend
    .selectAll("g.legend")
    .data(
      colorScale.range().map(function (d) {
        d = colorScale.invertExtent(d);
        if (d[0] == null) d[0] = x.domain()[0];
        if (d[1] == null) d[1] = x.domain()[1];
        return d;
      })
    )
    .enter()
    .append("g")
    .attr("class", "legend_entry");

  const ls_w = 20,
    ls_h = 20;

  legend_entry
    .append("rect")
    .attr("x", 20)
    .attr("y", function (d, i) {
      return height - i * ls_h - 2 * ls_h;
    })
    .attr("width", ls_w)
    .attr("height", ls_h)
    .style("fill", function (d) {
      return colorScale(d[0]);
    })
    .style("opacity", 0.8);

  legend_entry
    .append("text")
    .attr("x", 50)
    .attr("y", function (d, i) {
      return height - i * ls_h - ls_h - 6;
    })
    .text(function (d, i) {
      return legendValues[i].label;
    });

  legend
    .append("text")
    .attr("x", 15)
    .attr("y", 20)
    .text("Total New Cases (Million)");
}
function idled() {
  idleTimeout = null;
}

function renderLineArea(rawdata) {
  let svg = d3.select("#linearea"),
    margin = { top: 20, right: 20, bottom: 30, left: 80 },
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    g = svg
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const totalCases = [];
  const totalDeaths = [];
  let groupBy = _.groupBy(rawdata, "date_reported");
  _.forEach(groupBy, (value, key) => {
    totalCases.push({
      date: tParser(key),
      id: "total_cases",
      value: _.sumBy(value, "total_cases"),
    });
    totalDeaths.push({
      date: tParser(key),
      id: "total_deaths",
      value: _.sumBy(value, "total_deaths"),
    });
  });

  const data = totalCases;

  let x = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]);
  let area = d3
    .area()
    .x(function (d) {
      return x(d.date);
    })
    .y1(function (d) {
      return y(d.value);
    });
  let brush = d3
    .brushX()
    .extent([
      [0, 0],
      [width, height],
    ])
    .on("end", updateChart);
  x.domain(
    d3.extent(data, function (d) {
      return d.date;
    })
  );
  y.domain([
    0,
    d3.max(data, function (d) {
      return d.value;
    }),
  ]);
  area.y0(y(0));

  g.append("path").datum(data).attr("fill", "steelblue").attr("d", area);
  g.append("g").attr("class", "brush").call(brush);
  g.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));
  g.append("g")
    .call(
      d3.axisLeft(y).tickFormat(function (d) {
        return d / 1000000 + " M";
      })
    )
    .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", "0.71em")
    .attr("text-anchor", "end")
    .text("Total Cases");
  svg
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .text("Time");

  function updateChart() {
    extent = d3.brushSelection(this);

    if (!extent) {
      if (!idleTimeout) return (idleTimeout = setTimeout(idled, 350));
      x.domain([4, 8]);
    } else {
      const start = x.invert(extent[0]);
      const end = x.invert(extent[1]);

      const filterSection = rawdata.filter((d) => {
        if (d.date >= start && d.date <= end) {
          return d;
        }
      });

      const aggregate = _.groupBy(filterSection, "country");
      const mapdata = new Map();
      _.forEach(aggregate, (value, key) => {
        const last = _.last(value);
        const first = _.first(value);
        mapdata.set(key, last.total_cases - first.total_cases);
      });

      renderMap(topojson, mapdata);

      const filterDeaths = totalDeaths.filter((d) => {
        if (d.date >= start && d.date <= end) {
          return d;
        }
      });

      renderTotalDeathLine(filterDeaths);
    }
  }
}

function renderTotalDeathLine(linedata) {
  const margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = 460 - margin.left - margin.right,
    height = 150 - margin.top - margin.bottom;
  const tooltip = d3
    .select("#chart1-container")
    .append("div")
    .attr("class", "tooltipdeath")
    .style("position", "absolute")
    .style("opacity", 0);

  tooltip.append("div").attr("class", "Total Deaths").text("Total Deaths");
  tooltip.append("div").attr("class", "totaldeathnumber");

  let svg = d3.select("#totaldeath");
  svg.selectAll("*").remove();
  svg = svg
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const x = d3
    .scaleTime()
    .domain(
      d3.extent(linedata, function (d) {
        return d.date;
      })
    )
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(5));
  svg
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width / 2)
    .attr("y", height + 30)
    .text("Time");

  const y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(linedata, function (d) {
        return +d.value;
      }),
    ])
    .range([height, 0]);

  svg
    .append("g")
    .call(
      d3.axisLeft(y).tickFormat(function (d) {
        return d / 1000000 + " M";
      })
    )
    .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", "0.71em")
    .attr("text-anchor", "end")
    .text("Total Deaths");

  function mouseover() {
    tooltip.style("opacity", 1);
  }

  function mousemove() {
    var x0 = x.invert(d3.pointer(event)[0]);
    let filterDate = linedata.filter((d) => d.date >= x0);
    if (filterDate) {
      filterDate = filterDate[0];
    }

    tooltip
      .style("left", d3.event.pageX + 15 + "px")
      .style("top", d3.event.pageY - 28 + "px")
      .transition()
      .duration(400)
      .style("opacity", 1);
    tooltip.select(".totaldeathnumber").text(filterDate.value);
  }

  function mouseout() {
    tooltip.style("opacity", 0);
  }

  const line = svg.append("g").attr("clip-path", "url(#clip)");
  line
    .append("path")
    .datum(linedata)
    .attr("class", "line") // I add the class line to be able to modify this line later on.
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 3)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return x(d.date);
        })
        .y(function (d) {
          return y(d.value);
        })
    )
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseout", mouseout);
}
