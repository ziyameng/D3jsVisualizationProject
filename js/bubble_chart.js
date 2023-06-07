//Reference: https://d3-graph-gallery.com/graph/bubble_template.html

// set the dimensions and margins of the graph
let margin = { top: 40, right: 150, bottom: 60, left: 100 },
  width = 900 - margin.left - margin.right,
  height = 600 - margin.top - margin.bottom;

// append the svg object to the body of the page
let svg = d3
  .select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Read the data
d3.csv("./../data/vaccineData.csv")
  .then(function (data) {
    console.log(data);

    // ---------------------------//
    //       AXIS  AND SCALE      //
    // ---------------------------//

    // Add X axis
    let x = d3
      .scaleLinear() // Use scaleLinear instead of scaleLog
      .domain([0, 5]) // Set the domain from 0 to 5
      .range([0, width]);

    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(
        d3.axisBottom(x).ticks(11, ".1f") // Show 11 ticks with 1 decimal point
      );

    // Add X axis label:
    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("x", width)
      .attr("y", height + 50)
      .text("Total Vaccinations Per Person");

    // Add Y axis
    let y = d3.scaleSqrt().domain([100, 4000000000]).range([height, 0]);

    svg.append("g").call(
      d3
        .axisLeft(y)
        .tickValues([100, 1000000000, 2000000000, 3000000000, 4000000000])
        .tickFormat((d) => {
          if (d < 1000000000) {
            return parseInt(d);
          } else {
            return parseInt(d / 1000000000) + " Billion";
          }
        })
    );

    // Add Y axis label:
    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("x", 0)
      .attr("y", -20)
      .text("Total Vaccinations")
      .attr("text-anchor", "start");

    // Add a scale for bubble size
    let z = d3
      .scaleSqrt()
      .domain([0, d3.max(data, (d) => parseFloat(d.population))])
      .range([2, 30]);

    // Add a scale for bubble color
    let myColor = d3
      .scaleOrdinal()
      .domain(["Asia", "Europe", "Americas", "Africa", "Oceania"])
      .range(d3.schemeTableau10);

    // ---------------------------//
    //      TOOLTIP               //
    // ---------------------------//

    // -1- Create a tooltip div that is hidden by default:
    let tooltip = d3
      .select("#my_dataviz")
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("background-color", "black")
      .style("border-radius", "5px")
      .style("padding", "10px")
      .style("color", "white")
      .style("position", "absolute");

    // -2- Create 3 functions to show / update (when mouse move but stay on same circle) / hide the tooltip
    let showTooltip = function (event, d) {
      let xPos = event.pageX + 10;
      let yPos = event.pageY - 40;
      tooltip.transition().duration(200);
      tooltip
        .style("opacity", 1)
        .html(
          "Country: " +
            d.country +
            "<br>Population: " +
            d.population +
            "<br>Total Vaccinations: " +
            d.total_vaccinations +
            "<br>Total Vaccinations Per Person: " +
            d.total_vaccinations_per_people
        )
        .style("left", xPos + "px")
        .style("top", yPos + "px");
    };
    let moveTooltip = function (event, d) {
      let xPos = event.pageX + 10;
      let yPos = event.pageY - 40;
      tooltip.style("left", xPos + "px").style("top", yPos + "px");
    };

    let hideTooltip = function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0);
    };

    // ---------------------------//
    //       HIGHLIGHT GROUP      //
    // ---------------------------//

    // What to do when one group is hovered
    let highlight = function (event, d) {
      // reduce opacity of all groups
      d3.selectAll(".bubbles").style("opacity", 0.05);
      // expect the one that is hovered
      d3.selectAll("." + d.continent).style("opacity", 1);
    };

    // And when it is not hovered anymore
    let noHighlight = function (d) {
      d3.selectAll(".bubbles").style("opacity", 1);
    };

    // ---------------------------//
    //       CIRCLES              //
    // ---------------------------//

    // Add dots
    svg
      .append("g")
      .selectAll("dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", function (d) {
        return "bubbles " + d.continent;
      })
      .attr("cx", function (d) {
        return x(d.total_vaccinations_per_people);
      })
      .attr("cy", function (d) {
        return y(d.total_vaccinations);
      })
      .attr("r", function (d) {
        return z(d.population);
      })
      .style("fill", function (d) {
        return myColor(d.continent);
      })
      // -3- Trigger the functions for hover
      .on("mouseover", showTooltip)
      .on("mousemove", moveTooltip)
      .on("mouseleave", hideTooltip);

    // ---------------------------//
    //       LEGEND              //
    // ---------------------------//

    // Add legend: circles
    let valuesToShow = [10000000, 100000000, 1000000000];
    let xCircle = 600;
    let xLabel = 650;
    svg
      .selectAll("legend")
      .data(valuesToShow)
      .enter()
      .append("circle")
      .attr("cx", xCircle)
      .attr("cy", function (d) {
        return height - 300 - z(d);
      })
      .attr("r", function (d) {
        return z(d);
      })
      .style("fill", "none")
      .attr("stroke", "black");

    // Add legend: segments
    svg
      .selectAll("legend")
      .data(valuesToShow)
      .enter()
      .append("line")
      .attr("x1", function (d) {
        return xCircle + z(d);
      })
      .attr("x2", xLabel)
      .attr("y1", function (d) {
        return height - 300 - z(d);
      })
      .attr("y2", function (d) {
        return height - 300 - z(d);
      })
      .attr("stroke", "black")
      .style("stroke-dasharray", "2,2");

    // Add legend: labels
    svg
      .selectAll("legend")
      .data(valuesToShow)
      .enter()
      .append("text")
      .attr("x", xLabel)
      .attr("y", function (d) {
        return height - 300 - z(d);
      })
      .text(function (d) {
        return d;
      })
      .style("font-size", 10)
      .attr("alignment-baseline", "middle");

    // Legend title
    svg
      .append("text")
      .attr("x", xCircle + 30)
      .attr("y", height - 300 + 30)
      .text("Population")
      .attr("text-anchor", "middle");

    // Add one dot in the legend for each name.
    let size = 20;
    let allgroups = ["Asia", "Europe", "Americas", "Africa", "Oceania"];
    svg
      .selectAll("myrect")
      .data(allgroups)
      .enter()
      .append("circle")
      .attr("cx", 600)
      .attr("cy", function (d, i) {
        return 10 + i * (size + 5);
      }) // 100 is where the first dot appears. 25 is the distance between dots
      .attr("r", 7)
      .style("fill", function (d) {
        return myColor(d);
      })
      .on("mouseover", (event, d) => highlight(event, { continent: d }))
      .on("mouseleave", noHighlight);

    // Add labels beside legend dots
    svg
      .selectAll("mylabels")
      .data(allgroups)
      .enter()
      .append("text")
      .attr("x", 600 + size * 0.8)
      .attr("y", function (d, i) {
        return i * (size + 5) + size / 2;
      }) // 100 is where the first dot appears. 25 is the distance between dots
      .style("fill", function (d) {
        return myColor(d);
      })
      .text(function (d) {
        return d;
      })
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle")
      .on("mouseover", (event, d) => highlight(event, { continent: d }))
      .on("mouseleave", noHighlight);
  })
  .catch(function (error) {
    console.log(error);
  });
