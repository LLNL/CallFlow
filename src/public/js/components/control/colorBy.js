import { layout } from './../../app.js'
import CallFlow from '../callflow_wrapper.js'

//create a dropdown to select color option
export default function colorBy(graph, view){
    let dropDownData = {
	    '0': 'Name',
	    '1': 'Inclusive Runtime',
	    '2': 'Exclusive Runtime',
	    '3': 'Range/Avg',
	    '4': 'Difference'
    }

    let label = $("<label>").text('Color By: ');

    let select = $('<select name="colorDropDown"  id = "colorDropDown"/>');
    for(let val in dropDownData) {
	    $('<option />', {value: val, text: dropDownData[val]}).appendTo(select);
    }

    select.change(function(){
	let attr_id = $("#colorDropDown :selected").val();
	$('#procedure_view').empty()
	view.colorOption = attr_id;
	clear()
	render(graph)
    })
    
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
