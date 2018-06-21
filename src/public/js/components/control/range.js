export default function range(){
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
