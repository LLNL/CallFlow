var DFS = function(graph, source, directed, logOff) {

    var processVertexEarly = function (v, logOff) {
        if (!logOff) console.log('Early processed vertex:', v);
    };

    var processVertexEarly = function (v, logOff) {
        if (!logOff) console.log('Late processed vertex:', v);
    };

    var processEdge = function (u, v, logOff) {
        if (!logOff) console.log('Processed edge:', '(' + u + ', ' + v + ')');
    };

    var finished = false;
    var time = 0;
    var discovered = [];
    var processed = [];
    var entry_time = [];
    var exit_time = [];
    var parent = [];
    var adjList = new Map()
    
    if (!logOff) console.log();
    if (!logOff) console.log('*****************************');
    if (!logOff) console.log('DFS starting at', source, 'for adjacency list:');
    if (!logOff) console.log(graph);

    (function createAdjList() {
        console.log(graph.links)
        for(let i = 0; i < graph.links.length; i += 1){
            // get the list for vertex v and put the 
            // vertex w denoting edge between v and w
            let link = graph.links[i]
            let v = link['source']
            let w = link['target']
            adjList.get(v).push(w); 
          
            // Since graph is undirected, 
            // add an edge from w to v also 
            adjList.get(w).push(v); 
        } 
    })

    (function recDoDFS(u) {
        if (finished) return;
        discovered[u] = true;
        if (!logOff) console.log('DISCOVERED', u);
        time = ++time;
        entry_time[u] = time;

        processVertexEarly(u);

        var adjList = graph[u];
        for (var i = 0; i < adjList.length; i++) {
            v = adjList[i];
            if (!discovered[v]) {
                parent[v] = u;
                recDoDFS(v);
            } else if (!processed[v] || directed) {
                processEdge(u, v);

                if (finished) return;
            }
        }
        processVertexLate(u);

        time = ++time;
        exit_time[u] = time;

        processed[u] = true;
    })(source);

    if (!logOff) console.log();
    if (!logOff) console.log('%%%%%%%%%%%%%%% DFS Info %%%%%%%%%%%%%%%');
    for (var i = 0; i < graph.length; i++) {
        if (!logOff) console.log();
        if (!logOff) console.log('NODE', i);
        if (!logOff) console.log('discovered:', discovered[i]);
        if (!logOff) console.log('processed:', processed[i]);
        if (!logOff) console.log('parent:', parent[i]);
        if (!logOff) console.log('entry time:', entry_time[i]);
        if (!logOff) console.log('exit time:', exit_time[i]);
        if (!logOff) console.log();
    }
    if (!logOff) console.log('############ DFS OVER ############');
    if (!logOff) console.log();
};

export default DFS;
// doDFS(adjList, 0, false, PVE, PVL, PE);