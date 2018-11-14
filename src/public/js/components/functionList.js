function functionListUI(){
    var listViewDiv = document.createElement('div');
    listViewDiv.setAttribute("id", "list_view"); 
    document.getElementById('fList_view').appendChild(listViewDiv);

    $("#list_view").width( $("#fList_view").width() );
    $("#list_view").height( $("#fList_view").height() - 50 );
    $("#list_view").css("overflow", "auto");

    var button = $('<button/>',
		           {
		               text: 'Split Node',
		               click: splitCaller,
		               id: "splitNodeBtr"
		           });
    $("#fList_view").append(button);
    document.getElementById("splitNodeBtr").disabled = true;

    var button2 = $('<button/>',
		            {
			            text: 'Split By Parents',
			            click: splitCallee,
			            id: "splitNodeByParentBtr"
		            });
    $("#fList_view").append(button2);
    document.getElementById("splitNodeByParentBtr").disabled = true;
}

function displayFunctions(listData){
    $('#list_view').empty();

    let entry_funcs = listData['entry_funcs']
    let other_funcs = listData['other_funcs']
    
    // listData.sort(function(a,b){
    //     return b["value"] - a["value"];
    // })

    document.getElementById('list_view').appendChild(document.createTextNode("Entry functions: "))
    document.getElementById('list_view').appendChild(document.createElement("br"));  
    entry_funcs.forEach(function(dat){
        var funcName = dat.trunc(20);// + ": [" + (dat["value"] * 0.000001).toFixed(3)  + "s, " + (dat["value"] /rootRunTime * 100).toFixed(3) + "%]" ;
//	    var funcName = dat["name"].trunc(20) + ": [" + (dat["value"] * 0.000001).toFixed(3)  + "s, " + (dat["value"] /rootRunTime * 100).toFixed(3) + "%]" ;
	    var label = document.createElement("label");
	    var description = document.createTextNode(funcName);
	    var checkbox = document.createElement("input");
        
	    checkbox.type = "checkbox";
	    checkbox.name = funcName;
	    checkbox.value = dat;
	    checkbox.setAttribute('class', "list_checkbox");

	    label.appendChild(checkbox);
	    label.appendChild(description);

	    document.getElementById('list_view').appendChild(label);
	    document.getElementById('list_view').appendChild(document.createElement("br"));  
    });

    document.getElementById('list_view').appendChild(document.createElement('br'));

    document.getElementById('list_view').appendChild(document.createTextNode("Other functions: "))
    document.getElementById('list_view').appendChild(document.createElement("br"));  
    other_funcs.forEach(function(dat){
        var funcName = dat.trunc(20);// + ": [" + (dat["value"] * 0.000001).toFixed(3)  + "s, " + (dat["value"] /rootRunTime * 100).toFixed(3) + "%]" ;
//	    var funcName = dat["name"].trunc(20) + ": [" + (dat["value"] * 0.000001).toFixed(3)  + "s, " + (dat["value"] /rootRunTime * 100).toFixed(3) + "%]" ;
	    var label = document.createElement("label");
	    var description = document.createTextNode(funcName);
	    var checkbox = document.createElement("input");        

	    checkbox.type = "checkbox";	    
	    checkbox.name = funcName;
	    checkbox.value = dat;
	    checkbox.setAttribute('class', "list_checkbox");

	    label.appendChild(checkbox);
	    label.appendChild(description);

	    document.getElementById('list_view').appendChild(label);
	    document.getElementById('list_view').appendChild(document.createElement("br"));  
    });

    

    document.getElementById("splitNodeBtr").disabled = false;

}

function splitCaller(){

}

function splitCallee(){

}


export {
    functionListUI,
    displayFunctions
}
