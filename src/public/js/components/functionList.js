import { splitCaller } from '../routes'
import { d3_box } from './boxPlot'

function functionListUI(){
    var listViewDiv = document.createElement('div');
    listViewDiv.setAttribute("id", "list_view"); 
    document.getElementById('fList_view').appendChild(listViewDiv);

    $("#list_view").width( $("#fList_view").width() );
    $("#list_view").height( $("#fList_view").height() - 50 );
    $("#list_view").css("overflow", "auto");

    var button = $('<button/>',
		           {
		               text: 'Split Caller',
		               id: "splitNodeBtr"
		           });

    
    $("#fList_view").append(button);
    document.getElementById("splitNodeBtr").disabled = true;

    var button2 = $('<button/>',
		            {
			            text: 'Split Callee',
			            id: "splitNodeByParentBtr"
		            });
    $("#fList_view").append(button2);
    document.getElementById("splitNodeByParentBtr").disabled = true;
}

function displayFunctions(listData){
    $('#list_view').empty();

    let entry_funcs = listData['entry_funcs']
    let other_funcs = listData['other_funcs']
    
    entry_funcs.sort(function(a,b){
        return b["value_exc"] - a["value_exc"];
    })

    document.getElementById('list_view').appendChild(document.createTextNode("Entry functions: "))
    document.getElementById('list_view').appendChild(document.createElement("br"));  
    entry_funcs.forEach(function(dat){    
        var funcName = dat["name"].trunc(20)
        //        var funcName = dat["name"].trunc(20) + ": [ Exc:" + (dat["value_exc"] * 0.000001).toFixed(3)  + "s, " + "Inc:" + (dat["value_inc"] * 0.000001).toFixed(3) + "s]";
        var div = document.createElement('div')
	    var label = document.createElement("label");
	    var description = document.createTextNode(funcName);
	    var checkbox = document.createElement("input");
        
	    checkbox.type = "checkbox";
	    checkbox.name = funcName;
	    checkbox.value = dat;
	    checkbox.setAttribute('class', "list_checkbox");

	    label.appendChild(checkbox);
	    label.appendChild(description);

        div.appendChild(label)
        boxPlotUI(dat, 'inc')

        document.getElementById('list_view').appendChild(div);
	    document.getElementById('list_view').appendChild(document.createElement("br"));

    });

    document.getElementById('list_view').appendChild(document.createElement('br'));

    // For other_funcs
    other_funcs.sort(function(a,b){
        return b["value_exc"] - a["value_exc"];
    })

    document.getElementById('list_view').appendChild(document.createTextNode("Other functions: "))
    document.getElementById('list_view').appendChild(document.createElement("br"));  
    other_funcs.forEach(function(dat){
        var funcName = dat["name"].trunc(20)
        //      var funcName = dat["name"].trunc(20) + ": [ Exc:" + (dat["value_exc"] * 0.000001).toFixed(3)  + "s, " + "Inc:" + (dat["value_inc"] * 0.000001).toFixed(3) + "]";

        var div = document.createElement('div')
	    var label = document.createElement("label");
	    var description = document.createTextNode(funcName);
	    var checkbox = document.createElement("input");        

	    checkbox.type = "checkbox";	    
	    checkbox.name = funcName;
	    checkbox.value = dat;
	    checkbox.setAttribute('class', "list_checkbox");

	    label.appendChild(checkbox);
	    label.appendChild(description);

        div.appendChild(label)
        boxPlotUI(dat, 'inc')

	    document.getElementById('list_view').appendChild(div);
	    document.getElementById('list_view').appendChild(document.createElement("br"));  

    });
    
    document.getElementById("splitNodeBtr").disabled = false;


    
    $('#splitNodeBtr').click( () => {
        var idList = $('input:checkbox:checked.list_checkbox').map(function () {
            console.log(this)
            console.log(this.value['name'], this.value['df_index'])
            return this.value
        }).get();
        splitCaller(idList).then((data) => {
            self.state = data
            //                this.render()
        })

    })
}

function median(arr){
    if(arr.length == 0) return 0

    let mid = Math.floor(arr.length/2)

    if(mid % 2){
        return [mid]
    }
    else{
        return [mid - 1, mid]
    }
}

function quartiles(arr){
    arr.sort(function(a,b) {
        return a - b;
    })

    let med_pos = median(arr)
    let med = 0
    if(med_pos.length == 2){
        med = ( arr[med_pos[0]] + arr[med_pos[1]] )/2
    }    
    else{
        med = arr[med_pos[0]]
    }

    let min = arr[0]
    let max = arr[arr.length - 1]    

    let q1 = (min + med)/2;
    let q2 = med
    let q3 = (max + med)/2
    let q4 = max

    var v1 = Math.floor(q1),
        v2 = Math.floor(q2),
        v3 = Math.floor(q3),
        v4 = Math.floor(q4);

    var rowMax = Math.max(v1, Math.max(v2, Math.max(v3,v4)));
    var rowMin = Math.min(v1, Math.min(v2, Math.min(v3,v4)));

    if (rowMax > max) max = rowMax;
    if (rowMin < min) min = rowMin;
    
    return [v1, v2, v3, v4, min, max]
}

function iqr(k) {
    return function(d, i) {
        var q1 = d.quartiles[0],
            q3 = d.quartiles[2],
            iqr = (q3 - q1) * k,
            i = -1,
            j = d.length;
        while (d[++i] < q1 - iqr);
        while (d[--j] > q3 + iqr);
        return [i, j];
    };
}

function boxPlotUI(data, type){
    let inc_arr = data['value_inc']
    let exc_arr = data['value_exc']    

    let q = [];
    let val = [];
    if(type == 'inc'){
        val = data['value_inc']
        q = quartiles(inc_arr)
    }
    else{
        val = data['value_exc']
        q = quartiles(exc_arr)
    }

    var margin = {top: -20, right: 200, bottom: 0, left: 0};
    var width = 200;
    var height = 50;
    let labels = false;
    
    var chart = d3_box()
        .whiskers(iqr(1.5))
        .height(100)
        .domain([q[4], q[5]])
        .showLabels(labels);

    var offset = $('#list_view').width() - margin.right;
    
    var svg = d3.select("#list_view").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "box")
        .attr("transform", "translate(" + offset + "," + margin.top + ")")
        .append("g")

    var x = d3.scale.ordinal()
        .domain(val)
        .rangeRoundBands([0 , width], 0.7, 0.3); 

    svg.selectAll(".box")
        .data([val])
        .enter().append("g")
        .attr("transform", function(d) { return "translate(" + 0  + "," + x(d[0]) + ")"; } )
        .call(chart.width(x.rangeBand())); 

    return svg
}

export {
    functionListUI,
    displayFunctions
}
