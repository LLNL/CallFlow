/* eslint-disable no-param-reassign */
/* eslint-disable prefer-const */
/* eslint-disable camelcase */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import { layout } from '../../app';

function icicleLayoutDirection(view) {
    const label = document.createElement('label');
    const description = document.createTextNode('Horizontal icicle plot: ');
    const checkbox = document.createElement('input');

    checkbox.type = 'checkbox';
    // checkbox.name = dat["name"];
    // checkbox.value = dat["procID"];
    checkbox.setAttribute('id', 'horizontal_icicle');

    label.appendChild(description);
    label.appendChild(checkbox);

    document.getElementById('component_graph_view').appendChild(label);
    $('#horizontal_icicle').attr('checked', false);

    $('#horizontal_icicle').change(() => {
        console.log($('#horizontal_icicle').val());
        let attr = 'LR';
        layout.app.update('onIcicleDirectionChange', attr);
    });
}

function icicleColorBy(view) {
    const dropDownData = {
	    0: 'Inclusive Runtime',
	    1: 'Exclusive Runtime',
	    2: 'Load Imbalance',
    };

    const label = $('<label>').text('Color By: ');

    const select = $('<select name="colorDropDown" id="icicle_color_dropdown"/>');
    for (const val in dropDownData) {
	    $('<option />', { value: val, text: dropDownData[val] }).appendTo(select);
    }

    select.change(() => {
	    let attr_id = $('#icicle_color_dropdown :selected').val();
	    view.colorOption = attr_id;
        layout.app.update('onIcicleColorChange', attr_id);
    });

    const dropDownDiv = document.createElement('div');
    dropDownDiv.setAttribute('id', 'icicle_dropdown');
    $('#component_graph_view').append(dropDownDiv);
    select.appendTo(label);
    $('#icicle_dropdown').append(label);
    $('#icicle_dropdown').append(select);

    $('#component_graph_view').append(dropDownDiv);
}


export default function icicleControl(view) {
    icicleLayoutDirection(view);
    icicleColorBy(view);
}
