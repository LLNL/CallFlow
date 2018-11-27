import { splitCaller } from '../routes'
import { d3_box } from './boxPlot'

function functionListUI(){
    var listViewDiv = document.createElement('table');
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

    var button2 = $('<button/>',{
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

    let divHead = document.createElement('label');
    divHead.appendChild(document.createTextNode("Entry functions: "))
    document.getElementById('list_view').appendChild(divHead)
    entry_funcs.forEach(function(dat){    
        var funcName = dat["name"].trunc(20) + ": [ Exc:" + (avg(dat["value_exc"]) * 0.000001).toFixed(3)  + "s, " + "Inc:" + (avg(dat["value_inc"]) * 0.000001).toFixed(3) + "s]";

        let div = document.createElement('div')
	    let label = document.createElement("div");
	    let description = document.createTextNode(funcName);
	    let checkbox = document.createElement("input");
        
	    checkbox.type = "checkbox";
	    checkbox.name = funcName;
	    checkbox.value = dat;
	    checkbox.setAttribute('class', "list_checkbox");

	    label.appendChild(checkbox);
	    label.appendChild(description);

        div.appendChild(label)
        $('#list_view').append(div);
        $('list_view').append(document.createElement("br"));
        boxPlotUI(div, dat, 'inc')

    });
    document.getElementById('list_view').appendChild(document.createElement('br'));
    document.getElementById('list_view').appendChild(document.createElement('br'));


    // ############################################################################################################
    // For other_funcs
    other_funcs.sort(function(a,b){
        return b["value_exc"] - a["value_exc"];
    })

    let otherHead = document.createElement('label');
    otherHead.appendChild(document.createTextNode("Inside functions: "))
    document.getElementById('list_view').appendChild(otherHead)

    let other_funcs_count = 0
    other_funcs.forEach(function(dat){
        var funcName = dat["name"].trunc(20) + ": [ Exc:" + (avg(dat["value_exc"]) * 0.000001).toFixed(3)  + "s, " + "Inc:" + (avg(dat["value_inc"]) * 0.000001).toFixed(3) + "s]";
        let div = document.createElement('div')
	    let label = document.createElement("div");
	    let description = document.createTextNode(funcName);
	    let checkbox = document.createElement("input");        

	    checkbox.type = "checkbox";	    
	    checkbox.name = funcName;
	    checkbox.value = dat;
	    checkbox.setAttribute('class', "list_checkbox");

	    label.appendChild(checkbox);
	    label.appendChild(description);
        
        div.appendChild(label)
	    document.getElementById('list_view').appendChild(div);
        document.getElementById('list_view').appendChild(document.createElement("br"));
        
        boxPlotUI(div, dat, 'inc')

        other_funcs_count += 1
    });

    document.getElementById('list_view').append('<text>' + other_funcs_count + '</text>');
    document.getElementById("splitNodeBtr").disabled = false;
    $('#splitNodeBtr').click( () => {
        var idList = $('input:checkbox:checked.list_checkbox').map(function () {
            console.log(this.value['name'], this.value['df_index'])
            return this.value
        }).get();
        splitCaller(idList).then((data) => {
            self.state = data
            //                this.render()
        })

    })
}

function avg(arr){
    let sum = 0;
    for(let i = 0; i < arr.length; i++){
        sum += arr[i]        
    }
    return sum/arr.length
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

function boxPlotUI(div, data, type){
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

    console.log("Value", val)
    console.log("quartiles", q)
    
    var margin = {top: 0, right: 10, bottom: 0, left: 0};
    var width = $('#list_view').width();
    var height = 20;
    let labels = true;
    
    var chart = d3_box()
        .height(height)
        .whiskers(iqr(1.5))
        .domain([q[4], q[5]])
        .showLabels(labels);

    let offset =  margin.right;
    
    let svg = d3.select('#list_view').append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "box")
        .attr("transform", "translate(" + offset + "," + margin.top + ")")

    let x = d3.scale.ordinal()
        .domain(val)
        .rangeRoundBands([0, width]);
    
    svg.selectAll(".box")
        .data([val])
        .enter().append("g")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", function(d) { return "translate(" + 0  + "," + x(d[0]) + ")"; } )
        .call(chart.width(width)); 

    return svg
}

export {
    functionListUI,
    displayFunctions
}
