/* eslint-disable no-undef */
export default function showName() {
    const label = document.createElement('label');
    const description = document.createTextNode('Show Name: ');
    const checkbox = document.createElement('input');

    checkbox.type = 'checkbox';
    // checkbox.name = dat["name"];
    // checkbox.value = dat["procID"];
    checkbox.setAttribute('id', 'showLabelBox');

    label.appendChild(description);
    label.appendChild(checkbox);

    document.getElementById('control').appendChild(label);
    $('#showLabelBox').attr('checked', false);
}
