export default function nodeSize(){
    let rangeLabel = $("<label>").text('Set Node size');
    $('#control').append(rangeLabel);

    let rangeDiv = document.createElement('div');
    rangeDiv.setAttribute("id", "setRange");
    $('#control').append(rangeDiv);
    
    $('<p><label for="maxVal"> Max Value: <input type="text" id="nodeSize" size="12" name="maxVal" value="" placeholder="Input Value" /></label></p>').appendTo(rangeDiv);

    let tButton=$('<input/>').attr({
	    type: "button",
	    id: "setNodeSizeBtr",
	    value: 'set'
    });
    tButton.appendTo(rangeDiv);
}
