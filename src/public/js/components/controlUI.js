function controlUI(){
    colorScaleLegend(0);
    showNameUI();
    colorByUI();
    setRangeUI();    
}

function showNameUI(){
    var label = document.createElement("label");
    var description = document.createTextNode('Show Name: ');
    var checkbox = document.createElement("input");
    
    checkbox.type = "checkbox";
    // checkbox.name = dat["name"];
    // checkbox.value = dat["procID"];
    checkbox.setAttribute('id', "showLabelBox");

    label.appendChild(description);
    label.appendChild(checkbox);

    document.getElementById('control').appendChild(label);
    $('#showLabelBox').attr('checked',false);
}

//create a dropdown to select color option
function colorByUI(){
    var dropDownData = {
	'0': 'Name',
	'1': 'Inclusive Runtime',
	'2': 'Exclusive Runtime',
	'3': 'Range/Avg',
	'4': 'Difference'
    }

    var label = $("<label>").text('Color By: ');

    var select = $('<select name="colorDropDown"  id = "colorDropDown" onchange = "colorDropDownChange()" />');
    for(var val in dropDownData) {
	$('<option />', {value: val, text: dropDownData[val]}).appendTo(select);
    }

    var dropDownDiv = document.createElement('div');
    dropDownDiv.setAttribute("id", "dropDown");
    $('#control').append(dropDownDiv);
    select.appendTo(label);
    $('#dropDown').append(label);

    // Metric Color Scale
    var metricLabel = $("<label>").text('Metric Color:');
    $('#control').append(metricLabel);

    var metricColorScaleDiv = document.createElement('div');
    metricColorScaleDiv.setAttribute("id", "metricColorScale");
    // $("#metricColorScale").css({left: 200});
    $('#control').append(metricColorScaleDiv);
}

function setRangeUI(){
    var rangeLabel = $("<label>").text('Set Range:');
    $('#control').append(rangeLabel);

    var rangeDiv = document.createElement('div');
    rangeDiv.setAttribute("id", "setRange");
    $('#control').append(rangeDiv);
    
    $('<p><label for="minVal"> Min Value:  <input type="text" id="minVal" size="12" name="minVal" value="" placeholder="Input Value" /></label></p>').appendTo(rangeDiv);
    $('<p><label for="maxVal"> Max Value: <input type="text" id="maxVal" size="12" name="maxVal" value="" placeholder="Input Value" /></label></p>').appendTo(rangeDiv);

    var tButton=$('<input/>').attr({
	type: "button",
	id: "setRangeBtr",
	value: 'Set Range'
    });
    tButton.appendTo(rangeDiv);
}

function colorScaleLegend(colorOption){
    var w = 200, h = 70;
    var colorScaleHeight = 30
    var nodeRunTimeColorScale;
    var spanColor;
    var innerHTMLText = [];
    if(colorOption != 4){
	nodeRunTimeColorScale = 'OrRd';
	spanColor = chroma.scale(nodeRunTimeColorScale).padding([0.2, 0]).domain([0,99]);
	innerHTMLText = ["low", "high"];
    }
    else{
	nodeRunTimeColorScale = 'RdYlBu';
	spanColor = chroma.scale(nodeRunTimeColorScale).domain([0,99]);
	innerHTMLText = ["-1", "1"];
    }

    var timeScaleDiv = document.getElementById('metricColorScale');
    $("#metricColorScale").width(200);
    $("#metricColorScale").height(h);
    $("#metricColorScale").empty();
    if(colorOption > 0){
	for(var i = 0 ; i < 100; i++){
	    // nodeRunData.push(i);
	    var newSpan = document.createElement('span');
	    newSpan.style.backgroundColor = spanColor(i);
	    newSpan.style.display = 'inline-block';
	    newSpan.style.height = colorScaleHeight + 'px';
	    newSpan.style.width = '1%';
	    timeScaleDiv.appendChild(newSpan);
	}

	var fastSpan = document.createElement('span');
	// fastSpan.setAttribute("id", "fastSpan");
	fastSpan.style.position = "relative";
	fastSpan.style.left = "0";
	fastSpan.style.fontSize = "15px";
	fastSpan.style.fontFamily = "sans-serif";
	fastSpan.style.top = "5px";
	fastSpan.innerHTML = innerHTMLText[0];
	fastSpan.setAttribute("id", "slowAttr");
	timeScaleDiv.appendChild(fastSpan);

	var slowSpan = document.createElement('span');
	slowSpan.style.position = "absolute";
	// slowSpan.style.left = "140";
	slowSpan.style.left = "190";
	slowSpan.style.fontSize = "15px";
	slowSpan.style.fontFamily = "sans-serif";
	// slowSpan.style.top = $("#metricColorScale").position().top + colorScaleHeight + 5;// + 5;
	slowSpan.style.top = $("#slowAttr").position().top;
	slowSpan.innerHTML = innerHTMLText[1];
	slowSpan.setAttribute("id", "fastAttr");

//	console.log($("#metricColorScale").position().top, colorScaleHeight, $("#slowAttr").position().top);
	timeScaleDiv.appendChild(slowSpan);	
    }
}
