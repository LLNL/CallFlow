/* eslint-disable no-param-reassign */
/* eslint-disable prefer-const */
/* eslint-disable camelcase */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
function icicleLayoutDirection(view) {
    const label = document.createElement('label');
    const description = document.createTextNode('Horizontal icicle plot: ');
    const checkbox = document.createElement('input');

    checkbox.type = 'checkbox';
    // checkbox.name = dat["name"];
    // checkbox.value = dat["procID"];
    checkbox.setAttribute('id', 'showLabelBox');

    label.appendChild(description);
    label.appendChild(checkbox);

    document.getElementById('component_graph_view').appendChild(label);
    $('#showLabelBox').attr('checked', false);
}

function icicleColorBy(view) {
    const dropDownData = {
	    0: 'Inclusive Runtime',
	    1: 'Exclusive Runtime',
	    2: 'Load Imbalance',
    };

    const label = $('<label>').text('Color By: ');

    const select = $('<select name="colorDropDown" id="icicleColorDropDown"/>');
    for (const val in dropDownData) {
	    $('<option />', { value: val, text: dropDownData[val] }).appendTo(select);
    }

    select.change(() => {
	    let attr_id = $('#icicleColorDropDown :selected').val();
	    view.colorOption = attr_id;
        layout.app.update('onIcicleColorChange', attr_id);
    });

    const dropDownDiv = document.createElement('div');
    dropDownDiv.setAttribute('id', 'icicleDropDown');
    $('#component_graph_view').append(dropDownDiv);
    select.appendTo(label);
    $('#icicleDropDown').append(label);
    $('#icicleDropDown').append(select);

    // Metric Color Scale
    const metricLabel = $('<label>').text('Color:');
    $('#component_graph_view').append(dropDownDiv);

    const metricColorScaleDiv = document.createElement('div');
    metricColorScaleDiv.setAttribute('id', 'metricColorScale');
    // $("#metricColorScale").css({left: 200});
    $('#component_graph_view').append(metricColorScaleDiv);
}


export default function icicleControl(view) {
    icicleLayoutDirection(view);
    icicleColorBy(view);
}
