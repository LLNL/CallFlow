//create a dropdown to select color option
export default function colorBy(){
    let dropDownData = {
	    '0': 'Name',
	    '1': 'Inclusive Runtime',
	    '2': 'Exclusive Runtime',
	    '3': 'Range/Avg',
	    '4': 'Difference'
    }

    let label = $("<label>").text('Color By: ');

    let select = $('<select name="colorDropDown"  id = "colorDropDown" onchange = "colorDropDownChange()" />');
    for(let val in dropDownData) {
	    $('<option />', {value: val, text: dropDownData[val]}).appendTo(select);
    }

    let dropDownDiv = document.createElement('div');
    dropDownDiv.setAttribute("id", "dropDown");
    $('#control').append(dropDownDiv);
    select.appendTo(label);
    $('#dropDown').append(label);

    // Metric Color Scale
    let metricLabel = $("<label>").text('Metric Color:');
    $('#control').append(metricLabel);

    let metricColorScaleDiv = document.createElement('div');
    metricColorScaleDiv.setAttribute("id", "metricColorScale");
    // $("#metricColorScale").css({left: 200});
    $('#control').append(metricColorScaleDiv);
}
