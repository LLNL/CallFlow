// https://github.com/micahstubbs/d3-adjacency-matrix-layout Version 1.0.0. Copyright 2016 contributors.

// https://bl.ocks.org/micahstubbs/7f360cc66abfa28b400b96bc75b8984e
import * as d3 from "d3"

export default function adjacencyMatrixLayout() {
    var directed = true;
    var size = [1, 1];
    var nodes = [];
    var edges = [];
    var adj = [];
    var useadj = false;
    var edgeWeight = function edgeWeight(d) {
        return 1;
    };
    var nodeID = function nodeID(d) {
        return d.id;
    };

    function matrix() {
        var width = size[0];
        var height = size[1];

        // const constructedMatrix = [];
        var matrix = [];
        var edgeHash = {}
        let nodeWidth = width / adj.length
        let nodeHeight = height / adj.length
        var xScale = d3.scaleLinear().domain([0, adj.length]).range([0, width]);
        var yScale = d3.scaleLinear().domain([0, adj.length]).range([0, height]);

        for (let i = 0; i < adj.length; i += 1) {
            for (let j = 0; j < adj[i].length; j += 1) {
                var grid = {
                    id: adj[i][j].peid + '-' + adj[i][j].kpid,
                    source: i,
                    target: j,
                    xid: j,
                    yid: adj[i][j].peid * 16 + adj[i][j].kpid,
                    x: xScale(i),
                    y: yScale(adj[i][j].peid * 16 + adj[i][j].kpid),
                    yAggr: yScale(j),
                    weight: adj[i][j].z,
                    weightAggr: adj[i][j].pe_z,
                    height: nodeHeight,
                    width: nodeWidth,
                    changePoint: adj[i][j].changePoint,
                    changeIdx: adj[i][j].changeIdx,
                    cluster: adj[i][j].cluster,
                    clusters: adj[i][j].clusters,
                    kpid: adj[i][j].kpid,
                    kpgid: adj[i][j].kpgid,
                    peid: adj[i][j].peid,
                    maxComm: adj[i][j].maxComm,
                    minComm: adj[i][j].minComm
                }
                matrix.push(grid);
            }
        }
        return matrix;
    }

    matrix.directed = function (x) {
        if (!arguments.length) return directed;
        directed = x;
        return matrix;
    };

    matrix.size = function (x) {
        if (!arguments.length) return size;
        size = x;
        return matrix;
    };

    matrix.nodes = function (x) {
        if (!arguments.length) return nodes;
        nodes = x;
        return matrix;
    };

    matrix.links = function (x) {
        if (!arguments.length) return edges;
        edges = x;
        return matrix;
    };

    matrix.adj = function (x) {
        if (!arguments.length) return adj;
        adj = x;
        return matrix;
    }

    matrix.useadj = function (x) {
        if (!arguments.length) return useadj;
        useadj = true;
        return matrix;
    }

    matrix.edgeWeight = function (x) {
        if (!arguments.length) return edgeWeight;
        if (typeof x === 'function') {
            edgeWeight = x;
        } else {
            edgeWeight = function edgeWeight() {
                return x;
            };
        }
        return matrix;
    };

    matrix.nodeID = function (x) {
        if (!arguments.length) return nodeID;
        if (typeof x === 'function') {
            nodeID = x;
        }
        return matrix;
    };

    matrix.xAxis = function (calledG) {
        var nameScale = d3.scalePoint().domain(nodes.map(nodeID)).range([0, size[0]]).padding(1);

        var xAxis = d3.axisTop().scale(nameScale).tickSize(4);

        calledG.append('g').attr('class', 'am-xAxis am-axis').call(xAxis).selectAll('text').style('text-anchor', 'end').attr('transform', 'translate(-10,-10) rotate(90)');
    };

    matrix.yAxis = function (calledG) {
        var nameScale = d3.scalePoint().domain(nodes.map(nodeID)).range([0, size[1]]).padding(1);

        var yAxis = d3.axisLeft().scale(nameScale).tickSize(4);

        calledG.append('g').attr('class', 'am-yAxis am-axis').call(yAxis);
    };

    return matrix;
}
