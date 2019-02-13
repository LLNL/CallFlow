/* eslint-disable no-restricted-syntax */
/* eslint-disable import/extensions */
/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
/* eslint-disable no-param-reassign */
/* eslint-disable guard-for-in */
/* eslint-disable no-undef */
import { layout } from '../../app.js';

// create a dropdown to select color option
export default function colorBy(graph, view) {
    const dropDownData = {
	    0: 'Name',
	    1: 'Inclusive Runtime',
	    2: 'Exclusive Runtime',
	    3: 'Range/Avg',
	    4: 'Difference',
    };

    const label = $('<label>').text('Color By: ');

    const select = $('<select name="colorDropDown" id="colorDropDown"/>');
    for (const val in dropDownData) {
	    $('<option />', { value: val, text: dropDownData[val] }).appendTo(select);
    }

    select.change(() => {
	    const attr_id = $('#colorDropDown :selected').val();
	    view.colorOption = attr_id;
        layout.app.update('onColorChange', attr_id);
    });

    const dropDownDiv = document.createElement('div');
    dropDownDiv.setAttribute('id', 'dropDown');
    $('#control').append(dropDownDiv);
    select.appendTo(label);
    $('#dropDown').append(label);

    // Metric Color Scale
    const metricLabel = $('<label>').text('Metric Color:');
    $('#control').append(metricLabel);

    const metricColorScaleDiv = document.createElement('div');
    metricColorScaleDiv.setAttribute('id', 'metricColorScale');
    // $("#metricColorScale").css({left: 200});
    $('#control').append(metricColorScaleDiv);
}
