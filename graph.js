const dims = { height: 300, width: 300, radius: 150 };
// +5 is kind of like padding
const cent = { x: dims.width / 2 + 5, y: dims.height / 2 + 5 };

const svg = d3
    .select('.canvas')
    .append('svg')
    .attr('width', dims.width + 150)
    .attr('height', dims.height + 150);

const graph = svg
    .append('g')
    // for the center of the pie chart
    .attr('transform', `translate(${cent.x}, ${cent.y})`);

// returns a function
const pie = d3
    .pie()
    // we dont want d3 to sort it, we will sort ourselves
    .sort(null)
    // this will create the angle values depending on the cost
    .value((d) => d.cost);

// creating paths (d value in svg path)
const arcPath = d3
    .arc()
    .outerRadius(dims.radius)
    .innerRadius(dims.radius / 2);

// scheme comes from d3 library, set of colors
const color = d3.scaleOrdinal(d3['schemeSet3']);

// legend setup
const legendGroup = svg
    .append('g')
    .attr('transform', `translate(${dims.width + 40}, 10)`);

const legend = d3.legendColor().shape('circle').shapePadding(10).scale(color);

// update function
const update = (data) => {
    //update color scale domain
    color.domain(data.map((d) => d.name));

    // update and call the legend
    legendGroup.call(legend);
    legendGroup.selectAll('text').attr('fill', 'white');

    //    join enchanced pie data to path elements
    const paths = graph
        .selectAll('path')
        // we put the data with angles therefore pie(data)
        .data(pie(data));

    // exit selection
    paths.exit().transition().duration(750).attrTween('d', arcTweenExit).remove();

    // update the current DOM
    paths
        .attr('d', arcPath)
        .transition()
        .duration(750)
        .attrTween('d', arcTweetUpdate);

    paths
        .enter()
        .append('path')
        .attr('class', 'arc')
        .attr('stroke', '#fff')
        .attr('stroke-width', 3)
        // we put data.name because it is now under data
        .attr('fill', (d) => color(d.data.name))
        // allow us to use function on each element
        .each(function(d) {
            // current one is current angle,
            // d is the updated angle
            this._current = d;
        })
        .transition()
        .duration(750)
        .attrTween('d', arcTweenEnter);
};

// data array and firestore
let data = [];

db.collection('expenses').onSnapshot((res) => {
    res.docChanges().forEach((change) => {
        const doc = {...change.doc.data(), id: change.doc.id };

        // when changing/adding new data to firestore, each of them has a type
        // and we add functionality according to those types
        switch (change.type) {
            case 'added':
                data.push(doc);
                break;
            case 'modified':
                const index = data.findIndex((item) => item.id === doc.id);
                data[index] = doc;
                break;
            case 'removed':
                data = data.filter((item) => item.id !== doc.id);
                break;
            default:
                break;
        }
    });

    update(data);
});

const arcTweenEnter = (d) => {
    let i = d3.interpolate(d.endAngle, d.startAngle);

    return function(t) {
        d.startAngle = i(t);
        return arcPath(d);
    };
};

const arcTweenExit = (d) => {
    let i = d3.interpolate(d.startAngle, d.endAngle);

    return function(t) {
        d.startAngle = i(t);
        return arcPath(d);
    };
};

// use function keyword because of 'this'
function arcTweetUpdate(d) {
    // interpolate between two objects
    let i = d3.interpolate(this._current, d);

    // update the current prop with new updated data
    this._current = d;

    return function(t) {
        return arcPath(i(t));
    };
}