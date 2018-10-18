import { getSankey } from '../../routes'
import { layout } from '../../app.js'


export default function groupBy(view){
    let dropDownData = {
	    '0': 'module',
	    '1': 'file'
    }

    let label = $("<label>").text('Group By: ');

    let select = $('<select name="groupBy"  id = "groupByDropDown" />');
    for(let val in dropDownData) {
	    $('<option />', {value: val, text: dropDownData[val]}).appendTo(select);
    }

    select.change(function(){
	    let attr_id = $("#groupByDropDown :selected").val();
	    layout.app.update('onGroupChange', dropDownData[attr_id])
    })

    let dropDownDiv = document.createElement('div');
    dropDownDiv.setAttribute("id", "dropDown");
    $('#control').append(dropDownDiv);
    select.appendTo(label);
    $('#dropDown').append(label);
}

function groupBy_cb(data){
    clear()
    data = JSON.parse(data)
    if(self.debug){
	    console.log('[Vis] Sankey information :', data)
    }
    layout.app.update()
}

