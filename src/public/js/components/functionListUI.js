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
		       click: splitNode2,
		       id: "splitNodeBtr"
		   });
    $("#fList_view").append(button);
    document.getElementById("splitNodeBtr").disabled = true;

    var button2 = $('<button/>',
		    {
			text: 'Split By Parents',
			click: splitNodeByParents,
			id: "splitNodeByParentBtr"
		    });
    $("#fList_view").append(button2);
    document.getElementById("splitNodeByParentBtr").disabled = true;
}

function displayList(listData){
    $('#list_view').empty();
    listData.sort(function(a,b){
        return b["value"] - a["value"];
    })
    listData.forEach(function(dat){
        // console.log(dat);
	// create the necessary elements
	var funcName = dat["name"].trunc(20) + ": [" + (dat["value"] * 0.000001).toFixed(3)  + "s, " + (dat["value"] /rootRunTime * 100).toFixed(3) + "%]" ;
	var label = document.createElement("label");
	var description = document.createTextNode(funcName);
	var checkbox = document.createElement("input");

	checkbox.type = "checkbox";
	
	checkbox.name = funcName;
	checkbox.value = dat["procID"];
	checkbox.setAttribute('class', "list_checkbox");

	label.appendChild(checkbox);
	label.appendChild(description);

	document.getElementById('list_view').appendChild(label);
	document.getElementById('list_view').appendChild(document.createElement("br"));  
    });

    document.getElementById("splitNodeBtr").disabled = false;

}
