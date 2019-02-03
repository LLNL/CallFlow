import { splitCaller } from '../routes'
import { d3_box } from './boxPlot'

function functionListUI(){
    var listViewDiv = document.createElement('table');
    listViewDiv.setAttribute("id", "list_view"); 
    document.getElementById('fList_view').appendChild(listViewDiv);

    $("#list_view").width( $("#fList_view").width() );
    $("#list_view").height( $("#fList_view").height() - 50 );
    $("#list_view").css("overflow-y", "scroll");
    $('#list_view').css('max-height', '100')
//    document.getElementById("splitNodeByParentBtr").disabled = true;
}

function displayFunctions(listData){
    $('#list_view').empty();

    var button = $('<button/>', {
		text: 'Split Caller',
		id: "splitNodeBtr"
	});

    
    $("#list_view").append(button);
    document.getElementById("splitNodeBtr").disabled = true;
    var button2 = $('<button/>',{
		text: 'Split Callee',
		id: "splitNodeByParentBtr"
	});
    $("#list_view").append(button2);

    let br = document.createElement('br')
    document.getElementById('list_view').appendChild(document.createElement('br'));
    document.getElementById('list_view').appendChild(document.createElement('br'));
    
    let entry_funcs = listData['entry_funcs']
    let other_funcs = listData['other_funcs']
    
    entry_funcs.sort(function(a,b){
        return b["value_inc"] - a["value_inc"];
    })

    let divHead = document.createElement('label');
    divHead.appendChild(document.createTextNode("Callees: "))
    document.getElementById('list_view').appendChild(divHead)

    let text = document.createTextNode(' ' + entry_funcs.length + ' in count')
    divHead.appendChild(text)

    entry_funcs.forEach(function(dat){
        boxPlotContainerUI(dat, 'inc')
    });
    document.getElementById('list_view').appendChild(document.createElement('br'));
    document.getElementById('list_view').appendChild(document.createElement('br'));


    // ############################################################################################################
    // For other_funcs
    other_funcs.sort(function(a,b){
        return avg(b["value_inc"]) - avg(a["value_inc"]);
    })

    console.log(other_funcs)
    
    let otherHead = document.createElement('label');
    otherHead.appendChild(document.createTextNode("Callers: "))
    document.getElementById('list_view').appendChild(otherHead)

    let othertext = document.createTextNode(' '+ other_funcs.length + ' in count')
    otherHead.appendChild(othertext)
                                                         
    let other_funcs_count = 0
    other_funcs.forEach(function(dat){
        boxPlotContainerUI(dat, 'inc')
    });

    document.getElementById("splitNodeBtr").disabled = false;
    $('#splitNodeBtr').click( () => {
        let idList = $('input:checkbox:checked.list_checkbox').map(function () {
            return this.df_index
        }).get();
        splitCaller(idList).then((data) => {
            self.state = data
            //                this.render()
        })

    })
}

function boxPlotContainerUI(dat, type){
    let funcName = dat["name"]
    let funcProps = ": [ Exc:" + ((avg(dat["value_exc"]) * 0.001)/60).toFixed(3)  + "s, " + "Inc:" + ((avg(dat["value_inc"]) * 0.001)/60.0).toFixed(3) + "s]"
    let callStackDepth = dat['component_path'].length - 1
    let funcComponent = "Call stack depth:" + callStackDepth;

    let div = document.createElement('div')
	let label = document.createElement("div");
    let funcPropsDiv = document.createTextNode(funcProps);
	let funcNameDiv = document.createTextNode(funcName);
    let funcComponentDiv = document.createTextNode(funcComponent);
	let checkbox = document.createElement("input");
    let br = document.createElement('br')
    
	checkbox.type = "checkbox";
	checkbox.name = funcName;
    checkbox.df_index = dat['df_index']
    checkbox.node_name = dat['name']                           
	checkbox.setAttribute('class', "list_checkbox");

	label.appendChild(checkbox);
    label.appendChild(funcNameDiv);
    label.appendChild(document.createElement('br'))
    label.appendChild(funcPropsDiv);
    label.appendChild(funcComponentDiv);
    
    div.appendChild(label)
    $('#list_view').append(div);
    boxPlotUI(div, dat, type)
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
    
    var margin = {top: 0, right: 10, bottom: 0, left: 5};
    var width = $('#list_view').width() - 30;
    var height = 50;
    let labels = true;


    let textOffset = 25
    var chart = d3_box()
        .height(height - textOffset)
        .whiskers(iqr(1.5))
        .domain([q[4], q[5]])
        .showLabels(labels);

    let offset =  margin.right;
    
    let svg = d3.select('#list_view').append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "box")
        .attr("x", $('#fList_view').width())
        .attr("transform", "translate(" + offset + "," + margin.top + ")")

    let x = d3.scale.ordinal()
        .domain(val)
        .rangeRoundBands([0, width - 200]);
    
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
